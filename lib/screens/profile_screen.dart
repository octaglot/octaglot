import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/settings.dart';
import '../data/sync.dart';
import '../design/icons.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../game/store.dart';
import '../widgets/mascot.dart';
import 'flows.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.c;
    final s = ref.watch(gameProvider);
    final content = ref.read(contentProvider);
    final p = s.profile;
    final lessons = content.lessonsInOrder.length;
    final unitsDone = content.units.where((u) => u.lessons.every((l) => s.done.containsKey(l.id))).length;
    final learned = ref.read(gameProvider.notifier).learnedWordCount;
    final totalWords = content.byKey.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        Row(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: c.brandWash,
                shape: BoxShape.circle,
                border: Border.all(color: c.brand, width: 3),
              ),
              alignment: Alignment.center,
              child: const Mascot(size: 74, circle: true),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _NameField(name: p.name),
                  Text(
                    '${p.xp} XP toplam',
                    style: ts(T.body, w: FontWeight.w700, color: c.ink2),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () => Navigator.of(context).push(fullScreen(const SettingsScreen())),
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  border: Border.all(color: c.line, width: 2),
                  borderRadius: BorderRadius.circular(R.md),
                ),
                child: OIcon(OI.gear, size: 22, color: c.ink2),
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        for (final row in [
          [
            _Big(
              title: 'Gün serisi',
              value: '${p.streak}',
              sub: 'gün',
              icon: OIcon(OI.flame, size: 24, color: c.accent),
            ),
            _Big(
              title: 'Elmas',
              value: '${p.gems}',
              sub: 'toplam',
              icon: OIcon(OI.gem, size: 24, color: c.sky),
            ),
          ],
          [
            _Big(title: 'Kelime', value: '$learned', sub: '/ $totalWords'),
            _Big(title: 'Biten ders', value: '${s.done.length}', sub: '/ $lessons · %${(s.done.length * 100 / lessons).round()}'),
          ],
          [
            _Big(title: 'Biten ünite', value: '$unitsDone', sub: '/ ${content.units.length}'),
            _Big(
              title: 'Efsane',
              value: '${s.legendary.length}',
              sub: 'ders',
              icon: OIcon(OI.crown, size: 22, color: c.gold),
            ),
          ],
        ])
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: row[0]),
                  const SizedBox(width: 12),
                  Expanded(child: row[1]),
                ],
              ),
            ),
          ),
        const SizedBox(height: 4),
        const _BackupPanel(),
        const SizedBox(height: 26),
        Text(
          "İçerik: Milliyet English-Turkish Vocabulary kitabı · Okta'nın çizimi Twemoji ahtapot emojisinden uyarlandı (CC-BY 4.0)",
          textAlign: TextAlign.center,
          style: ts(T.tiny, w: FontWeight.w700, color: c.muted, height: 1.5),
        ),
      ],
    );
  }
}

class _NameField extends ConsumerStatefulWidget {
  const _NameField({required this.name});
  final String name;

  @override
  ConsumerState<_NameField> createState() => _NameFieldState();
}

class _NameFieldState extends ConsumerState<_NameField> {
  late final _ctrl = TextEditingController(text: widget.name);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    controller: _ctrl,
    maxLength: 24,
    style: ts(T.title, w: FontWeight.w900, color: context.c.ink),
    decoration: const InputDecoration(border: InputBorder.none, isDense: true, counterText: '', contentPadding: EdgeInsets.zero),
    onSubmitted: (v) => ref.read(gameProvider.notifier).setName(v.trim().isEmpty ? 'Öğrenci' : v.trim()),
    onTapOutside: (_) {
      FocusScope.of(context).unfocus();
      final v = _ctrl.text.trim();
      if (v.isNotEmpty && v != widget.name) ref.read(gameProvider.notifier).setName(v);
    },
  );
}

class _Big extends StatelessWidget {
  const _Big({required this.title, required this.value, required this.sub, this.icon});
  final String title;
  final String value;
  final String sub;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Panel(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: ts(T.small, w: FontWeight.w800, color: c.ink2),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              if (icon != null) ...[icon!, const SizedBox(width: 6)],
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(value, style: ts(T.title + 2, w: FontWeight.w900)),
                ),
              ),
            ],
          ),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: ts(T.tiny, w: FontWeight.w700, color: c.ink2),
          ),
        ],
      ),
    );
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.c;
    final s = ref.watch(settingsProvider);
    final set = ref.read(settingsProvider.notifier);
    final goal = ref.watch(gameProvider.select((x) => x.profile.dailyGoal));

    Widget group(String title, String note, Widget child) => Padding(
      padding: const EdgeInsets.only(bottom: 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: ts(T.lead, w: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(
            note,
            style: ts(T.small, w: FontWeight.w700, color: c.ink2),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );

    Widget option(bool selected, String label, String hint, VoidCallback onTap) => Expanded(
      child: OptionTile(
        state: selected ? TileState.on : TileState.idle,
        onTap: onTap,
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: ts(T.body, w: FontWeight.w900, color: selected ? c.brandText : c.ink),
            ),
            Text(
              hint,
              style: ts(T.tiny, w: FontWeight.w700, color: c.ink2),
            ),
          ],
        ),
      ),
    );

    Widget toggle(String label, bool v, ValueChanged<bool> onChanged) => Row(
      children: [
        Expanded(
          child: Text(label, style: ts(T.body, w: FontWeight.w800)),
        ),
        Switch(value: v, onChanged: onChanged, activeThumbColor: Colors.white, activeTrackColor: c.brand),
      ],
    );

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: OIcon(OI.back, size: 24, color: c.ink2),
                  ),
                  Text('Ayarlar', style: ts(T.title, w: FontWeight.w900)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  group(
                    'Görünüm',
                    'Uygulama koyu temayla açılır.',
                    Row(
                      children: [
                        option(s.theme == ThemeMode.dark, 'Koyu', 'Varsayılan', () => set.setTheme(ThemeMode.dark)),
                        const SizedBox(width: 10),
                        option(s.theme == ThemeMode.light, 'Açık', 'Aydınlık', () => set.setTheme(ThemeMode.light)),
                        const SizedBox(width: 10),
                        option(s.theme == ThemeMode.system, 'Otomatik', 'Sisteme göre', () => set.setTheme(ThemeMode.system)),
                      ],
                    ),
                  ),
                  group(
                    'Günlük hedef',
                    'Görevler sekmesindeki halka bu hedefe göre dolar.',
                    Row(
                      children: [
                        for (final (v, l, h) in const [(20, 'Rahat', '20 XP'), (50, 'Normal', '50 XP'), (100, 'Ciddi', '100 XP')]) ...[
                          option(goal == v, l, h, () => ref.read(gameProvider.notifier).setDailyGoal(v)),
                          if (v != 100) const SizedBox(width: 10),
                        ],
                      ],
                    ),
                  ),
                  group(
                    'Ses',
                    'Kelimeler uygulamanın içindeki kayıtlardan okunur, internet gerekmez.',
                    Column(
                      children: [
                        toggle('Ses efektleri', s.sound, set.setSound),
                        toggle('Kelimeyi kendiliğinden oku', s.autoSpeak, set.setAutoSpeak),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text('Konuşma hızı', style: ts(T.body, w: FontWeight.w800)),
                            const Spacer(),
                            Text(
                              '${s.rate.toStringAsFixed(2)}×',
                              style: ts(T.body, w: FontWeight.w900, color: c.brandText),
                            ),
                          ],
                        ),
                        Slider(value: s.rate, min: .6, max: 1.2, divisions: 12, activeColor: c.brand, onChanged: set.setRate),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BackupPanel extends ConsumerStatefulWidget {
  const _BackupPanel();

  @override
  ConsumerState<_BackupPanel> createState() => _BackupPanelState();
}

class _BackupPanelState extends ConsumerState<_BackupPanel> {
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  bool _showEmail = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _run(Future<String?> Function() job) async {
    setState(() => _busy = true);
    final err = await job();
    if (!mounted) return;
    setState(() => _busy = false);
    if (err != null && err.isNotEmpty) showNotice(context, err);
  }

  Future<void> _confirmDelete() async {
    final c = context.c;
    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: c.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(R.xl))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hesabın silinsin mi?', style: ts(T.lead, w: FontWeight.w900)),
              const SizedBox(height: 6),
              Text(
                'Buluttaki yedeğin kalıcı olarak silinir. Bu telefondaki ilerlemen yerinde kalır.',
                style: ts(T.small, w: FontWeight.w700, color: c.ink2),
              ),
              const SizedBox(height: 18),
              PushButton(label: 'Vazgeç', full: true, onTap: () => Navigator.pop(ctx, false)),
              const SizedBox(height: 10),
              PushButton(label: 'Hesabı sil', kind: BtnKind.danger, full: true, onTap: () => Navigator.pop(ctx, true)),
            ],
          ),
        ),
      ),
    );
    if (ok == true) await _run(() => ref.read(syncProvider.notifier).deleteAccount());
  }

  String _ago(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'az önce';
    if (d.inHours < 1) return '${d.inMinutes} dk önce';
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = ref.watch(syncProvider);
    final sync = ref.read(syncProvider.notifier);

    if (s.signedIn) {
      final status = switch (s.phase) {
        SyncPhase.syncing => 'Eşitleniyor…',
        SyncPhase.error => s.message ?? 'Eşitlenemedi',
        _ => s.lastSync == null ? 'Yedek açık' : 'Son yedek ${_ago(s.lastSync!)}',
      };
      return Panel(
        title: 'Yedekleme açık',
        titleIcon: OIcon(OI.check, size: 18, color: c.success),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(s.email?.isNotEmpty == true ? s.email! : 'Apple hesabın', style: ts(T.body, w: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(
              status,
              style: ts(T.small, w: FontWeight.w700, color: s.phase == SyncPhase.error ? c.dangerText : c.ink2),
            ),
            const SizedBox(height: 14),
            PushButton(
              label: 'Şimdi eşitle',
              icon: OI.repeat,
              full: true,
              onTap: _busy
                  ? null
                  : () => _run(() async {
                      await sync.syncNow();
                      return null;
                    }),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: PushButton(
                    label: 'Çıkış',
                    kind: BtnKind.ghost,
                    full: true,
                    onTap: _busy
                        ? null
                        : () => _run(() async {
                            await sync.signOut();
                            return null;
                          }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: PushButton(label: 'Hesabı sil', kind: BtnKind.ghost, full: true, onTap: _busy ? null : _confirmDelete),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Panel(
      title: 'İlerlemeni yedekle',
      titleIcon: OIcon(OI.gem, size: 18, color: c.sky),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Şu an ilerlemen yalnız bu telefonda. Giriş yaparsan buluta yedeklenir; uygulamayı silsen ya da telefon değiştirsen geri gelir.',
            style: ts(T.small, w: FontWeight.w700, color: c.ink2, height: 1.4),
          ),
          const SizedBox(height: 14),
          if (sync.appleAvailable) ...[_AppleButton(onTap: _busy ? null : () => _run(sync.signInWithApple)), const SizedBox(height: 10)],
          if (_sent)
            Text(
              'Bağlantıyı ${_email.text.trim()} adresine gönderdik. E-postadaki bağlantıya bu telefonda dokun.',
              style: ts(T.small, w: FontWeight.w800, color: c.successText),
            )
          else if (_showEmail || !sync.appleAvailable) ...[
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              style: ts(T.body, w: FontWeight.w700, color: c.ink),
              decoration: InputDecoration(
                hintText: 'E-posta adresin',
                hintStyle: ts(T.body, w: FontWeight.w700, color: c.muted),
                filled: true,
                fillColor: c.bg,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(R.md),
                  borderSide: BorderSide(color: c.line, width: 2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(R.md),
                  borderSide: BorderSide(color: c.brand, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 10),
            PushButton(
              label: 'Giriş bağlantısı gönder',
              full: true,
              onTap: _busy
                  ? null
                  : () {
                      final e = _email.text.trim();
                      if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(e)) {
                        showNotice(context, 'Geçerli bir e-posta adresi yaz.');
                        return;
                      }
                      _run(() async {
                        final err = await sync.sendEmailLink(e);
                        if (err == null && mounted) setState(() => _sent = true);
                        return err;
                      });
                    },
            ),
          ] else
            PushButton(label: 'E-postayla giriş', kind: BtnKind.ghost, full: true, onTap: () => setState(() => _showEmail = true)),
        ],
      ),
    );
  }
}

class _AppleButton extends StatelessWidget {
  const _AppleButton({required this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final bg = dark ? Colors.white : Colors.black;
    final fg = dark ? Colors.black : Colors.white;
    return Semantics(
      button: true,
      label: 'Apple ile giriş yap',
      child: GestureDetector(
        onTap: onTap,
        child: Opacity(
          opacity: onTap == null ? .5 : 1,
          child: Container(
            height: 50,
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(R.lg)),
            alignment: Alignment.center,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.apple, color: fg, size: 24),
                const SizedBox(width: 8),
                Text(
                  'Apple ile giriş yap',
                  style: ts(T.body + 1, w: FontWeight.w800, color: fg),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
