import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../content/content.dart';
import '../design/widgets.dart';
import '../game/exercises.dart';
import '../game/quests.dart';
import '../game/store.dart';
import 'lesson_screen.dart';
import 'result_screen.dart';

Route<T> fullScreen<T>(Widget page) => PageRouteBuilder<T>(
  pageBuilder: (_, _, _) => page,
  transitionDuration: const Duration(milliseconds: 260),
  reverseTransitionDuration: const Duration(milliseconds: 200),
  transitionsBuilder: (_, a, _, child) => FadeTransition(
    opacity: CurvedAnimation(parent: a, curve: Curves.easeOut),
    child: SlideTransition(
      position: Tween(begin: const Offset(0, .04), end: Offset.zero).animate(CurvedAnimation(parent: a, curve: Curves.easeOutCubic)),
      child: child,
    ),
  ),
);

Future<void> startLesson(BuildContext context, WidgetRef ref, Lesson lesson) async {
  final content = ref.read(contentProvider);
  final unit = content.units[lesson.unitIndex];
  final plan = buildLesson(content, lesson, firstTime: !ref.read(gameProvider).done.containsKey(lesson.id));
  if (plan.exercises.isEmpty) {
    showNotice(context, 'Bu ders için içerik bulunamadı.');
    return;
  }
  await _run(
    context,
    ref,
    '${unit.title} · Ders ${lesson.idx}',
    plan,
    LessonMode.normal,
    lesson,
    retry: (ctx) => startLesson(ctx, ref, lesson),
  );
}

Future<void> startLegendary(BuildContext context, WidgetRef ref, Lesson lesson) async {
  final content = ref.read(contentProvider);
  if (ref.read(gameProvider).profile.gems < legendaryCost) {
    showNotice(context, 'Efsane için $legendaryCost elmas gerekiyor.');
    return;
  }
  final plan = buildLegendary(content, lesson.unitIndex);
  if (plan.exercises.length < 6) {
    showNotice(context, 'Bu ünite için efsane turu kurulamadı.');
    return;
  }
  final paid = await ref.read(gameProvider.notifier).startLegendary();
  if (!context.mounted) return;
  if (!paid) {
    showNotice(context, 'Efsane için $legendaryCost elmas gerekiyor.');
    return;
  }
  await _run(
    context,
    ref,
    '${content.units[lesson.unitIndex].title} · Efsane',
    plan,
    LessonMode.legendary,
    lesson,
    retry: (ctx) => startLegendary(ctx, ref, lesson),
  );
}

Future<void> startReview(BuildContext context, WidgetRef ref, {bool weak = false}) async {
  final game = ref.read(gameProvider.notifier);
  final words = weak ? await game.weakWords(20) : await game.dueWords(20);
  if (!context.mounted) return;
  final plan = buildReview(ref.read(contentProvider), words);
  if (plan.exercises.isEmpty) {
    showNotice(
      context,
      weak
          ? 'Henüz zorlandığın kelime yok. Yanlış yaptıkların burada birikir.'
          : 'Tekrar edilecek kelime yok. Birkaç ders sonra burası dolar.',
    );
    return;
  }
  await _run(
    context,
    ref,
    weak ? 'Zayıf kelimeler' : 'Tekrar dersi',
    plan,
    LessonMode.review,
    null,
    retry: (ctx) => startReview(ctx, ref, weak: weak),
  );
}

Future<void> _run(
  BuildContext context,
  WidgetRef ref,
  String title,
  LessonPlan plan,
  LessonMode mode,
  Lesson? lesson, {
  required Future<void> Function(BuildContext) retry,
}) async {
  final result = await Navigator.of(context)
      .push<LessonResult>(fullScreen(LessonScreen(title: title, exercises: plan.exercises, mode: mode)));
  if (result == null || !context.mounted) return;
  final game = ref.read(gameProvider.notifier);
  if (mode == LessonMode.legendary) {
    if (!result.failed && lesson != null) await game.completeLegendary(lesson.id);
  } else if (!result.failed && lesson != null) {
    await game.completeLesson(lesson.id, result.accuracy, result.xp);
  } else if (!result.failed) {
    await game.addXp(result.xp);
    await game.refreshDue();
  }
  await game.bumpQuest(QuestKind.combo, result.bestCombo);
  if (!context.mounted) return;
  final again = await Navigator.of(context).push<bool>(fullScreen(ResultScreen(result: result)));
  if (again == true && context.mounted) await retry(context);
}
