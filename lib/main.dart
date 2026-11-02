import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'audio/audio.dart';
import 'content/content.dart';
import 'data/settings.dart';
import 'data/sync.dart';
import 'data/user_db.dart';
import 'game/store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await Supabase.initialize(url: supabaseUrl, publishableKey: supabaseKey);
  final results = await Future.wait([Content.load(), UserDb.open(), SharedPreferences.getInstance(), AppAudio.create()]);
  final db = results[1] as UserDb;
  final game = await loadGame(db);
  runApp(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        contentProvider.overrideWithValue(results[0] as Content),
        userDbProvider.overrideWithValue(db),
        prefsProvider.overrideWithValue(results[2] as SharedPreferences),
        audioProvider.overrideWithValue(results[3] as AppAudio),
        initialGameProvider.overrideWithValue(game),
      ],
      child: const OctaglotApp(),
    ),
  );
}
