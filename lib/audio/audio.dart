import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'sfx.dart';
import 'speech.dart';

export 'sfx.dart' show Sfx;

class AppAudio {
  AppAudio(this.fx, this.speech);
  final SoundFx fx;
  final Speech speech;

  static Future<AppAudio> create() async {
    try {
      await AudioPlayer.global.setAudioContext(AudioContextConfig(focus: AudioContextConfigFocus.mixWithOthers).build());
    } catch (_) {}
    final fx = SoundFx();
    final speech = Speech();
    await Future.wait([fx.init().catchError((_) {}), speech.init().catchError((_) {})]);
    return AppAudio(fx, speech);
  }

  void play(Sfx s) => fx.play(s);

  Future<bool> say(String en) => speech.say(en);
}

final audioProvider = Provider<AppAudio>((ref) => throw UnimplementedError());
