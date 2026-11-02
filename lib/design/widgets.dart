import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'icons.dart';
import 'tokens.dart';

enum BtnKind { brand, sky, danger, gold, ghost }

class PushButton extends StatefulWidget {
  const PushButton({
    super.key,
    required this.label,
    this.onTap,
    this.kind = BtnKind.brand,
    this.icon,
    this.large = false,
    this.full = false,
    this.compact = false,
  });

  final String label;
  final VoidCallback? onTap;
  final BtnKind kind;
  final OI? icon;
  final bool large;
  final bool full;
  final bool compact;

  @override
  State<PushButton> createState() => _PushButtonState();
}

class _PushButtonState extends State<PushButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final enabled = widget.onTap != null;
    final ghost = widget.kind == BtnKind.ghost;
    final (Color fill, Color edge, Color text) = switch (widget.kind) {
      BtnKind.brand => (c.brandStrong, c.brandDark, Palette.onColor),
      BtnKind.sky => (c.skyDark, const Color(0xFF00648A), Palette.onColor),
      BtnKind.danger => (c.danger, c.dangerDark, Palette.onColor),
      BtnKind.gold => (c.gold, c.goldDark, Palette.onGold),
      BtnKind.ghost => (c.surface, c.line, c.brandText),
    };
    final depth = ghost ? 3.0 : 4.0;
    final pressed = _down && enabled;
    final pad = widget.compact
        ? const EdgeInsets.symmetric(horizontal: 12, vertical: 7)
        : widget.large
        ? const EdgeInsets.symmetric(horizontal: 24, vertical: 15)
        : const EdgeInsets.symmetric(horizontal: 18, vertical: 12);
    final fontSize = widget.compact ? T.tiny : (widget.large ? T.body + 1 : T.body - 1);

    final face = AnimatedContainer(
      duration: const Duration(milliseconds: 60),
      margin: EdgeInsets.only(top: pressed ? depth : 0, bottom: pressed ? 0 : depth),
      padding: pad,
      decoration: BoxDecoration(
        color: enabled ? fill : c.disabledBg,
        borderRadius: BorderRadius.circular(R.lg),
        border: ghost ? Border.all(color: c.line, width: 2) : null,
        boxShadow: enabled && !pressed ? [BoxShadow(color: edge, offset: Offset(0, depth))] : null,
      ),
      child: Row(
        mainAxisSize: widget.full ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (widget.icon != null) ...[
            OIcon(widget.icon!, size: fontSize + 4, color: enabled ? text : c.disabledText),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Text(
              widget.label.toLocaleUpperCaseTr(),
              overflow: TextOverflow.ellipsis,
              style: ts(fontSize, color: enabled ? text : c.disabledText, spacing: .7),
            ),
          ),
        ],
      ),
    );

    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => setState(() => _down = true) : null,
        onTapCancel: () => setState(() => _down = false),
        onTapUp: enabled
            ? (_) {
                setState(() => _down = false);
                HapticFeedback.selectionClick();
                widget.onTap!();
              }
            : null,
        child: face,
      ),
    );
  }
}

enum TileState { idle, on, right, wrong }

class OptionTile extends StatefulWidget {
  const OptionTile({
    super.key,
    required this.child,
    this.onTap,
    this.state = TileState.idle,
    this.gone = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    this.align,
    this.minHeight = 0,
  });

  final Widget child;
  final VoidCallback? onTap;
  final TileState state;
  final bool gone;
  final EdgeInsets padding;
  final Alignment? align;
  final double minHeight;

  @override
  State<OptionTile> createState() => _OptionTileState();
}

class _OptionTileState extends State<OptionTile> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (Color bg, Color border, Color fg) = switch (widget.state) {
      TileState.idle => (c.surface, c.line, c.ink),
      TileState.on => (c.brandWash, c.brand, c.brandText),
      TileState.right => (c.successWash, c.success, c.successText),
      TileState.wrong => (c.dangerWash, c.danger, c.dangerText),
    };
    final pressed = _down && widget.onTap != null;
    final tile = AnimatedContainer(
      duration: const Duration(milliseconds: 90),
      constraints: BoxConstraints(minHeight: widget.minHeight),
      alignment: widget.align,
      margin: EdgeInsets.only(top: pressed ? 2 : 0),
      padding: widget.padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(R.md),
        border: Border(
          top: BorderSide(color: border, width: 2),
          left: BorderSide(color: border, width: 2),
          right: BorderSide(color: border, width: 2),
          bottom: BorderSide(color: border, width: pressed ? 2 : 4),
        ),
      ),
      child: DefaultTextStyle(
        style: ts(T.body, w: FontWeight.w700, color: fg),
        child: widget.child,
      ),
    );
    return Visibility(
      visible: !widget.gone,
      maintainSize: true,
      maintainAnimation: true,
      maintainState: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: widget.onTap != null ? (_) => setState(() => _down = true) : null,
        onTapCancel: () => setState(() => _down = false),
        onTapUp: widget.onTap != null
            ? (_) {
                setState(() => _down = false);
                widget.onTap!();
              }
            : null,
        child: tile,
      ),
    );
  }
}

class Panel extends StatelessWidget {
  const Panel({super.key, this.title, this.titleIcon, required this.child, this.padding = const EdgeInsets.all(16)});
  final String? title;
  final Widget? titleIcon;
  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line, width: 2),
        borderRadius: BorderRadius.circular(R.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Row(
              children: [
                if (titleIcon != null) ...[titleIcon!, const SizedBox(width: 8)],
                Text(title!, style: ts(T.body)),
              ],
            ),
            const SizedBox(height: 12),
          ],
          child,
        ],
      ),
    );
  }
}

class PillBar extends StatelessWidget {
  const PillBar({super.key, required this.value, this.color, this.height = 16, this.duration = const Duration(milliseconds: 420)});
  final double value;
  final Color? color;
  final double height;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      height: height,
      decoration: BoxDecoration(color: c.line, borderRadius: BorderRadius.circular(999)),
      alignment: Alignment.centerLeft,
      child: LayoutBuilder(
        builder: (_, box) => AnimatedContainer(
          duration: duration,
          curve: Curves.easeOutCubic,
          width: box.maxWidth * value.clamp(0, 1),
          decoration: BoxDecoration(color: color ?? c.brand, borderRadius: BorderRadius.circular(999)),
        ),
      ),
    );
  }
}

class RoundIconButton extends StatelessWidget {
  const RoundIconButton({super.key, required this.icon, required this.onTap, this.label});
  final OI icon;
  final VoidCallback onTap;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: c.line, shape: BoxShape.circle),
          alignment: Alignment.center,
          child: OIcon(icon, size: 20, color: c.ink2),
        ),
      ),
    );
  }
}

void showNotice(BuildContext context, String text) {
  final c = context.c;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(
          text,
          style: ts(T.small, w: FontWeight.w700, color: c.barText),
        ),
        backgroundColor: c.bar,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.lg)),
        duration: const Duration(milliseconds: 3200),
      ),
    );
}

extension TrCase on String {
  String toLocaleUpperCaseTr() => replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();
}
