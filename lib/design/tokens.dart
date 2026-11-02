import 'package:flutter/material.dart';

@immutable
class Palette extends ThemeExtension<Palette> {
  const Palette({
    required this.brand,
    required this.brandStrong,
    required this.brandDark,
    required this.brandLight,
    required this.brandWash,
    required this.brandText,
    required this.accent,
    required this.accentDark,
    required this.success,
    required this.successDark,
    required this.successWash,
    required this.successText,
    required this.danger,
    required this.dangerDark,
    required this.dangerWash,
    required this.dangerText,
    required this.gold,
    required this.goldDark,
    required this.goldWash,
    required this.goldText,
    required this.sky,
    required this.skyDark,
    required this.skyWash,
    required this.skyText,
    required this.lilac,
    required this.deep,
    required this.ink,
    required this.ink2,
    required this.muted,
    required this.line,
    required this.bg,
    required this.surface,
    required this.bar,
    required this.barText,
    required this.disabledBg,
    required this.disabledText,
  });

  final Color brand;
  final Color brandStrong;
  final Color brandDark;
  final Color brandLight;
  final Color brandWash;
  final Color brandText;
  final Color accent;
  final Color accentDark;
  final Color success;
  final Color successDark;
  final Color successWash;
  final Color successText;
  final Color danger;
  final Color dangerDark;
  final Color dangerWash;
  final Color dangerText;
  final Color gold;
  final Color goldDark;
  final Color goldWash;
  final Color goldText;
  final Color sky;
  final Color skyDark;
  final Color skyWash;
  final Color skyText;
  final Color lilac;
  final List<(Color, Color)> deep;
  final Color ink;
  final Color ink2;
  final Color muted;
  final Color line;
  final Color bg;
  final Color surface;
  final Color bar;
  final Color barText;
  final Color disabledBg;
  final Color disabledText;

  static const onColor = Colors.white;
  static const onGold = Color(0xFF241F2E);

  static const light = Palette(
    brand: Color(0xFF9B60BE),
    brandStrong: Color(0xFF7B3BA0),
    brandDark: Color(0xFF5F2C7D),
    brandLight: Color(0xFFBF9BD4),
    brandWash: Color(0xFFF4ECF8),
    brandText: Color(0xFF5F2C7D),
    accent: Color(0xFFFF6B4A),
    accentDark: Color(0xFFE04E2E),
    success: Color(0xFF7039D0),
    successDark: Color(0xFF4D2593),
    successWash: Color(0xFFECE2FB),
    successText: Color(0xFF4D2593),
    danger: Color(0xFFFF4767),
    dangerDark: Color(0xFFC81339),
    dangerWash: Color(0xFFFDEEF0),
    dangerText: Color(0xFFC81339),
    gold: Color(0xFFFFB43D),
    goldDark: Color(0xFFCF8100),
    goldWash: Color(0xFFFFF4DE),
    goldText: Color(0xFF8A5A00),
    sky: Color(0xFF35D0FF),
    skyDark: Color(0xFF0089B8),
    skyWash: Color(0xFFDFF6FF),
    skyText: Color(0xFF0089B8),
    lilac: Color(0xFFC78BE0),
    deep: [
      (Color(0xFF6E2F93), Color(0xFF5F2C7D)),
      (Color(0xFF0B7FA8), Color(0xFF065A78)),
      (Color(0xFF8C3BB5), Color(0xFF6A2590)),
      (Color(0xFF976000), Color(0xFF6D4500)),
      (Color(0xFFC23A20), Color(0xFF8F2B16)),
      (Color(0xFFC81339), Color(0xFF94062A)),
    ],
    ink: Color(0xFF272430),
    ink2: Color(0xFF5F5A6B),
    muted: Color(0xFFA5A1B0),
    line: Color(0xFFE7E5EC),
    bg: Color(0xFFF6F5F8),
    surface: Color(0xFFFFFFFF),
    bar: Color(0xFF241F2E),
    barText: Color(0xFFECE9F2),
    disabledBg: Color(0xFFE9E7EE),
    disabledText: Color(0xFF7D7789),
  );

  static const dark = Palette(
    brand: Color(0xFFAC69D3),
    brandStrong: Color(0xFF9C51C8),
    brandDark: Color(0xFF63307F),
    brandLight: Color(0xFFCBA6E4),
    brandWash: Color(0xFF2B2139),
    brandText: Color(0xFFCBA6E4),
    accent: Color(0xFFFF6B4A),
    accentDark: Color(0xFFE04E2E),
    success: Color(0xFFA674FB),
    successDark: Color(0xFF4D2593),
    successWash: Color(0xFF2A1F42),
    successText: Color(0xFFC0A1F7),
    danger: Color(0xFFF85149),
    dangerDark: Color(0xFFC81339),
    dangerWash: Color(0xFF2B1B1B),
    dangerText: Color(0xFFFF9A94),
    gold: Color(0xFFFFB43D),
    goldDark: Color(0xFFCF8100),
    goldWash: Color(0xFF33270F),
    goldText: Color(0xFFFFC86B),
    sky: Color(0xFF35D0FF),
    skyDark: Color(0xFF0089B8),
    skyWash: Color(0xFF102A35),
    skyText: Color(0xFF6FDCFF),
    lilac: Color(0xFFC78BE0),
    deep: [
      (Color(0xFF8A45B0), Color(0xFF63307F)),
      (Color(0xFF10708F), Color(0xFF065A78)),
      (Color(0xFFA250C9), Color(0xFF7A2FA3)),
      (Color(0xFF986106), Color(0xFF6D4500)),
      (Color(0xFFCF4526), Color(0xFF8F2B16)),
      (Color(0xFFD1284A), Color(0xFF94062A)),
    ],
    ink: Color(0xFFECEAF2),
    ink2: Color(0xFFA9A3B8),
    muted: Color(0xFF6E6880),
    line: Color(0xFF332E3F),
    bg: Color(0xFF15131B),
    surface: Color(0xFF1E1B26),
    bar: Color(0xFF100E15),
    barText: Color(0xFFECE9F2),
    disabledBg: Color(0xFF2F2A3A),
    disabledText: Color(0xFF948DA6),
  );

  @override
  Palette copyWith() => this;

  @override
  Palette lerp(ThemeExtension<Palette>? other, double t) => t < 0.5 ? this : (other as Palette? ?? this);
}

extension PaletteContext on BuildContext {
  Palette get c => Theme.of(this).extension<Palette>()!;
}

class R {
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
}

class T {
  static const display = 30.0;
  static const title = 22.0;
  static const lead = 19.0;
  static const body = 16.0;
  static const small = 14.0;
  static const tiny = 12.0;
}

ThemeData buildTheme(Palette p, Brightness b) {
  final base = ThemeData(
    brightness: b,
    fontFamily: 'Nunito',
    scaffoldBackgroundColor: p.surface,
    colorScheme: ColorScheme.fromSeed(seedColor: p.brand, brightness: b, surface: p.surface),
    extensions: [p],
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: p.ink, displayColor: p.ink, fontFamily: 'Nunito'),
    textSelectionTheme: TextSelectionThemeData(cursorColor: p.brand, selectionColor: p.brandLight.withValues(alpha: .4)),
  );
}

TextStyle ts(double size, {FontWeight w = FontWeight.w800, Color? color, double? height, double? spacing}) =>
    TextStyle(fontSize: size, fontWeight: w, color: color, height: height, letterSpacing: spacing, fontFamily: 'Nunito');
