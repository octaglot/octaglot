import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Settings {
  const Settings({this.theme = ThemeMode.dark, this.rate = 1.0, this.sound = true, this.autoSpeak = true});
  final ThemeMode theme;
  final double rate;
  final bool sound;
  final bool autoSpeak;

  Settings copyWith({ThemeMode? theme, double? rate, bool? sound, bool? autoSpeak}) =>
      Settings(theme: theme ?? this.theme, rate: rate ?? this.rate, sound: sound ?? this.sound, autoSpeak: autoSpeak ?? this.autoSpeak);
}

final prefsProvider = Provider<SharedPreferences>((ref) => throw UnimplementedError());

final settingsProvider = NotifierProvider<SettingsNotifier, Settings>(SettingsNotifier.new);

class SettingsNotifier extends Notifier<Settings> {
  SharedPreferences get _prefs => ref.read(prefsProvider);

  @override
  Settings build() {
    final p = ref.read(prefsProvider);
    return Settings(
      theme: ThemeMode.values.byName(p.getString('theme') ?? ThemeMode.dark.name),
      rate: p.getDouble('rate') ?? 1.0,
      sound: p.getBool('sound') ?? true,
      autoSpeak: p.getBool('autoSpeak') ?? true,
    );
  }

  void setTheme(ThemeMode m) {
    state = state.copyWith(theme: m);
    _prefs.setString('theme', m.name);
  }

  void setRate(double r) {
    state = state.copyWith(rate: r);
    _prefs.setDouble('rate', r);
  }

  void setSound(bool v) {
    state = state.copyWith(sound: v);
    _prefs.setBool('sound', v);
  }

  void setAutoSpeak(bool v) {
    state = state.copyWith(autoSpeak: v);
    _prefs.setBool('autoSpeak', v);
  }
}
