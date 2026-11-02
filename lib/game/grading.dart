import 'dart:math';

String normalize(String s) =>
    s.toLowerCase().replaceAll('’', "'").replaceAll(RegExp(r'''[.,!?;:"“”()…]'''), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();

String spokenEnglish(String en) {
  var s = en.replaceAll(RegExp(r'\([^)]*\)'), ' ');
  s = s.replaceAllMapped(RegExp(r'\b(\w+)/(\w+)\b'), (m) => '${m[1]} or ${m[2]}');
  s = s.replaceAll(' / ', ', ').replaceAll('/', ', ');
  return s.replaceAll(RegExp(r'\s+'), ' ').replaceAll(RegExp(r'^[ ,;]+|[ ,;]+$'), '');
}

String displayTurkish(String tr) => tr.replaceAll(' / ', ' · ');

Set<String> acceptedEnglish(String en) {
  final out = <String>{};
  void add(String v) {
    final n = normalize(v);
    if (n.isEmpty) return;
    out.add(n);
    for (final prefix in ['to ', 'a ', 'an ', 'the ']) {
      if (n.startsWith(prefix) && n.length > prefix.length + 1) out.add(n.substring(prefix.length));
    }
  }

  final variants = en.split(RegExp(r'\s/\s|[,;]'));
  for (final v in [en, ...variants]) {
    add(v.replaceAll(RegExp(r'\([^)]*\)'), ' '));
    add(v.replaceAll(RegExp(r'[()]'), ''));
  }
  final slash = RegExp(r'\b(\w+)/(\w+)\b');
  for (final v in [...out]) {
    if (slash.hasMatch(v)) {
      add(v.replaceAllMapped(slash, (m) => m[1]!));
      add(v.replaceAllMapped(slash, (m) => m[2]!));
    }
  }
  return out;
}

enum TypeVerdict { exact, typo, wrong }

TypeVerdict checkEnglish(String input, String en) {
  final given = normalize(input);
  if (given.isEmpty) return TypeVerdict.wrong;
  final accepted = acceptedEnglish(en);
  if (accepted.contains(given)) return TypeVerdict.exact;
  for (final a in accepted) {
    if (a.length >= 5 && levenshtein(a, given) <= 1) return TypeVerdict.typo;
  }
  return TypeVerdict.wrong;
}

int levenshtein(String a, String b) {
  if (a == b) return 0;
  if (a.isEmpty) return b.length;
  if (b.isEmpty) return a.length;
  var prev = List<int>.generate(b.length + 1, (i) => i);
  var prev2 = prev;
  for (var i = 1; i <= a.length; i++) {
    final cur = List<int>.filled(b.length + 1, 0)..[0] = i;
    for (var j = 1; j <= b.length; j++) {
      cur[j] = min(min(cur[j - 1] + 1, prev[j] + 1), prev[j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) cur[j] = min(cur[j], prev2[j - 2] + 1);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

List<String> phraseTokens(String en) => spokenEnglish(en).split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();

bool sameTokens(List<String> got, String en) => normalize(got.join(' ')) == normalize(phraseTokens(en).join(' '));
