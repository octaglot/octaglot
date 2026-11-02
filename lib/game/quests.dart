import 'dart:math';

import 'rand.dart';

enum QuestKind { xp, lessons, combo, storm, review, memory }

class Quest {
  const Quest({required this.idx, required this.kind, required this.target, this.progress = 0, this.claimed = false});
  final int idx;
  final QuestKind kind;
  final int target;
  final int progress;
  final bool claimed;

  bool get complete => progress >= target;

  Quest copyWith({int? progress, bool? claimed}) =>
      Quest(idx: idx, kind: kind, target: target, progress: progress ?? this.progress, claimed: claimed ?? this.claimed);
}

const questCount = 3;
const questReward = 10;
const questBonus = 15;

const _targets = {
  QuestKind.xp: [30, 50, 80],
  QuestKind.lessons: [2, 3, 4],
  QuestKind.combo: [5, 8, 12],
  QuestKind.storm: [200, 350, 500],
  QuestKind.review: [10, 15, 20],
  QuestKind.memory: [1, 2, 3],
};

const _peak = {QuestKind.combo, QuestKind.storm};

List<Quest> dailyQuests(String day) {
  final rnd = mulberry32(fnv1a(day));
  final bag = [...QuestKind.values];
  return [
    for (var i = 0; i < questCount; i++)
      () {
        final kind = bag.removeAt((rnd() * bag.length).floor());
        final options = _targets[kind]!;
        return Quest(idx: i, kind: kind, target: options[(rnd() * options.length).floor()]);
      }(),
  ];
}

int nextProgress(QuestKind kind, int current, int n, int target) => min(target, _peak.contains(kind) ? max(current, n) : current + n);

String questText(QuestKind kind, int target) => switch (kind) {
  QuestKind.xp => '$target XP kazan',
  QuestKind.lessons => '$target ders bitir',
  QuestKind.combo => 'Bir derste üst üste $target doğru',
  QuestKind.storm => 'Fırtınada $target puan',
  QuestKind.review => '$target kelime tekrar et',
  QuestKind.memory => target == 1 ? 'Bir hafıza oyunu bitir' : '$target hafıza oyunu bitir',
};
