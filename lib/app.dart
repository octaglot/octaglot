import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'audio/audio.dart';
import 'data/settings.dart';
import 'data/sync.dart';
import 'design/tokens.dart';
import 'screens/shell.dart';

class OctaglotApp extends ConsumerStatefulWidget {
  const OctaglotApp({super.key});

  @override
  ConsumerState<OctaglotApp> createState() => _OctaglotAppState();
}

class _OctaglotAppState extends ConsumerState<OctaglotApp> {
  @override
  void initState() {
    super.initState();
    final s = ref.read(settingsProvider);
    final audio = ref.read(audioProvider);
    audio.fx.enabled = s.sound;
    audio.speech.rate = s.rate;
    ref.read(syncProvider);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(settingsProvider, (_, s) {
      final audio = ref.read(audioProvider);
      audio.fx.enabled = s.sound;
      audio.speech.rate = s.rate;
    });
    final theme = ref.watch(settingsProvider.select((s) => s.theme));
    return MaterialApp(
      title: 'Octaglot',
      debugShowCheckedModeBanner: false,
      themeMode: theme,
      theme: buildTheme(Palette.light, Brightness.light),
      darkTheme: buildTheme(Palette.dark, Brightness.dark),
      locale: const Locale('tr'),
      supportedLocales: const [Locale('tr')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      builder: (context, child) {
        final dark = Theme.of(context).brightness == Brightness.dark;
        final c = context.c;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark).copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: c.surface,
            systemNavigationBarIconBrightness: dark ? Brightness.light : Brightness.dark,
          ),
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: MediaQuery.of(context).textScaler.clamp(maxScaleFactor: 1.3)),
            child: child!,
          ),
        );
      },
      home: const Shell(),
    );
  }
}
