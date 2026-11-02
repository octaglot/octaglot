import 'package:flutter/material.dart';
import 'package:path_drawing/path_drawing.dart';

import '../design/tokens.dart';

final _ringLeft = parseSvgPathData('M120,60 A60,60 0 1 1 60,0 L60,30 A30,30 0 1 0 90,60 Z');
final _ringRight = parseSvgPathData('M60,60 A60,60 0 1 1 120,120 L120,90 A30,30 0 1 0 90,60 Z');

class Mark extends StatelessWidget {
  const Mark({super.key, this.width = 60, this.color});
  final double width;
  final Color? color;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    height: width * 2 / 3,
    child: CustomPaint(painter: _MarkPainter(color ?? context.c.brand)),
  );
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 180);
    final p = Paint()..color = color;
    canvas.drawPath(_ringLeft, p);
    canvas.drawPath(_ringRight, p);
  }

  @override
  bool shouldRepaint(covariant _MarkPainter old) => old.color != color;
}

class LogoTile extends StatelessWidget {
  const LogoTile({super.key, this.size = 40});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(size * .238),
      gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment(-.3, 1), colors: [Color(0xFFA843D2), Color(0xFF4C087B)]),
    ),
    alignment: Alignment.center,
    child: Mark(width: size * .74, color: Colors.white),
  );
}

class Wordmark extends StatelessWidget {
  const Wordmark({super.key, this.size = 28, this.color});
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      LogoTile(size: size),
      SizedBox(width: size * .28),
      Text(
        'Octaglot',
        style: ts(size * .66, w: FontWeight.w900, color: color ?? context.c.ink, spacing: -.5),
      ),
    ],
  );
}
