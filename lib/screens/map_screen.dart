import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../content/content.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/store.dart';
import '../widgets/mascot.dart';
import 'flows.dart';

const _offsets = [0.0, 62.0, 0.0, -62.0];
const _nodeH = 64.0;
const _gap = 26.0;
const _topPad = 34.0;
const _headerH = 96.0;
const _unitGap = 40.0;

double unitHeight(Unit u) => _headerH + 26 + _topPad + u.lessons.length * _nodeH + (u.lessons.length - 1) * _gap + _unitGap;

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  ScrollController? _ctrl;

  ScrollController _controllerFor(Content content, Lesson? open) {
    if (_ctrl != null) return _ctrl!;
    var offset = 0.0;
    if (open != null) {
      for (final u in content.units.take(open.unitIndex)) {
        offset += unitHeight(u);
      }
      final idx = content.units[open.unitIndex].lessons.indexOf(open);
      offset += _headerH + 26 + _topPad + idx * (_nodeH + _gap) - 160;
    }
    return _ctrl = ScrollController(initialScrollOffset: offset < 0 ? 0 : offset);
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = ref.watch(contentProvider);
    final done = ref.watch(gameProvider.select((s) => s.done));
    final legendary = ref.watch(gameProvider.select((s) => s.legendary));
    Lesson? open;
    for (final l in content.lessonsInOrder) {
      if (!done.containsKey(l.id)) {
        open = l;
        break;
      }
    }
    final ctrl = _controllerFor(content, open);
    return ListView.builder(
      controller: ctrl,
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
      itemCount: content.units.length + 1,
      itemBuilder: (context, i) {
        if (i == content.units.length) {
          return Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Column(
              children: [
                const Mascot(size: 110),
                const SizedBox(height: 6),
                Text(
                  open == null ? 'Bütün dersleri bitirdin!' : 'Devam et, Okta seni bekliyor',
                  style: ts(T.body, w: FontWeight.w700, color: context.c.ink2),
                ),
              ],
            ),
          );
        }
        return _UnitSection(unit: content.units[i], done: done, legendary: legendary, open: open);
      },
    );
  }
}

class _UnitSection extends ConsumerWidget {
  const _UnitSection({required this.unit, required this.done, required this.legendary, required this.open});
  final Unit unit;
  final Map<String, dynamic> done;
  final Set<String> legendary;
  final Lesson? open;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.c;
    final (color, edge) = c.deep[unit.index % c.deep.length];
    final content = ref.read(contentProvider);
    final openGlobal = open == null ? content.lessonsInOrder.length : content.lessonsInOrder.indexOf(open!);
    final doneCount = unit.lessons.where((l) => done.containsKey(l.id)).length;
    final unitDone = doneCount == unit.lessons.length;

    return SizedBox(
      height: unitHeight(unit),
      child: Column(
        children: [
          Container(
            height: _headerH,
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(R.lg),
              boxShadow: [BoxShadow(color: edge, offset: const Offset(0, 4))],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'ÜNİTE ${unit.number} · ${unit.wordCount} KELİME',
                        style: ts(T.tiny, w: FontWeight.w800, color: Palette.onColor.withValues(alpha: .85), spacing: 1),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        unit.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: ts(T.title, w: FontWeight.w900, color: Palette.onColor),
                      ),
                      Text(
                        '$doneCount / ${unit.lessons.length} ders',
                        style: ts(T.small, w: FontWeight.w700, color: Palette.onColor.withValues(alpha: .92)),
                      ),
                    ],
                  ),
                ),
                if (unitDone) const OIcon(OI.crown, size: 30, color: Palette.onColor),
              ],
            ),
          ),
          const SizedBox(height: 26),
          Expanded(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: _PathPainter(count: unit.lessons.length, doneUpTo: doneCount, color: color, line: c.line),
                  ),
                ),
                for (var li = 0; li < unit.lessons.length; li++)
                  () {
                    final lesson = unit.lessons[li];
                    final g = content.lessonsInOrder.indexOf(lesson);
                    return Positioned(
                      top: _topPad + li * (_nodeH + _gap),
                      left: 0,
                      right: 0,
                      child: Transform.translate(
                        offset: Offset(_offsets[li % _offsets.length], 0),
                        child: Center(
                          child: _Node(
                            lesson: lesson,
                            color: color,
                            edge: edge,
                            isDone: done.containsKey(lesson.id),
                            isOpen: g == openGlobal,
                            locked: g > openGlobal,
                            isLegendary: legendary.contains(lesson.id),
                          ),
                        ),
                      ),
                    );
                  }(),
              ],
            ),
          ),
          const SizedBox(height: _unitGap),
        ],
      ),
    );
  }
}

class _PathPainter extends CustomPainter {
  _PathPainter({required this.count, required this.doneUpTo, required this.color, required this.line});
  final int count;
  final int doneUpTo;
  final Color color;
  final Color line;

  @override
  void paint(Canvas canvas, Size size) {
    double cx(int i) => size.width / 2 + _offsets[i % _offsets.length];
    double cy(int i) => _topPad + i * (_nodeH + _gap) + _nodeH / 2;
    for (var i = 0; i < count - 1; i++) {
      final y1 = cy(i), y2 = cy(i + 1), bend = (y2 - y1) / 2;
      final path = Path()
        ..moveTo(cx(i), y1)
        ..cubicTo(cx(i), y1 + bend, cx(i + 1), y2 - bend, cx(i + 1), y2);
      canvas.drawPath(
        path,
        Paint()
          ..color = i < doneUpTo ? color.withValues(alpha: .45) : line
          ..style = PaintingStyle.stroke
          ..strokeWidth = 10
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _PathPainter old) => old.doneUpTo != doneUpTo || old.color != color || old.line != line;
}

class _Node extends ConsumerStatefulWidget {
  const _Node({
    required this.lesson,
    required this.color,
    required this.edge,
    required this.isDone,
    required this.isOpen,
    required this.locked,
    required this.isLegendary,
  });
  final Lesson lesson;
  final Color color;
  final Color edge;
  final bool isDone;
  final bool isOpen;
  final bool locked;
  final bool isLegendary;

  @override
  ConsumerState<_Node> createState() => _NodeState();
}

class _NodeState extends ConsumerState<_Node> with SingleTickerProviderStateMixin {
  late final AnimationController _bob = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));
  bool _down = false;

  @override
  void initState() {
    super.initState();
    if (widget.isOpen) _bob.repeat();
  }

  @override
  void didUpdateWidget(covariant _Node old) {
    super.didUpdateWidget(old);
    if (widget.isOpen && !_bob.isAnimating) _bob.repeat();
    if (!widget.isOpen && _bob.isAnimating) _bob.stop();
  }

  @override
  void dispose() {
    _bob.dispose();
    super.dispose();
  }

  void _tap() {
    if (widget.locked) {
      showNotice(context, 'Önce önceki dersleri bitir.');
      return;
    }
    if (!widget.isDone) {
      startLesson(context, ref, widget.lesson);
      return;
    }
    _doneMenu();
  }

  void _doneMenu() {
    final c = context.c;
    final unit = ref.read(contentProvider).units[widget.lesson.unitIndex];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: c.surface,
      isScrollControlled: true,
      showDragHandle: false,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(R.xl))),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${unit.title} · Ders ${widget.lesson.idx}', style: ts(T.lead, w: FontWeight.w900)),
                const SizedBox(height: 4),
                Text(
                  widget.lesson.words.take(6).map((w) => w.en).join(', '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: ts(T.small, w: FontWeight.w700, color: c.ink2),
                ),
                const SizedBox(height: 18),
                PushButton(
                  label: 'Tekrar oyna',
                  full: true,
                  onTap: () {
                    Navigator.pop(ctx);
                    startLesson(context, ref, widget.lesson);
                  },
                ),
                const SizedBox(height: 10),
                PushButton(
                  label: widget.isLegendary ? 'Efsane · geçildi' : 'Efsane · $legendaryCost elmas',
                  icon: OI.crown,
                  kind: BtnKind.gold,
                  full: true,
                  onTap: () {
                    Navigator.pop(ctx);
                    startLegendary(context, ref, widget.lesson);
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  'Efsane: tüm üniteden yazma soruları, üç hata hakkı.',
                  style: ts(T.tiny, w: FontWeight.w700, color: c.muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fill = widget.locked ? c.line : (widget.isDone ? c.gold : widget.color);
    final edge = widget.locked ? c.muted : (widget.isDone ? c.goldDark : widget.edge);
    final icon = widget.locked
        ? OI.lock
        : widget.isLegendary
        ? OI.crown
        : widget.isDone
        ? OI.star
        : OI.play;

    return AnimatedBuilder(
      animation: _bob,
      builder: (_, child) {
        final dy = widget.isOpen ? -6 * sin(pi * _bob.value) : 0.0;
        return Transform.translate(offset: Offset(0, dy), child: child);
      },
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          if (widget.isOpen)
            Positioned(
              bottom: _nodeH + 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: c.surface,
                  border: Border.all(color: c.line, width: 2),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: Text(
                  'BAŞLA',
                  style: ts(T.tiny, w: FontWeight.w900, color: widget.color, spacing: 1),
                ),
              ),
            ),
          Semantics(
            button: true,
            label: 'Ders ${widget.lesson.idx}${widget.locked ? ', kilitli' : ''}',
            child: GestureDetector(
              onTapDown: (_) => setState(() => _down = true),
              onTapCancel: () => setState(() => _down = false),
              onTapUp: (_) {
                setState(() => _down = false);
                _tap();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 70),
                width: 72,
                height: _nodeH,
                margin: EdgeInsets.only(top: _down ? 5 : 0, bottom: _down ? 0 : 5),
                decoration: BoxDecoration(
                  color: fill,
                  shape: BoxShape.circle,
                  boxShadow: [
                    if (widget.isLegendary) ...[
                      BoxShadow(color: c.goldDark, spreadRadius: 7),
                      BoxShadow(color: c.surface, spreadRadius: 4),
                    ],
                    if (!_down) BoxShadow(color: edge, offset: const Offset(0, 6)),
                  ],
                ),
                alignment: Alignment.center,
                child: OIcon(icon, size: 28, color: widget.locked ? c.muted : Palette.onColor),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
