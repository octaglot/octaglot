import 'dart:convert';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';

import '../game/grading.dart';

class Speech {
  final AudioPlayer _player = AudioPlayer();
  final FlutterTts _tts = FlutterTts();
  Map<String, String> _index = {};
  late Directory _cache;
  bool _ttsReady = false;
  double rate = 1.0;
  String? _last;
  DateTime _lastAt = DateTime(0);

  Future<void> init() async {
    try {
      final raw = await rootBundle.loadString('assets/audio/index.json');
      _index = (jsonDecode(raw) as Map<String, dynamic>).cast<String, String>();
    } catch (_) {
      _index = {};
    }
    _cache = Directory('${(await getApplicationSupportDirectory()).path}/tts');
    await _cache.create(recursive: true);
    await _player.setReleaseMode(ReleaseMode.stop);
    await _player.setAudioContext(AudioContextConfig(focus: AudioContextConfigFocus.mixWithOthers).build());
    try {
      final langs = await _tts.isLanguageAvailable('en-GB');
      if (langs == true) {
        await _tts.setLanguage('en-GB');
        _ttsReady = true;
      }
    } catch (_) {}
  }

  bool hasBundled(String en) => _index.containsKey(en);

  Future<bool> say(String en) async {
    final now = DateTime.now();
    if (en == _last && now.difference(_lastAt).inMilliseconds < 450) return true;
    _last = en;
    _lastAt = now;
    try {
      await _player.stop();
      final id = _index[en];
      if (id != null) {
        try {
          await _player.setPlaybackRate(rate);
          await _player.play(AssetSource('audio/$id.mp3'));
          return true;
        } catch (_) {}
      }
      final file = await _online(spokenEnglish(en));
      if (file != null) {
        await _player.setPlaybackRate(rate);
        await _player.play(DeviceFileSource(file.path));
        return true;
      }
      if (_ttsReady) {
        await _tts.setSpeechRate(.45 * rate);
        await _tts.speak(spokenEnglish(en));
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<File?> _online(String text) async {
    final f = File('${_cache.path}/${sha1.convert(utf8.encode(text)).toString().substring(0, 16)}.mp3');
    if (await f.exists() && await f.length() > 0) return f;
    try {
      final client = HttpClient()..connectionTimeout = const Duration(seconds: 5);
      final uri = Uri.https('translate.google.com', '/translate_tts', {'ie': 'UTF-8', 'client': 'tw-ob', 'tl': 'en-GB', 'q': text});
      final req = await client.getUrl(uri);
      req.headers.set(HttpHeaders.userAgentHeader, 'Mozilla/5.0');
      final res = await req.close().timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final bytes = await res.fold<List<int>>([], (a, b) => a..addAll(b));
      if (bytes.isEmpty) return null;
      await f.writeAsBytes(bytes);
      client.close();
      return f;
    } catch (_) {
      return null;
    }
  }
}
