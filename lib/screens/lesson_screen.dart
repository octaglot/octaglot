import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../audio/audio.dart';
import '../data/settings.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/exercises.dart';
import '../game/grading.dart';
import '../game/store.dart';
import '../widgets/mascot.dart';
import 'exercise_views.dart';

const legendaryMistakes = 3;

class LessonResult {
  const LessonResult({
    required this.xp,
    required this.accuracy,
    required this.correct,
    required this.total,
    required this.failed,
    required this.bestCombo,
    required this.mode,
  });
  final int xp;
  final double accuracy;
  final int correct;
  final int total;
  final bool failed;
  final int bestCombo;
  final LessonMode mode;
}

enum Verdict { none, right, typo, wrong }

class LessonScreen extends ConsumerStatefulWidget {
  const LessonScreen({super.key, required this.title, required this.exercises, required this.mode});
  final String title;
  final List<Exercise> exercises;
  final LessonMode mode;

  @override
  ConsumerState<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends ConsumerState<LessonScreen> {
  int _i = 0;
  Object? _value;
  Verdict _verdict = Verdict.none;
  int _right = 0;
  int _combo = 0;
  int _bestCombo = 0;
  int _mistakes = 0;
  bool _ending = false;

  bool get _legendary => widget.mode == LessonMode.legendary;
  Exercise get _ex => widget.exercises[_i];

  bool get _canCheck {
    if (_verdict != Verdict.none) return true;
    if (_ex.kind == ExKind.flashcard) return true;
    final v = _value;
    if (v is Iterable) return v.isNotEmpty;
    if (v is String) return v.trim().isNotEmpty;
    return v != null;
  }

  AppAudio get _audio => ref.read(audioProvider);

  (Verdict, String?) _grade() {
    final ex = _ex;
    switch (ex.kind) {
      case ExKind.flashcard:
        return (Verdict.right, null);
      case ExKind.choice:
      case ExKind.listen:
        return (_value == ex.word!.key ? Verdict.right : Verdict.wrong, null);
      case ExKind.match:
        return (_value == 'done' ? Verdict.right : Verdict.wrong, null);
      case ExKind.typeEn:
      case ExKind.listenType:
        final v = checkEnglish(_value as String? ?? '', ex.word!.en);
        return switch (v) {
          TypeVerdict.exact => (Verdict.right, null),
          TypeVerdict.typo => (Verdict.typo, ex.word!.en),
          TypeVerdict.wrong => (Verdict.wrong, null),
        };
      case ExKind.build:
      case ExKind.order:
        return (sameTokens(_value.tokens, ex.word!.en) ? Verdict.right : Verdict.wrong, null);
    }
  }

  Future<void> _check() async {
    if (_verdict != Verdict.none) return _next();
    final ex = _ex;
    if (ex.kind == ExKind.flashcard) {
      setState(() {
        _verdict = Verdict.right;
        _right++;
      });
      return _next();
    }
    final (v, _) = _grade();
    final ok = v != Verdict.wrong;
    final game = ref.read(gameProvider.notifier);
    if (ex.word != null) unawaited(game.reviewWord(ex.word!.key, ok));
    if (ok) {
      _audio.play(Sfx.correct);
      HapticFeedback.lightImpact();
      setState(() {
        _right++;
        _combo++;
        if (_combo > _bestCombo) _bestCombo = _combo;
        _verdict = v;
      });
    } else {
      _audio.play(Sfx.wrong);
      HapticFeedback.mediumImpact();
      setState(() {
        _combo = 0;
        _verdict = Verdict.wrong;
        if (_legendary) _mistakes++;
      });
      _maybeFail();
    }
    if (ex.word != null && ex.kind != ExKind.match && ref.read(settingsProvider).autoSpeak) {
      if (ex.kind == ExKind.typeEn || ex.kind == ExKind.build || ex.kind == ExKind.order || ex.kind == ExKind.choice) {
        unawaited(_audio.say(ex.word!.en));
      }
    }
  }

  void _maybeFail() {
    final out = _legendary && _mistakes >= legendaryMistakes;
    if (!out || _ending) return;
    _ending = true;
    Future.delayed(const Duration(milliseconds: 1400), () {
      if (!mounted) return;
      Navigator.of(context).pop(
        LessonResult(
          xp: 0,
          accuracy: _right / widget.exercises.length,
          correct: _right,
          total: widget.exercises.length,
          failed: true,
          bestCombo: _bestCombo,
          mode: widget.mode,
        ),
      );
    });
  }

  void _next() {
    if (_ending) return;
    if (_i + 1 >= widget.exercises.length) {
      final total = widget.exercises.length;
      final accuracy = _right / total;
      final xp = _legendary ? legendaryXp : (10 + accuracy * 10).round();
      _audio.play(Sfx.complete);
      _ending = true;
      Navigator.of(context).pop(
        LessonResult(xp: xp, accuracy: accuracy, correct: _right, total: total, failed: false, bestCombo: _bestCombo, mode: widget.mode),
      );
      return;
    }
    setState(() {
      _i++;
      _value = null;
      _verdict = Verdict.none;
    });
  }

  Future<void> _quit() async {
    final c = context.c;
    final leave = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: c.surface,
      isScrollControlled: true,
      showDragHandle: false,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(R.xl))),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Mascot(mood: Mood.sad, size: 90),
                const SizedBox(height: 12),
                Text('Dersi bırakıyor musun?', style: ts(T.lead, w: FontWeight.w900)),
                const SizedBox(height: 6),
                Text(
                  'Bu turdaki ilerlemen kaydedilmez.',
                  style: ts(T.small, w: FontWeight.w700, color: c.ink2),
                ),
                const SizedBox(height: 20),
                PushButton(label: 'Devam et', full: true, onTap: () => Navigator.pop(ctx, false)),
                const SizedBox(height: 10),
                PushButton(label: 'Çık', kind: BtnKind.ghost, full: true, onTap: () => Navigator.pop(ctx, true)),
              ],
            ),
          ),
        ),
      ),
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final ex = _ex;
    final progress = _i / widget.exercises.length;
    final locked = _verdict != Verdict.none;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _quit();
      },
      child: Scaffold(
        backgroundColor: c.surface,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    RoundIconButton(icon: OI.close, onTap: _quit, label: 'Dersten çık'),
                    const SizedBox(width: 12),
                    Expanded(child: PillBar(value: progress)),
                    const SizedBox(width: 12),
                    if (_legendary)
                      Container(
                        padding: const EdgeInsets.fromLTRB(8, 5, 12, 5),
                        decoration: BoxDecoration(color: c.goldWash, borderRadius: BorderRadius.circular(999)),
                        child: Row(
                          children: [
                            OIcon(OI.crown, size: 20, color: c.gold),
                            const SizedBox(width: 4),
                            Text(
                              '${legendaryMistakes - _mistakes}',
                              style: ts(T.body, w: FontWeight.w900, color: c.goldText),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              widget.title.toLocaleUpperCaseTr(),
                              overflow: TextOverflow.ellipsis,
                              style: ts(T.tiny, w: FontWeight.w800, color: c.muted, spacing: 1),
                            ),
                          ),
                          if (_combo >= 3) ...[
                            const SizedBox(width: 10),
                            OIcon(OI.flame, size: 14, color: c.accent),
                            const SizedBox(width: 3),
                            Text(
                              '$_combo SERİ',
                              style: ts(T.tiny, w: FontWeight.w900, color: c.accent),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 16),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 220),
                        transitionBuilder: (child, a) => FadeTransition(
                          opacity: a,
                          child: SlideTransition(
                            position: Tween(begin: const Offset(.06, 0), end: Offset.zero).animate(a),
                            child: child,
                          ),
                        ),
                        child: KeyedSubtree(
                          key: ValueKey(_i),
                          child: ExerciseView(
                            ex: ex,
                            value: _value,
                            locked: locked,
                            onChanged: (v) => setState(() => _value = v),
                            onSubmit: () {
                              if (_canCheck) _check();
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              _BottomBand(
                verdict: _verdict,
                ex: ex,
                canCheck: _canCheck,
                onCheck: _check,
                onNext: _next,
                onListen: ex.word != null ? () => _audio.say(ex.word!.en) : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomBand extends StatelessWidget {
  const _BottomBand({
    required this.verdict,
    required this.ex,
    required this.canCheck,
    required this.onCheck,
    required this.onNext,
    this.onListen,
  });
  final Verdict verdict;
  final Exercise ex;
  final bool canCheck;
  final VoidCallback onCheck;
  final VoidCallback onNext;
  final VoidCallback? onListen;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final good = verdict == Verdict.right || verdict == Verdict.typo;
    final edge = good ? c.success : c.danger;
    final text = good ? c.successText : c.dangerText;
    final note = ex.word?.note ?? '';
    final showFeedback = verdict != Verdict.none && ex.kind != ExKind.flashcard;

    return AnimatedSize(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      alignment: Alignment.bottomCenter,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: showFeedback ? c.bg : c.surface,
          border: Border(
            top: BorderSide(color: showFeedback ? edge : c.line, width: showFeedback ? 3 : 2),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: showFeedback
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Mascot(mood: good ? Mood.happy : Mood.sad, size: 48),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              verdict == Verdict.right
                                  ? 'Harika!'
                                  : verdict == Verdict.typo
                                  ? 'Küçük bir yazım hatası'
                                  : 'Doğru cevap:',
                              style: ts(T.lead, w: FontWeight.w900, color: text),
                            ),
                            if (verdict != Verdict.right) ...[
                              const SizedBox(height: 2),
                              Text(
                                ex.correctText,
                                style: ts(T.body, w: FontWeight.w700, color: text),
                              ),
                            ],
                            if (note.isNotEmpty && verdict != Verdict.right) ...[
                              const SizedBox(height: 4),
                              Text(
                                note,
                                style: ts(T.tiny, w: FontWeight.w700, color: c.ink2),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (onListen != null && ex.kind != ExKind.match)
                        GestureDetector(
                          onTap: onListen,
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: OIcon(OI.speaker, size: 24, color: text),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  PushButton(label: 'Devam', full: true, large: true, kind: good ? BtnKind.brand : BtnKind.danger, onTap: onNext),
                ],
              )
            : PushButton(
                label: ex.kind == ExKind.flashcard ? 'Anladım' : 'Kontrol et',
                full: true,
                large: true,
                onTap: canCheck ? onCheck : null,
              ),
      ),
    );
  }
}
