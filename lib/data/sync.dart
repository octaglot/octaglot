import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../game/store.dart';
import 'user_db.dart';

const supabaseUrl = 'https://tisqxsdeivmttezrsnpq.supabase.co';
const supabaseKey = 'sb_publishable_C8QZYUMrJoMoeUW-lA8nSw_Gu4Df-gy';
const authRedirect = 'com.octaglot.app://login-callback';

enum SyncPhase { signedOut, idle, syncing, error }

class SyncState {
  const SyncState({required this.phase, this.email, this.lastSync, this.message});
  final SyncPhase phase;
  final String? email;
  final DateTime? lastSync;
  final String? message;

  bool get signedIn => phase != SyncPhase.signedOut;
}

final syncProvider = NotifierProvider<SyncNotifier, SyncState>(SyncNotifier.new);

class SyncNotifier extends Notifier<SyncState> {
  StreamSubscription<AuthState>? _auth;
  Timer? _debounce;
  bool _pulling = false;

  SupabaseClient get _sb => Supabase.instance.client;
  UserDb get _db => ref.read(userDbProvider);

  @override
  SyncState build() {
    _auth = _sb.auth.onAuthStateChange.listen((e) {
      if (e.event == AuthChangeEvent.signedIn) _pullAndMerge();
      if (e.event == AuthChangeEvent.signedOut) state = const SyncState(phase: SyncPhase.signedOut);
    });
    ref.listen(gameProvider, (_, _) => _schedulePush());
    ref.onDispose(() {
      _auth?.cancel();
      _debounce?.cancel();
    });
    final user = _sb.auth.currentUser;
    if (user != null) Future.microtask(_pullAndMerge);
    return user == null ? const SyncState(phase: SyncPhase.signedOut) : SyncState(phase: SyncPhase.idle, email: user.email);
  }

  bool get appleAvailable => Platform.isIOS || Platform.isMacOS;

  Future<String?> signInWithApple() async {
    try {
      final raw = _nonce();
      final cred = await SignInWithApple.getAppleIDCredential(
        scopes: [AppleIDAuthorizationScopes.email],
        nonce: sha256.convert(utf8.encode(raw)).toString(),
      );
      final token = cred.identityToken;
      if (token == null) return 'Apple kimliği alınamadı.';
      await _sb.auth.signInWithIdToken(provider: OAuthProvider.apple, idToken: token, nonce: raw);
      return null;
    } on SignInWithAppleAuthorizationException catch (e) {
      return e.code == AuthorizationErrorCode.canceled ? '' : 'Apple ile giriş başarısız: ${e.message}';
    } catch (e) {
      return 'Giriş başarısız. İnternet bağlantını kontrol et.';
    }
  }

  Future<String?> sendEmailLink(String email) async {
    try {
      await _sb.auth.signInWithOtp(email: email.trim(), emailRedirectTo: authRedirect);
      return null;
    } on AuthException catch (e) {
      return e.statusCode == '429' ? 'Çok sık denendi, biraz sonra tekrar dene.' : e.message;
    } catch (_) {
      return 'Bağlantı gönderilemedi. İnternet bağlantını kontrol et.';
    }
  }

  Future<void> signOut() async {
    await pushNow();
    await _sb.auth.signOut();
  }

  Future<String?> deleteAccount() async {
    try {
      await _sb.rpc('delete_my_account');
      await _sb.auth.signOut();
      return null;
    } catch (_) {
      return 'Hesap silinemedi. İnternet bağlantını kontrol et.';
    }
  }

  void _schedulePush() {
    if (_sb.auth.currentUser == null || _pulling) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 4), pushNow);
  }

  Future<void> pushNow() async {
    final user = _sb.auth.currentUser;
    if (user == null) return;
    try {
      state = SyncState(phase: SyncPhase.syncing, email: user.email, lastSync: state.lastSync);
      final data = await _db.exportState();
      await _sb.from('user_state').upsert({'user_id': user.id, 'data': data, 'updated_at': DateTime.now().toUtc().toIso8601String()});
      state = SyncState(phase: SyncPhase.idle, email: user.email, lastSync: DateTime.now());
    } catch (_) {
      state = SyncState(
        phase: SyncPhase.error,
        email: user.email,
        lastSync: state.lastSync,
        message: 'Eşitlenemedi, internet gelince yeniden denenecek.',
      );
    }
  }

  Future<void> syncNow() => _pullAndMerge();

  Future<void> _pullAndMerge() async {
    final user = _sb.auth.currentUser;
    if (user == null || _pulling) return;
    _pulling = true;
    try {
      state = SyncState(phase: SyncPhase.syncing, email: user.email, lastSync: state.lastSync);
      final row = await _sb.from('user_state').select('data').eq('user_id', user.id).maybeSingle();
      if (row != null) {
        await _db.mergeState((row['data'] as Map).cast<String, dynamic>());
        await ref.read(gameProvider.notifier).reload();
      }
    } catch (_) {
      state = SyncState(
        phase: SyncPhase.error,
        email: user.email,
        lastSync: state.lastSync,
        message: 'Eşitlenemedi, internet gelince yeniden denenecek.',
      );
      _pulling = false;
      return;
    }
    _pulling = false;
    await pushNow();
  }

  String _nonce([int length = 32]) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final r = Random.secure();
    return List.generate(length, (_) => chars[r.nextInt(chars.length)]).join();
  }
}
