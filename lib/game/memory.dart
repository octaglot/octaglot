import 'dart:math';

import '../content/content.dart';
import 'rand.dart';

const memoryPairs = 6;
const memoryUnlockWords = 6;
const memoryXpRuns = 3;
const memoryBaseXp = 15;

class MemoryCard {
  const MemoryCard({required this.word, required this.english});
  final Word word;
  final bool english;

  String get text => english ? word.en : word.tr;
}

List<MemoryCard> memoryDeck(List<Word> words, Set<String> due, {int pairs = memoryPairs}) {
  final pool = [
    ...shuffled(words.where((w) => due.contains(w.key) && !w.phrase)),
    ...shuffled(words.where((w) => !due.contains(w.key) && !w.phrase)),
  ];
  final chosen = <Word>[];
  final seenEn = <String>{};
  final seenTr = <String>{};
  for (final w in pool) {
    if (chosen.length >= pairs) break;
    if (seenEn.add(w.en.toLowerCase()) && seenTr.add(w.tr.toLowerCase())) chosen.add(w);
  }
  return shuffled([
    for (final w in chosen) ...[MemoryCard(word: w, english: true), MemoryCard(word: w, english: false)],
  ]);
}

int memoryXp({required int pairs, required int moves, required int runsToday}) {
  if (runsToday >= memoryXpRuns) return 0;
  final waste = max(0, moves - pairs);
  return max(5, memoryBaseXp - waste);
}
