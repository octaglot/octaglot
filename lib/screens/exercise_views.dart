import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../audio/audio.dart';
import '../content/content.dart';
import '../data/settings.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/exercises.dart';
import '../game/grading.dart';
import '../game/rand.dart';

class ExerciseView extends StatelessWidget {
  const ExerciseView({
    super.key,
    required this.ex,
    required this.value,
    required this.locked,
    required this.onChanged,
    required this.onSubmit,
  });
  final Exercise ex;
  final Object? value;
  final bool locked;
  final ValueChanged<Object?> onChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) => switch (ex.kind) {
    ExKind.flashcard => _Flashcard(word: ex.word!),
    ExKind.choice => _Choice(ex: ex, value: value, locked: locked, onChanged: onChanged),
    ExKind.listen => _Choice(ex: ex, value: value, locked: locked, onChanged: onChanged, listen: true),
    ExKind.match => _Match(pairs: ex.pairs, onDone: () => onChanged('done'), onSubmit: onSubmit),
    ExKind.typeEn => _TypeIn(ex: ex, locked: locked, onChanged: onChanged, onSubmit: onSubmit),
    ExKind.listenType => _TypeIn(ex: ex, locked: locked, onChanged: onChanged, onSubmit: onSubmit, listen: true),
    ExKind.build => _Bank(ex: ex, value: value, locked: locked, onChanged: onChanged, prompt: 'Bu cümleyi İngilizce kur'),
    ExKind.order => _Bank(ex: ex, value: value, locked: locked, onChanged: onChanged, prompt: 'Kelimeleri doğru sıraya diz'),
  };
}

Widget _prompt(BuildContext context, String text) => Padding(
  padding: const EdgeInsets.only(bottom: 18),
  child: Text(
    text,
    style: ts(T.title, w: FontWeight.w800, color: context.c.ink),
  ),
);

mixin _Speaks<W extends ConsumerStatefulWidget> on ConsumerState<W> {
  void speak(String en) => ref.read(audioProvider).say(en);

  void autoSpeak(String en, {int delayMs = 250}) {
    if (!ref.read(settingsProvider).autoSpeak) return;
    Future.delayed(Duration(milliseconds: delayMs), () {
      if (mounted) speak(en);
    });
  }
}

class _SpeakButton extends StatelessWidget {
  const _SpeakButton({required this.onTap, this.big = false});
  final VoidCallback onTap;
  final bool big;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      button: true,
      label: 'Dinle',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: EdgeInsets.all(big ? 22 : 9),
          decoration: BoxDecoration(
            color: big ? c.skyDark : c.surface,
            borderRadius: BorderRadius.circular(big ? R.xl : R.md),
            border: big ? null : Border.all(color: c.line, width: 2),
            boxShadow: big ? const [BoxShadow(color: Color(0xFF00648A), offset: Offset(0, 4))] : null,
          ),
          child: OIcon(OI.speaker, size: big ? 44 : 22, color: big ? Colors.white : c.skyText),
        ),
      ),
    );
  }
}

class _Flashcard extends ConsumerStatefulWidget {
  const _Flashcard({required this.word});
  final Word word;

  @override
  ConsumerState<_Flashcard> createState() => _FlashcardState();
}

class _FlashcardState extends ConsumerState<_Flashcard> with SingleTickerProviderStateMixin, _Speaks {
  late final AnimationController _flip = AnimationController(vsync: this, duration: const Duration(milliseconds: 480));

  @override
  void initState() {
    super.initState();
    autoSpeak(widget.word.en, delayMs: 350);
  }

  @override
  void dispose() {
    _flip.dispose();
    super.dispose();
  }

  void _toggle() {
    ref.read(audioProvider).play(Sfx.flip);
    _flip.isDismissed || _flip.status == AnimationStatus.reverse ? _flip.forward() : _flip.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final w = widget.word;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _prompt(context, w.phrase ? 'Yeni kalıp' : 'Yeni kelime'),
        GestureDetector(
          onTap: _toggle,
          child: AnimatedBuilder(
            animation: _flip,
            builder: (_, _) {
              final a = Curves.easeInOutCubic.transform(_flip.value) * pi;
              final back = a > pi / 2;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, .0012)
                  ..rotateY(a),
                child: Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()..rotateY(back ? pi : 0),
                  child: Container(
                    height: 250,
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: back ? c.brandWash : c.surface,
                      borderRadius: BorderRadius.circular(R.xl),
                      border: Border(
                        top: BorderSide(color: back ? c.brand : c.line, width: 2),
                        left: BorderSide(color: back ? c.brand : c.line, width: 2),
                        right: BorderSide(color: back ? c.brand : c.line, width: 2),
                        bottom: BorderSide(color: back ? c.brand : c.line, width: 4),
                      ),
                    ),
                    child: back ? _backFace(c, w) : _frontFace(c, w),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _frontFace(Palette c, Word w) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Text(
        w.en,
        textAlign: TextAlign.center,
        style: ts(w.en.length > 18 ? 26 : 36, w: FontWeight.w900, color: c.ink),
      ),
      const SizedBox(height: 16),
      _SpeakButton(onTap: () => speak(w.en)),
      const Spacer(),
      Text(
        'Anlamı için karta dokun',
        style: ts(T.tiny, w: FontWeight.w700, color: c.muted),
      ),
    ],
  );

  Widget _backFace(Palette c, Word w) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      const Spacer(),
      Text(
        displayTurkish(w.tr),
        textAlign: TextAlign.center,
        style: ts(w.tr.length > 22 ? 24 : 32, w: FontWeight.w900, color: c.brandText),
      ),
      if (w.note.isNotEmpty) ...[
        const SizedBox(height: 12),
        Text(
          w.note,
          textAlign: TextAlign.center,
          maxLines: 4,
          overflow: TextOverflow.ellipsis,
          style: ts(T.tiny, w: FontWeight.w700, color: c.ink2),
        ),
      ],
      const Spacer(),
      Text(
        w.en,
        style: ts(T.tiny, w: FontWeight.w700, color: c.muted),
      ),
    ],
  );
}

class _Choice extends ConsumerStatefulWidget {
  const _Choice({required this.ex, required this.value, required this.locked, required this.onChanged, this.listen = false});
  final Exercise ex;
  final Object? value;
  final bool locked;
  final ValueChanged<Object?> onChanged;
  final bool listen;

  @override
  ConsumerState<_Choice> createState() => _ChoiceState();
}

class _ChoiceState extends ConsumerState<_Choice> with _Speaks {
  bool get _askEn => widget.listen || widget.ex.en2tr;

  @override
  void initState() {
    super.initState();
    if (_askEn) autoSpeak(widget.ex.word!.en);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final w = widget.ex.word!;
    final correctKey = w.key;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _prompt(context, widget.listen ? 'Duyduğun kelimenin anlamı ne?' : (_askEn ? 'Bunun anlamı ne?' : 'Hangisi doğru çeviri?')),
        if (widget.listen)
          Center(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 26),
              child: _SpeakButton(big: true, onTap: () => speak(w.en)),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 22),
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    _askEn ? w.en : displayTurkish(w.tr),
                    style: ts((_askEn ? w.en : w.tr).length > 22 ? 22 : 30, w: FontWeight.w900, color: c.ink),
                  ),
                ),
                if (_askEn) ...[const SizedBox(width: 10), _SpeakButton(onTap: () => speak(w.en))],
              ],
            ),
          ),
        for (final o in widget.ex.options)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OptionTile(
              state: widget.locked
                  ? (o.key == correctKey ? TileState.right : (widget.value == o.key ? TileState.wrong : TileState.idle))
                  : (widget.value == o.key ? TileState.on : TileState.idle),
              onTap: widget.locked
                  ? null
                  : () {
                      ref.read(audioProvider).play(Sfx.tap);
                      widget.onChanged(o.key);
                    },
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              align: Alignment.centerLeft,
              child: Text(_askEn ? displayTurkish(o.tr) : o.en),
            ),
          ),
      ],
    );
  }
}

class _Match extends ConsumerStatefulWidget {
  const _Match({required this.pairs, required this.onDone, required this.onSubmit});
  final List<Word> pairs;
  final VoidCallback onDone;
  final VoidCallback onSubmit;

  @override
  ConsumerState<_Match> createState() => _MatchState();
}

class _MatchState extends ConsumerState<_Match> with _Speaks {
  late final List<Word> _left = shuffled(widget.pairs);
  late final List<Word> _right = shuffled(widget.pairs);
  (bool, String)? _sel;
  final Set<String> _matched = {};
  String? _miss;

  void _tap(bool en, Word w) {
    if (_matched.contains(w.key)) return;
    final audio = ref.read(audioProvider);
    if (en) speak(w.en);
    if (_sel == null || _sel!.$1 == en) {
      audio.play(Sfx.tap);
      return setState(() => _sel = (en, w.key));
    }
    if (_sel!.$2 == w.key) {
      audio.play(Sfx.correct);
      setState(() {
        _matched.add(w.key);
        _sel = null;
      });
      if (_matched.length == widget.pairs.length) {
        widget.onDone();
        Future.delayed(const Duration(milliseconds: 120), widget.onSubmit);
      }
    } else {
      audio.play(Sfx.wrong);
      setState(() {
        _miss = w.key;
        _sel = null;
      });
      Future.delayed(const Duration(milliseconds: 420), () {
        if (mounted) setState(() => _miss = null);
      });
    }
  }

  TileState _state(bool en, Word w) {
    if (_miss == w.key && _sel == null) return TileState.wrong;
    if (_sel != null && _sel!.$1 == en && _sel!.$2 == w.key) return TileState.on;
    return TileState.idle;
  }

  @override
  Widget build(BuildContext context) {
    Widget col(List<Word> words, bool en) => Column(
      children: [
        for (final w in words)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OptionTile(
              gone: _matched.contains(w.key),
              state: _state(en, w),
              minHeight: 58,
              align: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              onTap: () => _tap(en, w),
              child: Text(
                en ? w.en : displayTurkish(w.tr),
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: ts(T.small + 1, w: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _prompt(context, 'Eşleştir'),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: col(_left, true)),
            const SizedBox(width: 10),
            Expanded(child: col(_right, false)),
          ],
        ),
      ],
    );
  }
}

class _TypeIn extends ConsumerStatefulWidget {
  const _TypeIn({required this.ex, required this.locked, required this.onChanged, required this.onSubmit, this.listen = false});
  final Exercise ex;
  final bool locked;
  final ValueChanged<Object?> onChanged;
  final VoidCallback onSubmit;
  final bool listen;

  @override
  ConsumerState<_TypeIn> createState() => _TypeInState();
}

class _TypeInState extends ConsumerState<_TypeIn> with _Speaks {
  final _ctrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.listen) autoSpeak(widget.ex.word!.en, delayMs: 350);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final w = widget.ex.word!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _prompt(context, widget.listen ? 'Duyduğunu İngilizce yaz' : 'İngilizcesini yaz'),
        if (widget.listen)
          Center(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: _SpeakButton(big: true, onTap: () => speak(w.en)),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Text(
              displayTurkish(w.tr),
              style: ts(w.tr.length > 22 ? 22 : 28, w: FontWeight.w900, color: c.ink),
            ),
          ),
        TextField(
          controller: _ctrl,
          autofocus: true,
          enabled: !widget.locked,
          autocorrect: false,
          enableSuggestions: false,
          textCapitalization: TextCapitalization.none,
          keyboardType: TextInputType.visiblePassword,
          textInputAction: TextInputAction.done,
          onChanged: widget.onChanged,
          onSubmitted: (_) => widget.onSubmit(),
          style: ts(T.lead, w: FontWeight.w700, color: c.ink),
          decoration: InputDecoration(
            hintText: 'İngilizce yaz…',
            hintStyle: ts(T.lead, w: FontWeight.w700, color: c.muted),
            filled: true,
            fillColor: c.bg,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(R.md),
              borderSide: BorderSide(color: c.line, width: 2),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(R.md),
              borderSide: BorderSide(color: c.line, width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(R.md),
              borderSide: BorderSide(color: c.brand, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _Bank extends ConsumerStatefulWidget {
  const _Bank({required this.ex, required this.value, required this.locked, required this.onChanged, required this.prompt});
  final Exercise ex;
  final Object? value;
  final bool locked;
  final ValueChanged<Object?> onChanged;
  final String prompt;

  @override
  ConsumerState<_Bank> createState() => _BankState();
}

class _BankState extends ConsumerState<_Bank> {
  List<int> get _chosen => (widget.value as List?)?.cast<int>() ?? const [];

  void _emit(List<int> idx) => widget.onChanged(idx.isEmpty ? null : _Tokens(idx, widget.ex.bank));

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final bank = widget.ex.bank;
    final chosen = widget.value is _Tokens ? (widget.value as _Tokens).idx : _chosen;
    final audio = ref.read(audioProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _prompt(context, widget.prompt),
        Text(
          displayTurkish(widget.ex.word!.tr),
          style: ts(T.lead + 2, w: FontWeight.w800, color: c.ink),
        ),
        const SizedBox(height: 18),
        Container(
          constraints: const BoxConstraints(minHeight: 112),
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border.symmetric(horizontal: BorderSide(color: c.line, width: 2)),
          ),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < chosen.length; i++)
                OptionTile(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  onTap: widget.locked
                      ? null
                      : () {
                          audio.play(Sfx.tap);
                          _emit([...chosen]..removeAt(i));
                        },
                  child: Text(bank[chosen[i]]),
                ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < bank.length; i++)
              OptionTile(
                gone: chosen.contains(i),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                onTap: widget.locked || chosen.contains(i)
                    ? null
                    : () {
                        audio.play(Sfx.tap);
                        _emit([...chosen, i]);
                      },
                child: Text(bank[i]),
              ),
          ],
        ),
      ],
    );
  }
}

class _Tokens extends Iterable<String> {
  _Tokens(this.idx, this.bank);
  final List<int> idx;
  final List<String> bank;

  @override
  Iterator<String> get iterator => idx.map((i) => bank[i]).iterator;
}

extension BankValue on Object? {
  List<String> get tokens => this is _Tokens ? (this as _Tokens).toList() : const [];
}
