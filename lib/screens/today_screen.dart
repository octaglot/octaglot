import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/quests.dart';
import '../game/store.dart';
import '../widgets/mascot.dart';
import 'flows.dart';

class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.c;
    final s = ref.watch(gameProvider);
    final game = ref.read(gameProvider.notifier);
    final next = game.nextLesson;
    final content = ref.read(contentProvider);
    final p = s.profile;
    final pct = min(1.0, s.todayXp / p.dailyGoal);
    final done = pct >= 1;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        Panel(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 18),
          child: Column(
            children: [
              SizedBox.square(
                dimension: 168,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(end: pct),
                      duration: const Duration(milliseconds: 800),
                      curve: Curves.easeOut,
                      builder: (_, v, _) => CustomPaint(size: const Size.square(168), painter: _Ring(v, c.line, done ? c.success : c.gold)),
                    ),
                    Mascot(mood: done ? Mood.cheer : Mood.idle, size: 2 * (74 - 4.5), circle: true),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${s.todayXp}',
                      style: ts(T.lead, w: FontWeight.w900),
                    ),
                    TextSpan(
                      text: ' / ${p.dailyGoal} XP',
                      style: ts(T.lead, w: FontWeight.w900, color: c.muted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                done
                    ? 'Günlük hedefi tamamladın.'
                    : p.streak > 0
                    ? '${p.streak} gündür ara vermedin.'
                    : 'Bugün ilk dersini yap, seri başlasın.',
                style: ts(T.small, w: FontWeight.w700, color: c.ink2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (next != null)
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SIRADA',
                  style: ts(T.tiny, w: FontWeight.w800, color: c.muted, spacing: 1),
                ),
                const SizedBox(height: 4),
                Text(content.units[next.unitIndex].title, style: ts(T.lead, w: FontWeight.w900)),
                Text(
                  'Ünite ${next.unitIndex + 1} · Ders ${next.idx} · ${next.wordCount} kelime',
                  style: ts(T.small, w: FontWeight.w700, color: c.ink2),
                ),
                const SizedBox(height: 14),
                PushButton(label: 'Derse başla', full: true, onTap: () => startLesson(context, ref, next)),
              ],
            ),
          ),
        const SizedBox(height: 14),
        const QuestCard(),
      ],
    );
  }
}

class _Ring extends CustomPainter {
  _Ring(this.value, this.track, this.color);
  final double value;
  final Color track;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    const r = 74.0;
    final base = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 9;
    canvas.drawCircle(center, r, base);
    if (value <= 0) return;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: r),
      -pi / 2,
      2 * pi * value,
      false,
      base
        ..color = color
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _Ring old) => old.value != value || old.color != color || old.track != track;
}

class QuestCard extends ConsumerWidget {
  const QuestCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.c;
    final quests = ref.watch(gameProvider.select((s) => s.quests));
    if (quests.isEmpty) return const SizedBox.shrink();
    return Panel(
      title: 'Günlük görevler',
      titleIcon: OIcon(OI.target, size: 18, color: c.brand),
      child: Column(
        children: [
          for (final q in quests)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          questText(q.kind, q.target),
                          style: ts(T.small, w: FontWeight.w700, color: c.ink2),
                        ),
                      ),
                      Text(
                        '${q.progress}/${q.target}',
                        style: ts(T.tiny, w: FontWeight.w800, color: c.muted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  PillBar(value: q.progress / q.target, height: 10, color: q.complete ? c.success : c.brand),
                  if (q.complete && !q.claimed) ...[
                    const SizedBox(height: 8),
                    PushButton(
                      label: '$questReward · Al',
                      icon: OI.gem,
                      compact: true,
                      full: true,
                      onTap: () => ref.read(gameProvider.notifier).claimQuest(q.idx),
                    ),
                  ],
                  if (q.claimed) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Alındı',
                      style: ts(T.tiny, w: FontWeight.w800, color: c.successText),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}
