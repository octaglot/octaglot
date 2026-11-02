import 'dart:math';

import '../content/content.dart';
import 'rand.dart';

const stormSeconds = 60;
const stormSlots = 5;
const stormPenalty = 2;
const stormXpRuns = 3;
const stormMaxXp = 40;
const stormComboCap = 5;
const stormUnlockWords = 20;

List<Word> stormPool(List<Word> words, Set<String> due) => [
  ...shuffled(words.where((w) => due.contains(w.key))),
  ...shuffled(words.where((w) => !due.contains(w.key))),
];

List<Word> stormDraw(List<Word> pool, Iterable<String> onStage, Set<String> seen, int n) {
  final stage = onStage.toSet();
  List<Word> free() => pool.where((w) => !stage.contains(w.key) && !seen.contains(w.key)).toList();
  var candidates = free();
  if (candidates.length < n) {
    seen.clear();
    candidates = free();
  }
  return candidates.take(n).toList();
}

int stormPoints(int combo) => 10 * min(stormComboCap, max(1, combo));

int stormXp(int score, int runsToday) => runsToday >= stormXpRuns ? 0 : min(stormMaxXp, score ~/ 25);
