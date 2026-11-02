import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:octaglot/content/content.dart';
import 'package:octaglot/game/exercises.dart';
import 'package:octaglot/game/grading.dart';
import 'package:octaglot/game/memory.dart';
import 'package:octaglot/game/quests.dart';
import 'package:octaglot/game/storm.dart';

void main() {
  final content = Content.parse(File('assets/content/book.json').readAsStringSync());

  group('grading', () {
    test('accepts variants, drops parentheses, articles and to', () {
      expect(checkEnglish('jacket', '(sports) jacket'), TypeVerdict.exact);
      expect(checkEnglish('sports jacket', '(sports) jacket'), TypeVerdict.exact);
      expect(checkEnglish('describe', 'to describe'), TypeVerdict.exact);
      expect(checkEnglish('good-looking', 'beautiful, good-looking (woman)'), TypeVerdict.exact);
      expect(checkEnglish('chest measurement', 'bust / chest measurement'), TypeVerdict.exact);
      expect(checkEnglish("What's she like", "What's he/she like?"), TypeVerdict.exact);
    });

    test('one typo on longer words is tolerated, wrong words are not', () {
      expect(checkEnglish('wrinkels', 'wrinkles'), TypeVerdict.typo);
      expect(checkEnglish('cat', 'car'), TypeVerdict.wrong);
      expect(checkEnglish('', 'car'), TypeVerdict.wrong);
    });

    test('phrase tokens compare without punctuation', () {
      expect(sameTokens(['He', 'looks', 'a', 'bit', 'strange'], 'He looks a bit strange.'), isTrue);
      expect(sameTokens(['looks', 'He'], 'He looks.'), isFalse);
    });
  });

  group('content', () {
    test('every book entry lands in exactly one lesson', () {
      final total = content.units.fold<int>(0, (n, u) => n + u.wordCount);
      final inLessons = content.lessonsInOrder.fold<int>(0, (n, l) => n + l.wordCount);
      expect(content.units.length, 63);
      expect(inLessons, total);
      expect(content.byKey.length, total);
    });

    test('lessons stay small', () {
      for (final l in content.lessonsInOrder) {
        expect(l.words.where((w) => !w.phrase).length, lessonSize >= 10 ? lessThanOrEqualTo(lessonSize) : anything);
      }
    });

    test('distractors never repeat the answer meaning', () {
      final w = content.units[5].lessons.first.words.first;
      final d = content.distractors(w, 3);
      expect(d.length, 3);
      expect(d.any((x) => x.tr == w.tr || x.key == w.key), isFalse);
    });
  });

  group('lesson builders', () {
    test('normal lesson starts with cards and stays within count', () {
      for (final l in content.lessonsInOrder.take(40)) {
        final plan = buildLesson(content, l, firstTime: true);
        expect(plan.exercises, isNotEmpty);
        expect(plan.exercises.length, lessThanOrEqualTo(16));
        expect(plan.exercises.first.kind, ExKind.flashcard);
        for (final e in plan.exercises.where((e) => e.kind == ExKind.choice || e.kind == ExKind.listen)) {
          expect(e.options.where((o) => o.key == e.word!.key).length, 1);
        }
      }
    });

    test('legendary uses production kinds only', () {
      for (var u = 0; u < content.units.length; u++) {
        final plan = buildLegendary(content, u);
        expect(plan.exercises.every((e) => legendaryKinds.contains(e.kind)), isTrue);
      }
    });
  });

  group('games', () {
    test('quests are stable for a day and distinct', () {
      final a = dailyQuests('2026-11-02');
      final b = dailyQuests('2026-11-02');
      expect(a.map((q) => '${q.kind}${q.target}'), b.map((q) => '${q.kind}${q.target}'));
      expect(a.map((q) => q.kind).toSet().length, questCount);
      expect(nextProgress(QuestKind.storm, 120, 90, 200), 120);
      expect(nextProgress(QuestKind.xp, 20, 50, 50), 50);
    });

    test('storm scoring and xp caps', () {
      expect(stormPoints(0), 10);
      expect(stormPoints(9), 50);
      expect(stormXp(2000, 0), stormMaxXp);
      expect(stormXp(500, stormXpRuns), 0);
    });

    test('storm draw refills the pool when it runs dry', () {
      final pool = content.units.first.lessons.first.words.take(6).toList();
      final seen = <String>{for (final w in pool) w.key};
      expect(stormDraw(pool, const [], seen, 2).length, 2);
    });

    test('memory deck pairs each word twice with unique meanings', () {
      final words = content.unitWords(10);
      final deck = memoryDeck(words, const {});
      expect(deck.length, memoryPairs * 2);
      final keys = <String, int>{};
      for (final c in deck) {
        keys[c.word.key] = (keys[c.word.key] ?? 0) + 1;
      }
      expect(keys.values.every((n) => n == 2), isTrue);
      expect(memoryXp(pairs: 6, moves: 6, runsToday: 0), memoryBaseXp);
      expect(memoryXp(pairs: 6, moves: 30, runsToday: 0), 5);
      expect(memoryXp(pairs: 6, moves: 6, runsToday: memoryXpRuns), 0);
    });
  });
}
