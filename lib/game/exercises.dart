import '../content/content.dart';
import 'grading.dart';
import 'rand.dart';

enum ExKind { flashcard, choice, listen, match, typeEn, listenType, build, order }

enum LessonMode { normal, legendary, review }

const legendaryKinds = {ExKind.typeEn, ExKind.listenType, ExKind.build, ExKind.order};

class Exercise {
  const Exercise._(this.kind, {this.word, this.options = const [], this.en2tr = true, this.pairs = const [], this.bank = const []});

  factory Exercise.flashcard(Word w) => Exercise._(ExKind.flashcard, word: w);
  factory Exercise.choice(Word w, List<Word> options, bool en2tr) => Exercise._(ExKind.choice, word: w, options: options, en2tr: en2tr);
  factory Exercise.listen(Word w, List<Word> options) => Exercise._(ExKind.listen, word: w, options: options);
  factory Exercise.match(List<Word> pairs) => Exercise._(ExKind.match, pairs: pairs);
  factory Exercise.typeEn(Word w) => Exercise._(ExKind.typeEn, word: w);
  factory Exercise.listenType(Word w) => Exercise._(ExKind.listenType, word: w);
  factory Exercise.build(Word w, List<String> bank) => Exercise._(ExKind.build, word: w, bank: bank);
  factory Exercise.order(Word w) => Exercise._(ExKind.order, word: w, bank: shuffled(phraseTokens(w.en)));

  final ExKind kind;
  final Word? word;
  final List<Word> options;
  final bool en2tr;
  final List<Word> pairs;
  final List<String> bank;

  String get correctText => switch (kind) {
    ExKind.choice => en2tr ? displayTurkish(word!.tr) : word!.en,
    ExKind.listen => '${word!.en} · ${displayTurkish(word!.tr)}',
    ExKind.typeEn || ExKind.listenType => word!.en,
    ExKind.build || ExKind.order => spokenEnglish(word!.en),
    _ => '',
  };
}

class LessonPlan {
  const LessonPlan(this.exercises, this.words);
  final List<Exercise> exercises;
  final List<Word> words;
}

List<Word> _optionsFor(Content content, Word w) => shuffled([w, ...content.distractors(w, 3)]);

List<String> _bankFor(Content content, Word phrase) {
  final answer = phraseTokens(phrase.en);
  final lower = answer.map(normalize).toSet();
  final pool = <String>{
    for (final other in content.unitWords(phrase.unitIndex).where((x) => x.phrase && x.key != phrase.key)) ...phraseTokens(other.en),
  }.where((t) => !lower.contains(normalize(t))).toList();
  final extras = shuffled(pool).take(answer.length <= 4 ? 3 : 2);
  return shuffled([...answer, ...extras]);
}

bool _buildable(Word w) {
  final n = phraseTokens(w.en).length;
  return n >= 2 && n <= 9;
}

List<Word> _matchSet(Content content, List<Word> words) {
  final set = <Word>[];
  final en = <String>{};
  final tr = <String>{};
  void tryAdd(Word w) {
    if (set.length >= 5 || w.phrase) return;
    if (en.add(w.en.toLowerCase()) && tr.add(w.tr.toLowerCase())) set.add(w);
  }

  for (final w in shuffled(words)) {
    tryAdd(w);
  }
  if (set.length < 5 && words.isNotEmpty) {
    for (final d in shuffled(content.unitWords(words.first.unitIndex))) {
      tryAdd(d);
    }
  }
  return set;
}

LessonPlan buildLesson(Content content, Lesson lesson, {required bool firstTime, int count = 16}) {
  final words = lesson.words.where((w) => !w.phrase).toList();
  final phrases = lesson.words.where((w) => w.phrase).toList();
  final ex = <Exercise>[];

  final cardWords = shuffled(words).take(firstTime ? 5 : 2).toList();
  if (words.isEmpty) cardWords.addAll(shuffled(phrases).take(firstTime ? 3 : 1));
  for (final w in cardWords) {
    ex.add(Exercise.flashcard(w));
  }

  for (final w in shuffled(words).take(6)) {
    ex.add(Exercise.choice(w, _optionsFor(content, w), coin()));
  }

  final pairs = _matchSet(content, words);
  if (pairs.length >= 4) ex.add(Exercise.match(pairs));

  for (final w in shuffled(words).take(2)) {
    ex.add(Exercise.listen(w, _optionsFor(content, w)));
  }
  for (final w in shuffled(words.where((w) => w.en.length <= 24)).take(2)) {
    ex.add(Exercise.typeEn(w));
  }

  for (final p in shuffled(phrases).take(3)) {
    if (_buildable(p)) {
      ex.add(coin() ? Exercise.build(p, _bankFor(content, p)) : Exercise.order(p));
    } else {
      ex.add(Exercise.choice(p, _optionsFor(content, p), coin()));
    }
  }

  final cards = ex.where((e) => e.kind == ExKind.flashcard).toList();
  final rest = shuffled(ex.where((e) => e.kind != ExKind.flashcard));
  return LessonPlan([...cards, ...rest].take(count).toList(), lesson.words);
}

LessonPlan buildReview(Content content, List<Word> words, {int count = 12}) {
  if (words.length < 4) return LessonPlan(const [], words);
  final ex = <Exercise>[];
  for (final w in shuffled(words)) {
    final r = randInt(3);
    if (r == 0 && !w.phrase && w.en.length <= 24) {
      ex.add(Exercise.typeEn(w));
    } else if (r == 1 && !w.phrase) {
      ex.add(Exercise.listen(w, _optionsFor(content, w)));
    } else {
      ex.add(Exercise.choice(w, _optionsFor(content, w), coin()));
    }
  }
  final pairs = _matchSet(content, words);
  if (pairs.length >= 5) ex.add(Exercise.match(pairs));
  return LessonPlan(shuffled(ex).take(count).toList(), words);
}

LessonPlan buildLegendary(Content content, int unitIndex, {int count = 16}) {
  final all = content.unitWords(unitIndex);
  final words = all.where((w) => !w.phrase && w.en.length <= 24).toList();
  final phrases = all.where((w) => w.phrase && _buildable(w)).toList();
  final ex = <Exercise>[];
  for (final w in shuffled(words).take(8)) {
    ex.add(Exercise.typeEn(w));
  }
  for (final w in shuffled(words).take(4)) {
    ex.add(Exercise.listenType(w));
  }
  for (final p in shuffled(phrases).take(4)) {
    ex.add(coin() ? Exercise.order(p) : Exercise.build(p, _bankFor(content, p)));
  }
  final used = ex.map((e) => e.word!.key).toSet();
  for (final w in shuffled(words.where((w) => !used.contains(w.key)))) {
    if (ex.length >= count) break;
    ex.add(Exercise.typeEn(w));
  }
  return LessonPlan(shuffled(ex.where((e) => legendaryKinds.contains(e.kind))).take(count).toList(), all);
}
