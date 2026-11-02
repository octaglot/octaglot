import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../audio/audio.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/exercises.dart';
import '../widgets/mascot.dart';
import 'lesson_screen.dart';

class ResultScreen extends ConsumerStatefulWidget {
  const ResultScreen({super.key, required this.result});
  final LessonResult result;

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(audioProvider).play(widget.result.failed ? Sfx.heart : Sfx.levelUp);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final r = widget.result;
    final legendary = r.mode == LessonMode.legendary;

    if (r.failed) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                const Mascot(mood: Mood.sad, size: 150),
                const SizedBox(height: 16),
                Text(
                  legendary ? 'Efsane başarısız' : 'Canların bitti',
                  textAlign: TextAlign.center,
                  style: ts(T.display, w: FontWeight.w900, color: c.danger),
                ),
                const SizedBox(height: 8),
                Text(
                  legendary
                      ? 'Üç hata hakkın doldu. Elmas geri gelmiyor — bir daha denemek için yeniden gir.'
                      : 'Canlar yarım saatte bir geri gelir. Dilersen dersi baştan dene.',
                  textAlign: TextAlign.center,
                  style: ts(T.body, w: FontWeight.w700, color: c.ink2),
                ),
                const Spacer(),
                PushButton(label: 'Tekrar dene', full: true, large: true, onTap: () => Navigator.pop(context, true)),
                const SizedBox(height: 12),
                PushButton(label: 'Haritaya dön', kind: BtnKind.ghost, full: true, onTap: () => Navigator.pop(context, false)),
              ],
            ),
          ),
        ),
      );
    }

    final perfect = r.accuracy == 1;
    return Scaffold(
      body: Stack(
        children: [
          const Positioned.fill(child: IgnorePointer(child: _Confetti())),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Spacer(),
                  const Mascot(mood: Mood.cheer, size: 160),
                  const SizedBox(height: 12),
                  Text(
                    legendary ? 'Efsane geçildi!' : (perfect ? 'Kusursuz ders!' : 'Ders tamamlandı!'),
                    textAlign: TextAlign.center,
                    style: ts(T.display, w: FontWeight.w900, color: c.goldDark),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    legendary
                        ? 'Bu ders artık efsane. Haritada altın halkasıyla duruyor.'
                        : (perfect ? 'Tek hata bile yok. Okta gururlu.' : 'Güzel gidiyorsun, devam et.'),
                    textAlign: TextAlign.center,
                    style: ts(T.body, w: FontWeight.w700, color: c.ink2),
                  ),
                  const SizedBox(height: 26),
                  Row(
                    children: [
                      Expanded(
                        child: _Stat(label: 'XP', value: '+${r.xp}', color: c.gold),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(label: 'İSABET', value: '%${(r.accuracy * 100).round()}', color: c.successText),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(label: 'DOĞRU', value: '${r.correct}/${r.total}', color: c.skyText),
                      ),
                    ],
                  ),
                  const Spacer(),
                  PushButton(label: 'Devam', full: true, large: true, onTap: () => Navigator.pop(context, false)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(2),
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(R.lg)),
    child: Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Text(
            label,
            style: ts(T.tiny, w: FontWeight.w900, color: Palette.onColor, spacing: 1),
          ),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: context.c.surface, borderRadius: BorderRadius.circular(R.md)),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              textAlign: TextAlign.center,
              style: ts(T.title, w: FontWeight.w900, color: color),
            ),
          ),
        ),
      ],
    ),
  );
}

class _Confetti extends StatefulWidget {
  const _Confetti();

  @override
  State<_Confetti> createState() => _ConfettiState();
}

class _ConfettiState extends State<_Confetti> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 3200))..forward();
  final _rng = Random();
  late final _bits = List.generate(
    44,
    (i) => (
      x: _rng.nextDouble(),
      delay: _rng.nextDouble() * .15,
      speed: .55 + _rng.nextDouble() * .4,
      rot: _rng.nextDouble() * 12 - 6,
      w: 7 + _rng.nextDouble() * 7,
      color: i % 5,
    ),
  );

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final colors = [c.success, c.sky, c.gold, c.lilac, c.accent];
    return AnimatedBuilder(
      animation: _c,
      builder: (_, _) => CustomPaint(painter: _ConfettiPainter(_c.value, _bits, colors)),
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter(this.t, this.bits, this.colors);
  final double t;
  final List<({double x, double delay, double speed, double rot, double w, int color})> bits;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    for (final b in bits) {
      final p = ((t - b.delay) / b.speed).clamp(0.0, 1.0);
      if (p <= 0) continue;
      final y = -40 + p * (size.height + 80);
      final paint = Paint()..color = colors[b.color].withValues(alpha: p > .75 ? (1 - p) * 4 : 1);
      canvas.save();
      canvas.translate(b.x * size.width, y);
      canvas.rotate(b.rot * p);
      canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromCenter(center: Offset.zero, width: b.w, height: b.w * 1.6), const Radius.circular(2)),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter old) => old.t != t;
}
