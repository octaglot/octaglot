import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../audio/audio.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/grading.dart';
import '../game/memory.dart';
import '../game/store.dart';
import '../widgets/logo.dart';
import '../widgets/mascot.dart';

class MemoryScreen extends ConsumerStatefulWidget {
  const MemoryScreen({super.key});

  @override
  ConsumerState<MemoryScreen> createState() => _MemoryScreenState();
}

class _MemoryScreenState extends ConsumerState<MemoryScreen> {
  late final int _bestAtStart = ref.read(gameProvider).memoryBest;
  late final int _runsAtStart = ref.read(gameProvider).memoryRunsToday;
  List<MemoryCard> _deck = [];
  final Set<int> _open = {};
  final Set<int> _solved = {};
  final Set<String> _missed = {};
  int? _first;
  bool _busy = false;
  int _moves = 0;
  int _elapsed = 0;
  Timer? _timer;
  bool _over = false;
  int _earned = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final game = ref.read(gameProvider.notifier);
    final due = (await game.dueWords(100)).map((w) => w.key).toSet();
    final words = game.learnedWords().where((w) => w.en.length <= 20 && w.tr.length <= 24).toList();
    if (!mounted) return;
    setState(() => _deck = memoryDeck(words, due));
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && !_over) setState(() => _elapsed++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _tap(int i) async {
    if (_busy || _over || _open.contains(i) || _solved.contains(i)) return;
    final audio = ref.read(audioProvider);
    final card = _deck[i];
    audio.play(Sfx.flip);
    if (card.english) audio.say(card.word.en);
    setState(() => _open.add(i));
    if (_first == null) {
      _first = i;
      return;
    }
    final a = _first!;
    _first = null;
    _moves++;
    final game = ref.read(gameProvider.notifier);
    if (_deck[a].word.key == card.word.key) {
      audio.play(Sfx.correct);
      HapticFeedback.lightImpact();
      unawaited(game.reviewWord(card.word.key, !_missed.contains(card.word.key)));
      setState(() {
        _solved.addAll([a, i]);
        _open.removeAll([a, i]);
      });
      if (_solved.length == _deck.length) _finish();
    } else {
      _busy = true;
      _missed.addAll([_deck[a].word.key, card.word.key]);
      await Future.delayed(const Duration(milliseconds: 950));
      if (!mounted) return;
      setState(() {
        _open.removeAll([a, i]);
        _busy = false;
      });
    }
  }

  Future<void> _finish() async {
    _over = true;
    _timer?.cancel();
    ref.read(audioProvider).play(Sfx.levelUp);
    final xp = await ref.read(gameProvider.notifier).recordMemory(pairs: _deck.length ~/ 2, moves: _moves);
    await Future.delayed(const Duration(milliseconds: 700));
    if (mounted) setState(() => _earned = xp);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    if (_deck.isEmpty) return Scaffold(backgroundColor: c.surface);

    if (_over && _solved.length == _deck.length) {
      final pairs = _deck.length ~/ 2;
      final record = _bestAtStart == 0 || _moves < _bestAtStart;
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                Mascot(mood: record ? Mood.cheer : Mood.happy, size: 140),
                const SizedBox(height: 14),
                Text(record ? 'Yeni rekor!' : 'Hepsini buldun', style: ts(T.title, w: FontWeight.w900)),
                Text(
                  '$_moves hamle',
                  style: ts(44, w: FontWeight.w900, color: c.brandText),
                ),
                Text(
                  '$pairs çift · ${_elapsed ~/ 60}:${(_elapsed % 60).toString().padLeft(2, '0')} · Rekor ${_bestAtStart == 0 ? _moves : min(_bestAtStart, _moves)} hamle',
                  style: ts(T.body, w: FontWeight.w700, color: c.ink2),
                ),
                const SizedBox(height: 4),
                Text(
                  _earned > 0
                      ? '+$_earned XP'
                      : (_runsAtStart >= memoryXpRuns ? 'Bugünün XP hakkı doldu — rekor için oynamaya devam.' : ''),
                  textAlign: TextAlign.center,
                  style: ts(T.body, w: FontWeight.w800, color: c.goldText),
                ),
                const Spacer(),
                PushButton(
                  label: 'Yeniden oyna',
                  full: true,
                  large: true,
                  onTap: () {
                    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MemoryScreen()));
                  },
                ),
                const SizedBox(height: 12),
                PushButton(label: 'Bitir', kind: BtnKind.ghost, full: true, onTap: () => Navigator.pop(context)),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  RoundIconButton(icon: OI.close, label: 'Oyundan çık', onTap: () => Navigator.pop(context)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: PillBar(value: _solved.length / _deck.length, color: c.success),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '$_moves hamle',
                    style: ts(T.small, w: FontWeight.w900, color: c.ink2),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 10),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Kartları çevir, İngilizceyi Türkçesiyle eşleştir', style: ts(T.body, w: FontWeight.w800)),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
                child: LayoutBuilder(
                  builder: (_, box) {
                    const cols = 3;
                    final rows = (_deck.length / cols).ceil();
                    final w = (box.maxWidth - (cols - 1) * 10) / cols;
                    final h = min(w * 1.15, (box.maxHeight - (rows - 1) * 10) / rows);
                    return Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        for (var i = 0; i < _deck.length; i++)
                          SizedBox(
                            width: w,
                            height: h,
                            child: _FlipCard(
                              card: _deck[i],
                              open: _open.contains(i) || _solved.contains(i),
                              solved: _solved.contains(i),
                              onTap: () => _tap(i),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FlipCard extends StatelessWidget {
  const _FlipCard({required this.card, required this.open, required this.solved, required this.onTap});
  final MemoryCard card;
  final bool open;
  final bool solved;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return GestureDetector(
      onTap: onTap,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: open ? 1 : 0),
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeInOutCubic,
        builder: (_, v, _) {
          final front = v > .5;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, .0015)
              ..rotateY(v * pi),
            child: Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()..rotateY(front ? pi : 0),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.all(8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: front ? (solved ? c.successWash : (card.english ? c.surface : c.brandWash)) : c.brandStrong,
                  borderRadius: BorderRadius.circular(R.lg),
                  border: Border(
                    top: BorderSide(color: front ? (solved ? c.success : c.line) : c.brandStrong, width: 2),
                    left: BorderSide(color: front ? (solved ? c.success : c.line) : c.brandStrong, width: 2),
                    right: BorderSide(color: front ? (solved ? c.success : c.line) : c.brandStrong, width: 2),
                    bottom: BorderSide(color: front ? (solved ? c.success : c.line) : c.brandDark, width: 5),
                  ),
                ),
                child: front
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            card.english ? 'EN' : 'TR',
                            style: ts(T.tiny - 2, w: FontWeight.w900, color: c.muted, spacing: 1),
                          ),
                          const SizedBox(height: 4),
                          Flexible(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 110),
                                child: Text(
                                  card.english ? card.word.en : displayTurkish(card.word.tr),
                                  textAlign: TextAlign.center,
                                  maxLines: 3,
                                  style: ts(T.small + 1, w: FontWeight.w800, color: solved ? c.successText : c.ink),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    : Opacity(opacity: .9, child: Mark(width: 38, color: Colors.white.withValues(alpha: .85))),
              ),
            ),
          );
        },
      ),
    );
  }
}
