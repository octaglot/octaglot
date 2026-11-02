import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../content/content.dart';
import '../data/user_db.dart';
import 'memory.dart';
import 'quests.dart';
import 'storm.dart';

const maxHearts = 5;
const heartRefillMinutes = 30;
const refillCost = 50;
const legendaryCost = 30;
const legendaryXp = 60;

String dayKey([DateTime? d]) {
  final x = d ?? DateTime.now();
  return '${x.year}-${x.month.toString().padLeft(2, '0')}-${x.day.toString().padLeft(2, '0')}';
}

int daysBetween(String a, String b) {
  DateTime parse(String s) {
    final p = s.split('-').map(int.parse).toList();
    return DateTime.utc(p[0], p[1], p[2]);
  }

  return parse(b).difference(parse(a)).inDays;
}

class GameState {
  const GameState({
    required this.profile,
    required this.done,
    required this.todayXp,
    required this.dueCount,
    required this.stormBest,
    required this.stormRunsToday,
    required this.memoryBest,
    required this.memoryRunsToday,
    required this.quests,
    required this.legendary,
  });

  final Profile profile;
  final Map<String, LessonRecord> done;
  final int todayXp;
  final int dueCount;
  final int stormBest;
  final int stormRunsToday;
  final int memoryBest;
  final int memoryRunsToday;
  final List<Quest> quests;
  final Set<String> legendary;

  GameState copyWith({
    Profile? profile,
    Map<String, LessonRecord>? done,
    int? todayXp,
    int? dueCount,
    int? stormBest,
    int? stormRunsToday,
    int? memoryBest,
    int? memoryRunsToday,
    List<Quest>? quests,
    Set<String>? legendary,
  }) => GameState(
    profile: profile ?? this.profile,
    done: done ?? this.done,
    todayXp: todayXp ?? this.todayXp,
    dueCount: dueCount ?? this.dueCount,
    stormBest: stormBest ?? this.stormBest,
    stormRunsToday: stormRunsToday ?? this.stormRunsToday,
    memoryBest: memoryBest ?? this.memoryBest,
    memoryRunsToday: memoryRunsToday ?? this.memoryRunsToday,
    quests: quests ?? this.quests,
    legendary: legendary ?? this.legendary,
  );
}

final contentProvider = Provider<Content>((ref) => throw UnimplementedError());
final userDbProvider = Provider<UserDb>((ref) => throw UnimplementedError());
final initialGameProvider = Provider<GameState>((ref) => throw UnimplementedError());

final gameProvider = NotifierProvider<GameNotifier, GameState>(GameNotifier.new);

Future<GameState> loadGame(UserDb db) async {
  final today = dayKey();
  var p = await db.profile();
  if (p.lastActive != null && daysBetween(p.lastActive!, today) > 1) {
    p = p.copyWith(streak: 0);
  }
  if (p.hearts < maxHearts && p.heartsRefilledAt != null) {
    final gained = DateTime.now().difference(p.heartsRefilledAt!).inMinutes ~/ heartRefillMinutes;
    if (gained > 0) {
      final hearts = min(maxHearts, p.hearts + gained);
      p = p.copyWith(
        hearts: hearts,
        heartsRefilledAt: () => hearts >= maxHearts ? null : p.heartsRefilledAt!.add(Duration(minutes: gained * heartRefillMinutes)),
      );
    }
  }
  await db.saveProfile(p);
  return GameState(
    profile: p,
    done: await db.progress(),
    todayXp: await db.xpOn(today),
    dueCount: await db.dueCount(),
    stormBest: await db.stat('storm_best'),
    stormRunsToday: await db.stat('storm_runs_$today'),
    memoryBest: await db.stat('memory_best'),
    memoryRunsToday: await db.stat('memory_runs_$today'),
    quests: await db.quests(today),
    legendary: await db.legendary(),
  );
}

class GameNotifier extends Notifier<GameState> {
  UserDb get _db => ref.read(userDbProvider);
  Content get _content => ref.read(contentProvider);

  @override
  GameState build() => ref.read(initialGameProvider);

  int get learnedWordCount {
    var n = 0;
    for (final l in _content.lessonsInOrder) {
      if (state.done.containsKey(l.id)) n += l.wordCount;
    }
    return n;
  }

  List<Word> learnedWords() => [
    for (final l in _content.lessonsInOrder)
      if (state.done.containsKey(l.id)) ...l.words,
  ];

  Lesson? get nextLesson {
    for (final l in _content.lessonsInOrder) {
      if (!state.done.containsKey(l.id)) return l;
    }
    return null;
  }

  Future<void> _saveProfile(Profile p) async {
    state = state.copyWith(profile: p);
    await _db.saveProfile(p);
  }

  Future<void> refreshHearts() async {
    final p = state.profile;
    if (p.hearts >= maxHearts || p.heartsRefilledAt == null) return;
    final gained = DateTime.now().difference(p.heartsRefilledAt!).inMinutes ~/ heartRefillMinutes;
    if (gained <= 0) return;
    final hearts = min(maxHearts, p.hearts + gained);
    await _saveProfile(
      p.copyWith(
        hearts: hearts,
        heartsRefilledAt: () => hearts >= maxHearts ? null : p.heartsRefilledAt!.add(Duration(minutes: gained * heartRefillMinutes)),
      ),
    );
  }

  Future<void> addXp(int n) async {
    if (n <= 0) return;
    final today = dayKey();
    final p = state.profile;
    var streak = p.streak;
    if (p.lastActive != today) {
      streak = p.lastActive != null && daysBetween(p.lastActive!, today) == 1 ? p.streak + 1 : 1;
    }
    await _db.logXp(today, n);
    state = state.copyWith(todayXp: state.todayXp + n);
    await _saveProfile(p.copyWith(xp: p.xp + n, streak: streak, lastActive: today));
    await bumpQuest(QuestKind.xp, n);
  }

  Future<void> loseHeart() async {
    final p = state.profile;
    await _saveProfile(p.copyWith(hearts: max(0, p.hearts - 1), heartsRefilledAt: () => p.heartsRefilledAt ?? DateTime.now()));
  }

  Future<bool> refillHearts() async {
    final p = state.profile;
    if (p.gems < refillCost) return false;
    await _saveProfile(p.copyWith(hearts: maxHearts, gems: p.gems - refillCost, heartsRefilledAt: () => null));
    return true;
  }

  Future<void> completeLesson(String lessonId, double accuracy, int xp) async {
    await _db.saveLesson(lessonId, accuracy);
    final prev = state.done[lessonId];
    state = state.copyWith(done: {...state.done, lessonId: LessonRecord(max(prev?.accuracy ?? 0, accuracy), (prev?.times ?? 0) + 1)});
    final bonus = accuracy == 1 ? 3 : 1;
    await _saveProfile(state.profile.copyWith(gems: state.profile.gems + bonus));
    await addXp(xp);
    await refreshDue();
    await bumpQuest(QuestKind.lessons, 1);
  }

  Future<bool> startLegendary() async {
    final p = state.profile;
    if (p.gems < legendaryCost) return false;
    await _saveProfile(p.copyWith(gems: p.gems - legendaryCost));
    return true;
  }

  Future<void> completeLegendary(String lessonId) async {
    await _db.saveLegendary(lessonId);
    state = state.copyWith(legendary: {...state.legendary, lessonId});
    await addXp(legendaryXp);
  }

  Future<void> bumpQuest(QuestKind kind, int n) async {
    if (n <= 0 || state.quests.isEmpty) return;
    final day = dayKey();
    final updated = <Quest>[];
    for (final q in state.quests) {
      if (q.kind != kind || q.complete) {
        updated.add(q);
        continue;
      }
      final progress = nextProgress(kind, q.progress, n, q.target);
      if (progress != q.progress) await _db.saveQuestProgress(day, q.idx, progress);
      updated.add(q.copyWith(progress: progress));
    }
    state = state.copyWith(quests: updated);
  }

  Future<void> claimQuest(int idx) async {
    final q = state.quests.firstWhere((x) => x.idx == idx);
    if (!q.complete || q.claimed) return;
    final rest = [for (final x in state.quests) x.idx == idx ? x.copyWith(claimed: true) : x];
    final all = rest.every((x) => x.claimed);
    await _db.saveQuestClaim(dayKey(), idx);
    state = state.copyWith(quests: rest);
    await _saveProfile(state.profile.copyWith(gems: state.profile.gems + questReward + (all ? questBonus : 0)));
  }

  Future<int> recordStorm(int score) async {
    final today = dayKey();
    final runs = state.stormRunsToday;
    final xp = stormXp(score, runs);
    final best = max(state.stormBest, score);
    await _db.setStat('storm_best', best);
    await _db.setStat('storm_runs_$today', runs + 1);
    state = state.copyWith(stormBest: best, stormRunsToday: runs + 1);
    await bumpQuest(QuestKind.storm, score);
    await addXp(xp);
    return xp;
  }

  Future<int> recordMemory({required int pairs, required int moves}) async {
    final today = dayKey();
    final runs = state.memoryRunsToday;
    final xp = memoryXp(pairs: pairs, moves: moves, runsToday: runs);
    final best = state.memoryBest == 0 ? moves : min(state.memoryBest, moves);
    await _db.setStat('memory_best', best);
    await _db.setStat('memory_runs_$today', runs + 1);
    state = state.copyWith(memoryBest: best, memoryRunsToday: runs + 1);
    await bumpQuest(QuestKind.memory, 1);
    await addXp(xp);
    return xp;
  }

  Future<void> reviewWord(String key, bool correct) async {
    await _db.review(key, correct);
    await bumpQuest(QuestKind.review, 1);
  }

  Future<void> reload() async => state = await loadGame(_db);

  Future<void> refreshDue() async => state = state.copyWith(dueCount: await _db.dueCount());

  Future<List<Word>> dueWords(int limit) async => _content.byKeys(await _db.dueKeys(limit));

  Future<List<Word>> weakWords(int limit) async => _content.byKeys(await _db.weakKeys(limit));

  Future<void> setName(String name) => _saveProfile(state.profile.copyWith(name: name));

  Future<void> setDailyGoal(int goal) => _saveProfile(state.profile.copyWith(dailyGoal: goal));
}
