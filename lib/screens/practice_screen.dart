import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/memory.dart';
import '../game/storm.dart';
import '../game/store.dart';
import 'flows.dart';
import 'memory_screen.dart';
import 'storm_screen.dart';

class PracticeScreen extends ConsumerWidget {
  const PracticeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.c;
    final s = ref.watch(gameProvider);
    final learned = ref.read(gameProvider.notifier).learnedWordCount;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        Text('Pratik', style: ts(T.display, w: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(
          s.dueCount >= reviewMinWords ? '$learned kelime öğrendin · ${s.dueCount} kelime tekrar bekliyor' : '$learned kelime öğrendin',
          style: ts(T.small, w: FontWeight.w700, color: c.ink2),
        ),
        const SizedBox(height: 20),
        _ModeCard(
          icon: OI.repeat,
          color: c.brandStrong,
          title: 'Tekrar dersi',
          body: s.dueCount > 0
              ? 'Aralıklı tekrar: zamanı gelen ${s.dueCount} kelime.'
              : 'Zamanı gelen kelime yok. Bildiklerin yerinde duruyor.',
          locked: s.dueCount < reviewMinWords,
          lockedHint: 'Birkaç ders sonra açılır',
          onTap: () => startReview(context, ref),
        ),
        _ModeCard(
          icon: OI.cards,
          color: c.deep[1].$1,
          title: 'Hafıza',
          body: 'Kapalı kartları çevir, İngilizceyi Türkçesiyle eşleştir.${s.memoryBest > 0 ? ' Rekor: ${s.memoryBest} hamle.' : ''}',
          locked: learned < memoryUnlockWords,
          lockedHint: '$memoryUnlockWords kelime öğrenince açılır',
          onTap: () => Navigator.of(context).push(fullScreen(const MemoryScreen())),
        ),
        _ModeCard(
          icon: OI.bolt,
          color: c.deep[4].$1,
          title: 'Fırtına',
          body: '60 saniyede olabildiğince çok çift. Yanlış 2 saniye yer.${s.stormBest > 0 ? ' Rekor: ${s.stormBest}.' : ''}',
          locked: learned < stormUnlockWords,
          lockedHint: '$stormUnlockWords kelime öğrenince açılır',
          onTap: () => Navigator.of(context).push(fullScreen(const StormScreen())),
        ),
        _ModeCard(
          icon: OI.target,
          color: c.deep[5].$1,
          title: 'Zayıf kelimelerim',
          body: 'En çok yanlış yaptığın kelimeler tek derste.',
          locked: false,
          onTap: () => startReview(context, ref, weak: true),
        ),
      ],
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.body,
    required this.locked,
    required this.onTap,
    this.lockedHint,
  });
  final OI icon;
  final Color color;
  final String title;
  final String body;
  final bool locked;
  final String? lockedHint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: OptionTile(
        onTap: locked ? () => showNotice(context, lockedHint ?? 'Henüz kilitli') : onTap,
        padding: const EdgeInsets.all(14),
        align: Alignment.centerLeft,
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(color: locked ? c.disabledBg : color, borderRadius: BorderRadius.circular(R.md)),
              alignment: Alignment.center,
              child: OIcon(icon, size: 28, color: locked ? c.disabledText : Palette.onColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: ts(T.lead, w: FontWeight.w900, color: locked ? c.muted : c.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    locked ? (lockedHint ?? '') : body,
                    style: ts(T.small, w: FontWeight.w700, color: c.ink2),
                  ),
                ],
              ),
            ),
            if (locked) OIcon(OI.lock, size: 18, color: c.muted),
          ],
        ),
      ),
    );
  }
}
