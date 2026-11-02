import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../audio/audio.dart';
import '../content/content.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/grading.dart';
import '../game/rand.dart';
import '../game/storm.dart';
import '../game/store.dart';
import '../widgets/mascot.dart';

class StormScreen extends ConsumerStatefulWidget {
  const StormScreen({super.key});

  @override
  ConsumerState<StormScreen> createState() => _StormScreenState();
}

enum _Phase { loading, play, over }

class _StormScreenState extends ConsumerState<StormScreen> {
  late final int _bestAtStart = ref.read(gameProvider).stormBest;
  late final int _runsAtStart = ref.read(gameProvider).stormRunsToday;
  _Phase _phase = _Phase.loading;
  List<Word> _pool = [];
  final Set<String> _seen = {};
  final Map<String, Word> _stage = {};
  List<String> _left = [];
  List<String> _right = [];
  (bool, String)? _sel;
  String? _miss;
  int _score = 0;
  int _combo = 0;
  int _bestCombo = 0;
  int _seconds = stormSeconds;
  int _earned = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final game = ref.read(gameProvider.notifier);
    final words = game.learnedWords().where((w) => !w.phrase && w.en.length <= 22 && w.tr.length <= 26).toList();
    final due = (await game.dueWords(200)).map((w) => w.key).toSet();
    if (!mounted) return;
    _pool = stormPool(words, due);
    final first = stormDraw(_pool, const [], _seen, stormSlots);
    for (final w in first) {
      _seen.add(w.key);
      _stage[w.key] = w;
    }
    setState(() {
      _left = shuffled(first.map((w) => w.key));
      _right = shuffled(first.map((w) => w.key));
      _phase = _Phase.play;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _seconds = max(0, _seconds - 1));
      if (_seconds == 0) _finish();
    });
  }

  Future<void> _finish() async {
    if (_phase == _Phase.over) return;
    _timer?.cancel();
    setState(() => _phase = _Phase.over);
    ref.read(audioProvider).play(Sfx.complete);
    final xp = await ref.read(gameProvider.notifier).recordStorm(_score);
    if (mounted) setState(() => _earned = xp);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  List<String> _insertRandom(List<String> ids, String id) {
    final at = randInt(ids.length + 1);
    return [...ids.sublist(0, at), id, ...ids.sublist(at)];
  }

  void _replace(String key) {
    final next = stormDraw(_pool, _stage.keys, _seen, 1);
    _stage.remove(key);
    _left = _left.where((x) => x != key).toList();
    _right = _right.where((x) => x != key).toList();
    if (next.isNotEmpty) {
      final n = next.first;
      _seen.add(n.key);
      _stage[n.key] = n;
      _left = _insertRandom(_left, n.key);
      _right = _insertRandom(_right, n.key);
    }
  }

  void _tap(bool en, String key) {
    if (_phase != _Phase.play) return;
    final audio = ref.read(audioProvider);
    final game = ref.read(gameProvider.notifier);
    if (_sel == null || _sel!.$1 == en) {
      audio.play(Sfx.tap);
      return setState(() => _sel = (en, key));
    }
    if (_sel!.$2 == key) {
      audio.play(Sfx.correct);
      HapticFeedback.lightImpact();
      unawaited(game.reviewWord(key, true));
      setState(() {
        _combo++;
        _bestCombo = max(_bestCombo, _combo);
        _score += stormPoints(_combo);
        _sel = null;
        _replace(key);
      });
    } else {
      audio.play(Sfx.wrong);
      HapticFeedback.mediumImpact();
      unawaited(game.reviewWord(_sel!.$2, false));
      setState(() {
        _combo = 0;
        _seconds = max(0, _seconds - stormPenalty);
        _miss = key;
        _sel = null;
      });
      Future.delayed(const Duration(milliseconds: 400), () {
        if (mounted) setState(() => _miss = null);
      });
      if (_seconds == 0) _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (_phase == _Phase.loading) return Scaffold(backgroundColor: c.surface);
    if (_phase == _Phase.over) {
      final record = _score > _bestAtStart;
      final note = _earned > 0
          ? '+$_earned XP'
          : _runsAtStart >= stormXpRuns
          ? 'Bugünün XP hakkı doldu — puan için oynamaya devam.'
          : 'XP kazanmak için en az 25 puan gerekiyor.';
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                Mascot(mood: record ? Mood.cheer : Mood.idle, size: 140),
                const SizedBox(height: 14),
                Text(record ? 'Yeni rekor!' : 'Süre doldu', style: ts(T.title, w: FontWeight.w900)),
                Text(
                  '$_score',
                  style: ts(52, w: FontWeight.w900, color: c.brandText),
                ),
                Text(
                  'En uzun seri $_bestCombo · Rekor ${max(_bestAtStart, _score)}',
                  style: ts(T.body, w: FontWeight.w700, color: c.ink2),
                ),
                const SizedBox(height: 4),
                Text(
                  note,
                  textAlign: TextAlign.center,
                  style: ts(T.body, w: FontWeight.w700, color: c.ink2),
                ),
                const Spacer(),
                PushButton(label: 'Bitir', full: true, large: true, onTap: () => Navigator.pop(context)),
              ],
            ),
          ),
        ),
      );
    }

    TileState state(bool en, String key) {
      if (_miss == key) return TileState.wrong;
      if (_sel != null && _sel!.$1 == en && _sel!.$2 == key) return TileState.on;
      return TileState.idle;
    }

    Widget col(List<String> keys, bool en) => Column(
      children: [
        for (final k in keys)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OptionTile(
              key: ValueKey('$en$k'),
              state: state(en, k),
              minHeight: 62,
              align: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              onTap: () => _tap(en, k),
              child: Text(
                en ? _stage[k]!.en : displayTurkish(_stage[k]!.tr),
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: ts(T.small + 1, w: FontWeight.w700),
              ),
            ),
          ),
      ],
    );

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  RoundIconButton(
                    icon: OI.close,
                    label: 'Fırtınadan çık',
                    onTap: () {
                      _timer?.cancel();
                      Navigator.pop(context);
                    },
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: PillBar(
                      value: _seconds / stormSeconds,
                      color: _seconds <= 10 ? c.danger : c.brand,
                      duration: const Duration(milliseconds: 300),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 30,
                    child: Text(
                      '$_seconds',
                      textAlign: TextAlign.right,
                      style: ts(T.body, w: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        OIcon(OI.bolt, size: 22, color: c.brand),
                        const SizedBox(width: 6),
                        Text('$_score', style: ts(T.lead, w: FontWeight.w900)),
                        const SizedBox(width: 14),
                        AnimatedOpacity(
                          opacity: _combo >= 3 ? 1 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: Row(
                            children: [
                              OIcon(OI.flame, size: 16, color: c.accent),
                              const SizedBox(width: 4),
                              Text(
                                '$_combo SERİ',
                                style: ts(T.small, w: FontWeight.w900, color: c.accent),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: col(_left, true)),
                        const SizedBox(width: 10),
                        Expanded(child: col(_right, false)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
