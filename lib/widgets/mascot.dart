import 'dart:math';

import 'package:flutter/material.dart';
import 'package:path_drawing/path_drawing.dart';

enum Mood { idle, happy, sad, cheer, think }

final _armBackL = parseSvgPathData('M10 12c3 5 0 10.692-3 9.692s-4 2-1 3 9.465-.465 13-4c1-1 2-1 2-1L10 12z');
final _armBackR = parseSvgPathData('M26 12c-3 5 0 10.692 3 9.692s4 2 1 3-9.465-.465-13-4c-1-1-2-1-2-1L26 12z');
final _armMidR = parseSvgPathData('M30.188 16c-3 5 0 10.692 3 9.692s4 2 1 3-9.465-.465-13-4c-1-1-2-1-2-1l11-7.692z');
final _armMidL = parseSvgPathData('M5.812 16c3 5 0 10.692-3 9.692s-4 2-1 3 9.465-.465 13-4c1-1 2-1 2-1L5.812 16z');
final _body = parseSvgPathData(
  'M33.188 31.375c-2.729.91-6.425-5.626-4.812-10.578C30.022 17.554 31 13.94 31 11c0-7.18-5.82-11-13-11S5 3.82 5 11c0 2.94.978 6.554 2.624 9.797 1.613 4.952-2.083 11.488-4.812 10.578-3-1-4 3-1 4s8.31-.627 12-4c2.189-2 4.189-2 4.189-2s2 0 4.188 2c3.69 3.373 9 5 12 4s1.999-5-1.001-4z',
);

const _dark = Color(0xFF6A3788);
const _mid = Color(0xFF884EAA);
const _bodyColor = Color(0xFFA766CC);
const _eye = Color(0xFF292F33);

class Mascot extends StatefulWidget {
  const Mascot({super.key, this.mood = Mood.idle, this.size = 120, this.circle = false});
  final Mood mood;
  final double size;
  final bool circle;

  @override
  State<Mascot> createState() => _MascotState();
}

class _MascotState extends State<Mascot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 60))..repeat();
  late DateTime _moodAt = DateTime.now();

  @override
  void didUpdateWidget(covariant Mascot old) {
    super.didUpdateWidget(old);
    if (old.mood != widget.mood) _moodAt = DateTime.now();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.of(context).disableAnimations;
    return RepaintBoundary(
      child: SizedBox.square(
        dimension: widget.size,
        child: AnimatedBuilder(
          animation: _c,
          builder: (_, _) => CustomPaint(
            painter: _MascotPainter(
              mood: widget.mood,
              t: reduce ? 0 : DateTime.now().millisecondsSinceEpoch / 1000.0,
              since: reduce ? 10 : DateTime.now().difference(_moodAt).inMilliseconds / 1000.0,
              circle: widget.circle,
            ),
          ),
        ),
      ),
    );
  }
}

class _MascotPainter extends CustomPainter {
  _MascotPainter({required this.mood, required this.t, required this.since, required this.circle});
  final Mood mood;
  final double t;
  final double since;
  final bool circle;

  double _wave(double period, double phase) {
    final x = ((t - phase) % period) / period;
    return sin(2 * pi * x);
  }

  double _arm(double phase, double dir) {
    switch (mood) {
      case Mood.idle:
        return 6 * dir * _wave(3.4, phase);
      case Mood.think:
        return 3.5 * dir * _wave(4.6, phase);
      case Mood.cheer:
        return 14 * dir * _wave(1.1, phase);
      case Mood.happy:
        final s = since - phase * .4;
        if (s < 0 || s > 1.35) return 0;
        return -12 * dir * sin(pi * ((s % .45) / .45));
      case Mood.sad:
        return 7 * dir * min(1.0, since / .35);
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    final box = circle ? const Rect.fromLTWH(-10.82, -10, 57.64, 57.64) : const Rect.fromLTWH(0, 0, 36, 36);
    final s = size.width / box.width;
    canvas.save();
    canvas.scale(s);
    canvas.translate(-box.left, -box.top);

    var dy = 0.0, rot = 0.0, sx = 1.0, sy = 1.0;
    switch (mood) {
      case Mood.idle:
        final w = (1 - cos(2 * pi * ((t % 3.2) / 3.2))) / 2;
        dy = -1.6 * w;
        sy = 1 + .035 * w;
        sx = 1 - .025 * w;
      case Mood.think:
        rot = 4 * _wave(3.6, 0);
      case Mood.happy:
        if (since < 1.35) {
          final w = sin(pi * ((since % .45) / .45));
          dy = -4.5 * w;
          sy = 1 + .06 * w;
        }
      case Mood.cheer:
        final x = (t % .8) / .8;
        dy = -6 * sin(pi * x);
        rot = 7 * sin(2 * pi * x) * -1;
      case Mood.sad:
        final k = min(1.0, since / .35);
        dy = 2 * k;
        sy = 1 - .06 * k;
        sx = 1 + .04 * k;
    }

    canvas.translate(18, 30 + dy);
    canvas.rotate(rot * pi / 180);
    canvas.scale(sx, sy);
    canvas.translate(-18, -30);

    void arm(Path p, Color c, double ox, double oy, double phase, double dir) {
      canvas.save();
      canvas.translate(ox, oy);
      canvas.rotate(_arm(phase, dir) * pi / 180);
      canvas.translate(-ox, -oy);
      canvas.drawPath(p, Paint()..color = c);
      canvas.restore();
    }

    arm(_armBackL, _dark, 12, 13, 0, -1);
    arm(_armBackR, _dark, 24, 13, .25, 1);
    arm(_armMidL, _mid, 7.8, 17, .5, -1);
    arm(_armMidR, _mid, 28.2, 17, .75, 1);
    canvas.drawPath(_body, Paint()..color = _bodyColor);

    final stroke = Paint()
      ..color = _eye
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    final joy = mood == Mood.happy || mood == Mood.cheer;
    if (mood == Mood.sad) {
      canvas.drawArc(const Rect.fromLTWH(12, 20, 4, 4), pi, pi, false, stroke);
      canvas.drawArc(const Rect.fromLTWH(20, 20, 4, 4), pi, pi, false, stroke);
    } else if (joy) {
      canvas.drawPath(parseSvgPathData('M12 22c1-2.2 3-2.2 4 0'), stroke);
      canvas.drawPath(parseSvgPathData('M20 22c1-2.2 3-2.2 4 0'), stroke);
    } else {
      final x = (t % 4.5) / 4.5;
      final blink = x > .92 && x < .98 ? max(.1, 1 - sin(pi * (x - .92) / .06)) : 1.0;
      canvas.save();
      canvas.translate(18, 21);
      canvas.scale(1, blink);
      canvas.translate(-18, -21);
      final fill = Paint()..color = _eye;
      canvas.drawCircle(const Offset(14, 21), 2, fill);
      canvas.drawCircle(const Offset(22, 21), 2, fill);
      final hl = Paint()..color = Colors.white;
      canvas.drawCircle(const Offset(14.8, 20.2), .6, hl);
      canvas.drawCircle(const Offset(22.8, 20.2), .6, hl);
      canvas.restore();
    }
    final mouth = Paint()
      ..color = _eye
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round;
    if (joy) canvas.drawPath(parseSvgPathData('M16 25.4c1 1.4 3 1.4 4 0'), mouth);
    if (mood == Mood.sad) canvas.drawPath(parseSvgPathData('M16.4 26.2c.9-1.1 2.3-1.1 3.2 0'), mouth);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _MascotPainter old) => true;
}
