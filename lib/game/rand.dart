import 'dart:math';

final _rng = Random();

List<T> shuffled<T>(Iterable<T> items, [Random? rng]) => [...items]..shuffle(rng ?? _rng);

T pick<T>(List<T> items) => items[_rng.nextInt(items.length)];

bool coin() => _rng.nextBool();

int randInt(int max) => _rng.nextInt(max);

double Function() mulberry32(int seed) {
  var a = seed & 0xFFFFFFFF;
  return () {
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF;
    var t = _imul(a ^ (a >>> 15), 1 | a);
    t = ((t + _imul(t ^ (t >>> 7), 61 | t)) & 0xFFFFFFFF) ^ t;
    return ((t ^ (t >>> 14)) & 0xFFFFFFFF) / 4294967296;
  };
}

int _imul(int a, int b) => (a * b) & 0xFFFFFFFF;

int fnv1a(String s) {
  var h = 2166136261;
  for (final unit in s.codeUnits) {
    h ^= unit;
    h = _imul(h, 16777619);
  }
  return h & 0xFFFFFFFF;
}
