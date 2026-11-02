import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';

class _Note {
  const _Note(this.f, this.t, this.d, {this.triangle = false, this.gain = .18});
  final double f;
  final double t;
  final double d;
  final bool triangle;
  final double gain;
}

enum Sfx { correct, wrong, tap, heart, complete, levelUp, flip }

const _notes = {
  Sfx.correct: [_Note(587.33, 0, .12), _Note(880, .08, .22)],
  Sfx.wrong: [_Note(233.08, 0, .18, triangle: true), _Note(174.61, .1, .28, triangle: true)],
  Sfx.tap: [_Note(660, 0, .05, gain: .07)],
  Sfx.flip: [_Note(520, 0, .04, gain: .06), _Note(780, .03, .05, gain: .05)],
  Sfx.heart: [_Note(392, 0, .1, triangle: true), _Note(261.63, .08, .2, triangle: true)],
  Sfx.complete: [_Note(523.25, 0, .14), _Note(659.25, .11, .14), _Note(783.99, .22, .14), _Note(1046.5, .33, .4)],
  Sfx.levelUp: [_Note(440, 0, .1), _Note(554.37, .09, .1), _Note(659.25, .18, .1), _Note(880, .27, .35)],
};

Uint8List _synthWav(List<_Note> notes, {int rate = 22050}) {
  final end = notes.map((n) => n.t + n.d + .03).reduce(max);
  final len = (end * rate).ceil();
  final buf = Float64List(len);
  for (final n in notes) {
    final start = (n.t * rate).floor();
    final count = (n.d * rate).ceil();
    for (var i = 0; i < count && start + i < len; i++) {
      final t = i / rate;
      final phase = (n.f * t) % 1.0;
      final wave = n.triangle ? 4 * (phase - .5).abs() - 1 : sin(2 * pi * phase);
      final attack = min(1.0, t / .012);
      final decay = pow(.0001 / n.gain, t / n.d).toDouble();
      buf[start + i] += wave * n.gain * attack * decay;
    }
  }
  final bytes = BytesBuilder();
  void u32(int v) => bytes.add(Uint8List(4)..buffer.asByteData().setUint32(0, v, Endian.little));
  void u16(int v) => bytes.add(Uint8List(2)..buffer.asByteData().setUint16(0, v, Endian.little));
  bytes.add('RIFF'.codeUnits);
  u32(36 + len * 2);
  bytes.add('WAVEfmt '.codeUnits);
  u32(16);
  u16(1);
  u16(1);
  u32(rate);
  u32(rate * 2);
  u16(2);
  u16(16);
  bytes.add('data'.codeUnits);
  u32(len * 2);
  final pcm = ByteData(len * 2);
  for (var i = 0; i < len; i++) {
    pcm.setInt16(i * 2, (buf[i].clamp(-1.0, 1.0) * 32767).round(), Endian.little);
  }
  bytes.add(pcm.buffer.asUint8List());
  return bytes.toBytes();
}

class SoundFx {
  final Map<Sfx, String> _files = {};
  final List<AudioPlayer> _players = [];
  int _next = 0;
  bool enabled = true;

  Future<void> init() async {
    final dir = await getTemporaryDirectory();
    for (final e in _notes.entries) {
      final f = File('${dir.path}/sfx-${e.key.name}.wav');
      await f.writeAsBytes(_synthWav(e.value));
      _files[e.key] = f.path;
    }
    for (var i = 0; i < 4; i++) {
      final p = AudioPlayer();
      await p.setPlayerMode(PlayerMode.lowLatency);
      await p.setReleaseMode(ReleaseMode.stop);
      await p.setAudioContext(AudioContextConfig(focus: AudioContextConfigFocus.mixWithOthers).build());
      _players.add(p);
    }
  }

  void play(Sfx s) {
    if (!enabled || _players.isEmpty) return;
    final path = _files[s];
    if (path == null) return;
    final p = _players[_next++ % _players.length];
    p.stop().then((_) => p.play(DeviceFileSource(path))).catchError((_) {});
  }
}
