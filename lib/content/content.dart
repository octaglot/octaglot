import 'dart:convert';
import 'dart:math';

import 'package:flutter/services.dart';

import '../game/rand.dart';

class Unit {
  const Unit({required this.index, required this.code, required this.title, required this.lessons, required this.wordCount});
  final int index;
  final String code;
  final String title;
  final List<Lesson> lessons;
  final int wordCount;

  int get number => index + 1;
}

class Lesson {
  const Lesson({required this.id, required this.unitIndex, required this.idx, required this.words});
  final String id;
  final int unitIndex;
  final int idx;
  final List<Word> words;

  int get wordCount => words.length;
}

class Word {
  const Word({
    required this.key,
    required this.unitIndex,
    required this.en,
    required this.tr,
    required this.marked,
    required this.note,
    required this.phrase,
  });

  final String key;
  final int unitIndex;
  final String en;
  final String tr;
  final bool marked;
  final String note;
  final bool phrase;

  @override
  bool operator ==(Object other) => other is Word && other.key == key;

  @override
  int get hashCode => key.hashCode;
}

const lessonSize = 10;

class Content {
  Content(this.units) {
    for (final u in units) {
      for (final l in u.lessons) {
        lessonsInOrder.add(l);
        for (final w in l.words) {
          byKey[w.key] = w;
        }
      }
    }
  }

  final List<Unit> units;
  final List<Lesson> lessonsInOrder = [];
  final Map<String, Word> byKey = {};

  static Future<Content> load() async {
    final raw = await rootBundle.loadString('assets/content/book.json');
    return Content.parse(raw);
  }

  static Content parse(String raw) {
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final unitRows = (data['units'] as List).cast<Map<String, dynamic>>();
    final rows = (data['words'] as List).cast<List<dynamic>>();
    final perUnit = List.generate(unitRows.length, (_) => <Word>[]);
    for (final r in rows) {
      final ui = r[0] as int;
      perUnit[ui].add(
        Word(
          key: '${unitRows[ui]['code']}|${r[1]}',
          unitIndex: ui,
          en: r[1] as String,
          tr: r[2] as String,
          marked: r[3] == 1,
          note: r[4] as String,
          phrase: r[5] == 1,
        ),
      );
    }
    final units = <Unit>[];
    for (var i = 0; i < unitRows.length; i++) {
      final code = unitRows[i]['code'] as String;
      units.add(
        Unit(
          index: i,
          code: code,
          title: unitRows[i]['title'] as String,
          lessons: splitLessons(i, code, perUnit[i]),
          wordCount: perUnit[i].length,
        ),
      );
    }
    return Content(units);
  }

  static List<Lesson> splitLessons(int unitIndex, String code, List<Word> all) {
    final words = all.where((w) => !w.phrase).toList();
    final phrases = all.where((w) => w.phrase).toList();
    final count = max(1, ((words.isEmpty ? phrases.length : words.length) / lessonSize).ceil());
    final buckets = List.generate(count, (_) => <Word>[]);
    for (var i = 0; i < words.length; i++) {
      buckets[min(count - 1, i ~/ lessonSize)].add(words[i]);
    }
    for (var i = 0; i < phrases.length; i++) {
      buckets[(i * count) ~/ max(1, phrases.length)].add(phrases[i]);
    }
    return [
      for (var i = 0; i < count; i++)
        if (buckets[i].isNotEmpty) Lesson(id: '$code-${i + 1}', unitIndex: unitIndex, idx: i + 1, words: buckets[i]),
    ];
  }

  Lesson? lessonById(String id) {
    for (final l in lessonsInOrder) {
      if (l.id == id) return l;
    }
    return null;
  }

  List<Word> unitWords(int unitIndex) => [for (final l in units[unitIndex].lessons) ...l.words];

  List<Word> distractors(Word target, int n, {Set<String> exclude = const {}}) {
    final pool = unitWords(target.unitIndex)
        .where(
          (w) => w.key != target.key && !exclude.contains(w.key) && w.phrase == target.phrase && w.tr != target.tr && w.en != target.en,
        )
        .toList();
    for (var d = 1; pool.length < n * 3 && d < units.length; d++) {
      for (final ui in [target.unitIndex - d, target.unitIndex + d]) {
        if (ui < 0 || ui >= units.length) continue;
        pool.addAll(unitWords(ui).where((w) => w.phrase == target.phrase && w.tr != target.tr && !exclude.contains(w.key)));
      }
    }
    final seenTr = <String>{target.tr};
    return [
      for (final w in shuffled(pool))
        if (seenTr.add(w.tr)) w,
    ].take(n).toList();
  }

  List<Word> byKeys(Iterable<String> keys) => [
    for (final k in keys)
      if (byKey[k] != null) byKey[k]!,
  ];
}
