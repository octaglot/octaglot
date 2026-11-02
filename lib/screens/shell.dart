import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/icons.dart';
import '../design/tokens.dart';
import '../game/store.dart';
import '../widgets/logo.dart';
import 'map_screen.dart';
import 'practice_screen.dart';
import 'profile_screen.dart';
import 'today_screen.dart';

class Shell extends ConsumerStatefulWidget {
  const Shell({super.key});

  @override
  ConsumerState<Shell> createState() => _ShellState();
}

class _ShellState extends ConsumerState<Shell> with WidgetsBindingObserver {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.read(gameProvider.notifier).refreshHearts();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final p = ref.watch(gameProvider.select((s) => s.profile));
    final due = ref.watch(gameProvider.select((s) => s.dueCount));
    final claimable = ref.watch(gameProvider.select((s) => s.quests.where((q) => q.complete && !q.claimed).length));

    return Scaffold(
      backgroundColor: c.surface,
      body: Column(
        children: [
          Container(
            color: c.bar,
            child: SafeArea(
              bottom: false,
              child: SizedBox(
                height: 54,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Wordmark(size: 26, color: c.barText),
                      const Spacer(),
                      _Chip(icon: OI.flame, value: p.streak, color: c.accent, label: 'Gün serisi'),
                      const SizedBox(width: 14),
                      _Chip(icon: OI.gem, value: p.gems, color: c.sky, label: 'Elmas'),
                      const SizedBox(width: 14),
                      _Chip(icon: OI.heart, value: p.hearts, color: c.danger, label: 'Can'),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: IndexedStack(index: _tab, children: const [MapScreen(), PracticeScreen(), TodayScreen(), ProfileScreen()]),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: c.surface,
          border: Border(top: BorderSide(color: c.line, width: 2)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 62,
            child: Row(
              children: [
                _Tab(icon: OI.home, label: 'Öğren', on: _tab == 0, onTap: () => _go(0)),
                _Tab(icon: OI.repeat, label: 'Pratik', on: _tab == 1, onTap: () => _go(1), badge: due > 0 ? '$due' : null),
                _Tab(icon: OI.target, label: 'Görevler', on: _tab == 2, onTap: () => _go(2), badge: claimable > 0 ? '$claimable' : null),
                _Tab(icon: OI.person, label: 'Profil', on: _tab == 3, onTap: () => _go(3)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _go(int i) {
    if (i == _tab) return;
    HapticFeedback.selectionClick();
    setState(() => _tab = i);
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.value, required this.color, required this.label});
  final OI icon;
  final int value;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Semantics(
    label: '$label $value',
    child: Row(
      children: [
        OIcon(icon, size: 20, color: color),
        const SizedBox(width: 4),
        Text(
          '$value',
          style: ts(T.body, w: FontWeight.w900, color: color),
        ),
      ],
    ),
  );
}

class _Tab extends StatelessWidget {
  const _Tab({required this.icon, required this.label, required this.on, required this.onTap, this.badge});
  final OI icon;
  final String label;
  final bool on;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final col = on ? c.brandText : c.muted;
    return Expanded(
      child: Semantics(
        button: true,
        selected: on,
        label: label,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(color: on ? c.brandWash : Colors.transparent, borderRadius: BorderRadius.circular(999)),
                    child: OIcon(icon, size: 24, color: col),
                  ),
                  if (badge != null)
                    Positioned(
                      right: 4,
                      top: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        constraints: const BoxConstraints(minWidth: 18),
                        decoration: BoxDecoration(color: c.danger, borderRadius: BorderRadius.circular(999)),
                        child: Text(
                          badge!.length > 3 ? '99+' : badge!,
                          textAlign: TextAlign.center,
                          style: ts(10, w: FontWeight.w900, color: Palette.onColor),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: ts(T.tiny, w: FontWeight.w800, color: col),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
