import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum OI { home, repeat, person, play, lock, star, crown, flame, gem, heart, speaker, gear, target, bolt, close, cards, check, back }

const _stroke = 'fill="none" stroke="#000" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';

const Map<OI, String> _svg = {
  OI.home:
      '<g $_stroke><path d="M12 7C10.2 5.7 8.3 5.1 6 5.1c-1 0-1.9.1-2.7.3-.4.1-.7.4-.7.8v10.9c0 .5.5.9 1 .8.7-.1 1.5-.2 2.4-.2 2.3 0 4.2.6 6 2"/><path d="M12 7c1.8-1.3 3.7-1.9 6-1.9 1 0 1.9.1 2.7.3.4.1.7.4.7.8v10.9c0 .5-.5.9-1 .8-.7-.1-1.5-.2-2.4-.2-2.3 0-4.2.6-6 2"/><path d="M12 7v12.7"/></g>',
  OI.repeat: '<g $_stroke><path d="M20.5 11.9a8.5 8.5 0 1 1-2.5-6"/><path d="M18 1.8v4.4h-4.4"/></g>',
  OI.person: '<g $_stroke><circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20c.7-3.8 3.6-6 7.2-6s6.5 2.2 7.2 6"/></g>',
  OI.play: '<path d="M8 5.2c0-.9 1-1.5 1.8-1l9 6.8c.7.5.7 1.5 0 2l-9 6.8c-.8.5-1.8-.1-1.8-1Z"/>',
  OI.lock: '<path d="M12 2a5 5 0 0 0-5 5v2.2h2.6V7a2.4 2.4 0 0 1 4.8 0v2.2H17V7a5 5 0 0 0-5-5Z"/><rect x="5" y="9.6" width="14" height="11.4" rx="2.4"/>',
  OI.star: '<path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95Z"/>',
  OI.crown: '<path d="M3 8.4 6.2 12 12 4.6 17.8 12 21 8.4l-1.5 10.2a1 1 0 0 1-1 .84H5.5a1 1 0 0 1-1-.84Z"/>',
  OI.flame: '<path d="M13.1 2c.4 3-1.2 4.6-2.7 6C8.5 9.7 6.5 11.6 6.5 15a6.2 6.2 0 0 0 11 3.9c1-1.3 1.4-2.9 1.1-4.5-.3 1-1 1.7-1.9 2 .6-2.6-.3-5.3-2.3-7.2.2 1.4-.4 2.4-1.3 2.9.5-3.6-1.4-8.2-4-10.1Z"/>',
  OI.gem: '<path d="M7.4 3h9.2l4.3 5.4L12 21.4 3.1 8.4Z" opacity=".95"/><path d="M3.1 8.4h17.8L12 21.4Z" opacity=".55"/>',
  OI.heart: '<path d="M12 21c-.4 0-.8-.15-1.1-.44l-7-6.6A6 6 0 0 1 12 5.3a6 6 0 0 1 8.1 8.66l-7 6.6c-.3.29-.7.44-1.1.44Z"/>',
  OI.speaker: '<path d="M11 4.5v15a1 1 0 0 1-1.66.75L5.2 16.5H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2.2l4.14-3.75A1 1 0 0 1 11 4.5Z"/><path d="M15.2 8.2a1.1 1.1 0 0 1 1.55.06 5.4 5.4 0 0 1 0 7.48 1.1 1.1 0 1 1-1.6-1.5 3.2 3.2 0 0 0 0-4.48 1.1 1.1 0 0 1 .05-1.56Z"/><path d="M18.3 5a1.1 1.1 0 0 1 1.55.05 9.7 9.7 0 0 1 0 13.9 1.1 1.1 0 0 1-1.5-1.6 7.5 7.5 0 0 0 0-10.7A1.1 1.1 0 0 1 18.3 5Z"/>',
  OI.gear:
      '<g $_stroke><path d="M4 7h8M18 7h2M4 12h2M12 12h8M4 17h8M18 17h2"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="12" r="2.2"/><circle cx="15" cy="17" r="2.2"/></g>',
  OI.target: '<g fill="none" stroke="#000" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/></g><circle cx="12" cy="12" r="1"/>',
  OI.bolt: '<path d="M13.4 2 4.6 13.7a.6.6 0 0 0 .48.96h5.1l-.98 7.34 8.8-11.7a.6.6 0 0 0-.48-.96h-5.1Z"/>',
  OI.close: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"/>',
  OI.cards:
      '<g $_stroke><rect x="3" y="6" width="11" height="15" rx="2.2"/><path d="M8 3.5 17.6 2a2 2 0 0 1 2.3 1.7l1.8 12.1a2 2 0 0 1-1.7 2.3l-3 .4"/></g>',
  OI.check:
      '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#000" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
  OI.back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
};

class OIcon extends StatelessWidget {
  const OIcon(this.icon, {super.key, this.size = 24, this.color});
  final OI icon;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final col = color ?? DefaultTextStyle.of(context).style.color ?? IconTheme.of(context).color ?? Colors.black;
    return SvgPicture.string(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${_svg[icon]}</svg>',
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(col, BlendMode.srcIn),
    );
  }
}
