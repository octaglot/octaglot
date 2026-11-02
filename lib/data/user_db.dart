import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../game/quests.dart';

class Profile {
  const Profile({
    this.name = 'Öğrenci',
    this.xp = 0,
    this.gems = 20,
    this.hearts = 5,
    this.heartsRefilledAt,
    this.streak = 0,
    this.lastActive,
    this.dailyGoal = 50,
  });

  final String name;
  final int xp;
  final int gems;
  final int hearts;
  final DateTime? heartsRefilledAt;
  final int streak;
  final String? lastActive;
  final int dailyGoal;

  Profile copyWith({
    String? name,
    int? xp,
    int? gems,
    int? hearts,
    DateTime? Function()? heartsRefilledAt,
    int? streak,
    String? lastActive,
    int? dailyGoal,
  }) => Profile(
    name: name ?? this.name,
    xp: xp ?? this.xp,
    gems: gems ?? this.gems,
    hearts: hearts ?? this.hearts,
    heartsRefilledAt: heartsRefilledAt != null ? heartsRefilledAt() : this.heartsRefilledAt,
    streak: streak ?? this.streak,
    lastActive: lastActive ?? this.lastActive,
    dailyGoal: dailyGoal ?? this.dailyGoal,
  );
}

class LessonRecord {
  const LessonRecord(this.accuracy, this.times);
  final double accuracy;
  final int times;
}

class UserDb {
  UserDb(this.db);
  final Database db;

  static Future<UserDb> open({String? path}) async {
    final file = path ?? p.join(await getDatabasesPath(), 'user.db');
    final db = await openDatabase(
      file,
      version: 1,
      onCreate: (db, _) async {
        final batch = db.batch();
        batch.execute('''CREATE TABLE profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Öğrenci',
        xp INTEGER NOT NULL DEFAULT 0,
        gems INTEGER NOT NULL DEFAULT 20,
        hearts INTEGER NOT NULL DEFAULT 5,
        hearts_refilled_at TEXT,
        streak INTEGER NOT NULL DEFAULT 0,
        last_active TEXT,
        daily_goal INTEGER NOT NULL DEFAULT 50)''');
        batch.execute('INSERT INTO profile (id) VALUES (1)');
        batch.execute('''CREATE TABLE progress (
        lesson_id TEXT PRIMARY KEY,
        completed_at TEXT NOT NULL,
        best_accuracy REAL NOT NULL DEFAULT 0,
        times_done INTEGER NOT NULL DEFAULT 1)''');
        batch.execute('CREATE TABLE xp_log (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, amount INTEGER NOT NULL)');
        batch.execute('CREATE INDEX idx_xp_day ON xp_log(day)');
        batch.execute('''CREATE TABLE srs (
        word_key TEXT PRIMARY KEY,
        strength INTEGER NOT NULL DEFAULT 0,
        due TEXT NOT NULL,
        lapses INTEGER NOT NULL DEFAULT 0)''');
        batch.execute('CREATE INDEX idx_srs_due ON srs(due)');
        batch.execute('CREATE TABLE stats (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)');
        batch.execute('''CREATE TABLE quests (
        day TEXT NOT NULL, idx INTEGER NOT NULL, kind TEXT NOT NULL, target INTEGER NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0, claimed_at TEXT, PRIMARY KEY (day, idx))''');
        batch.execute('CREATE TABLE legendary (lesson_id TEXT PRIMARY KEY, done_at TEXT NOT NULL)');
        await batch.commit(noResult: true);
      },
    );
    return UserDb(db);
  }

  Future<Profile> profile() async {
    final r = (await db.query('profile', where: 'id = 1')).first;
    return Profile(
      name: r['name'] as String,
      xp: r['xp'] as int,
      gems: r['gems'] as int,
      hearts: r['hearts'] as int,
      heartsRefilledAt: r['hearts_refilled_at'] == null ? null : DateTime.parse(r['hearts_refilled_at'] as String),
      streak: r['streak'] as int,
      lastActive: r['last_active'] as String?,
      dailyGoal: r['daily_goal'] as int,
    );
  }

  Future<void> saveProfile(Profile p) => db.update('profile', {
    'name': p.name,
    'xp': p.xp,
    'gems': p.gems,
    'hearts': p.hearts,
    'hearts_refilled_at': p.heartsRefilledAt?.toIso8601String(),
    'streak': p.streak,
    'last_active': p.lastActive,
    'daily_goal': p.dailyGoal,
  }, where: 'id = 1');

  Future<Map<String, LessonRecord>> progress() async {
    final rows = await db.query('progress');
    return {for (final r in rows) r['lesson_id'] as String: LessonRecord((r['best_accuracy'] as num).toDouble(), r['times_done'] as int)};
  }

  Future<void> saveLesson(String id, double accuracy) => db.rawInsert(
    '''
      INSERT INTO progress (lesson_id, completed_at, best_accuracy, times_done) VALUES (?, ?, ?, 1)
      ON CONFLICT(lesson_id) DO UPDATE SET completed_at = excluded.completed_at,
        best_accuracy = MAX(progress.best_accuracy, excluded.best_accuracy), times_done = progress.times_done + 1''',
    [id, DateTime.now().toIso8601String(), accuracy],
  );

  Future<int> xpOn(String day) async {
    final r = await db.rawQuery('SELECT SUM(amount) AS s FROM xp_log WHERE day = ?', [day]);
    return (r.first['s'] as int?) ?? 0;
  }

  Future<void> logXp(String day, int n) => db.insert('xp_log', {'day': day, 'amount': n});

  Future<int> stat(String key) async {
    final r = await db.query('stats', where: 'key = ?', whereArgs: [key]);
    return r.isEmpty ? 0 : r.first['value'] as int;
  }

  Future<void> setStat(String key, int value) =>
      db.insert('stats', {'key': key, 'value': value}, conflictAlgorithm: ConflictAlgorithm.replace);

  Future<void> review(String key, bool correct) async {
    final rows = await db.query('srs', where: 'word_key = ?', whereArgs: [key]);
    final cur = rows.isEmpty ? null : rows.first;
    final strength = correct ? ((cur?['strength'] as int? ?? 0) + 1).clamp(0, 8) : 0;
    final lapses = (cur?['lapses'] as int? ?? 0) + (correct ? 0 : 1);
    final days = correct ? (1 << (strength - 1)) : 0;
    final due = DateTime.now().add(Duration(days: days)).toIso8601String();
    await db.insert('srs', {
      'word_key': key,
      'strength': strength,
      'due': due,
      'lapses': lapses,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<String>> dueKeys(int limit) async {
    final rows = await db.query(
      'srs',
      columns: ['word_key'],
      where: 'due <= ?',
      whereArgs: [DateTime.now().toIso8601String()],
      orderBy: 'due',
      limit: limit,
    );
    return [for (final r in rows) r['word_key'] as String];
  }

  Future<int> dueCount() async {
    final r = await db.rawQuery('SELECT COUNT(*) AS n FROM srs WHERE due <= ?', [DateTime.now().toIso8601String()]);
    return r.first['n'] as int;
  }

  Future<List<String>> weakKeys(int limit) async {
    final rows = await db.query('srs', columns: ['word_key'], where: 'lapses > 0', orderBy: 'lapses DESC, strength ASC', limit: limit);
    return [for (final r in rows) r['word_key'] as String];
  }

  Future<List<Quest>> quests(String day) async {
    for (final q in dailyQuests(day)) {
      await db.insert('quests', {
        'day': day,
        'idx': q.idx,
        'kind': q.kind.name,
        'target': q.target,
      }, conflictAlgorithm: ConflictAlgorithm.ignore);
    }
    final rows = await db.query('quests', where: 'day = ?', whereArgs: [day], orderBy: 'idx');
    return [
      for (final r in rows)
        Quest(
          idx: r['idx'] as int,
          kind: QuestKind.values.byName(r['kind'] as String),
          target: r['target'] as int,
          progress: r['progress'] as int,
          claimed: r['claimed_at'] != null,
        ),
    ];
  }

  Future<void> saveQuestProgress(String day, int idx, int progress) =>
      db.update('quests', {'progress': progress}, where: 'day = ? AND idx = ?', whereArgs: [day, idx]);

  Future<void> saveQuestClaim(String day, int idx) =>
      db.update('quests', {'claimed_at': DateTime.now().toIso8601String()}, where: 'day = ? AND idx = ?', whereArgs: [day, idx]);

  Future<Map<String, dynamic>> exportState() async {
    final xp = await db.rawQuery('SELECT day, SUM(amount) AS s FROM xp_log GROUP BY day');
    return {
      'v': 1,
      'profile': (await db.query('profile', where: 'id = 1')).first,
      'progress': await db.query('progress'),
      'srs': await db.query('srs'),
      'stats': await db.query('stats'),
      'quests': await db.query('quests'),
      'legendary': await db.query('legendary'),
      'xp': {for (final r in xp) r['day'] as String: r['s'] as int},
    };
  }

  Future<void> mergeState(Map<String, dynamic> remote) async {
    if (remote['v'] != 1) return;
    List<Map<String, dynamic>> rows(String k) => ((remote[k] as List?) ?? const []).cast<Map<String, dynamic>>();
    await db.transaction((tx) async {
      final local = (await tx.query('profile', where: 'id = 1')).first;
      final rp = (remote['profile'] as Map?)?.cast<String, dynamic>();
      if (rp != null) {
        final ll = local['last_active'] as String?;
        final rl = rp['last_active'] as String?;
        final remoteNewer = rl != null && (ll == null || rl.compareTo(ll) > 0);
        final localName = local['name'] as String;
        await tx.update('profile', {
          'name': localName == 'Öğrenci' ? (rp['name'] ?? localName) : localName,
          'xp': _max(local['xp'], rp['xp']),
          'gems': _max(local['gems'], rp['gems']),
          'streak': remoteNewer ? rp['streak'] : local['streak'],
          'last_active': remoteNewer ? rl : ll,
          'daily_goal': ll == null && rp['daily_goal'] != null ? rp['daily_goal'] : local['daily_goal'],
        }, where: 'id = 1');
      }
      for (final r in rows('progress')) {
        await tx.rawInsert(
          '''
          INSERT INTO progress (lesson_id, completed_at, best_accuracy, times_done) VALUES (?, ?, ?, ?)
          ON CONFLICT(lesson_id) DO UPDATE SET
            best_accuracy = MAX(progress.best_accuracy, excluded.best_accuracy),
            times_done = MAX(progress.times_done, excluded.times_done),
            completed_at = MAX(progress.completed_at, excluded.completed_at)''',
          [r['lesson_id'], r['completed_at'], r['best_accuracy'], r['times_done']],
        );
      }
      for (final r in rows('srs')) {
        await tx.rawInsert(
          '''
          INSERT INTO srs (word_key, strength, due, lapses) VALUES (?, ?, ?, ?)
          ON CONFLICT(word_key) DO UPDATE SET
            strength = CASE WHEN excluded.due > srs.due THEN excluded.strength ELSE srs.strength END,
            due = MAX(srs.due, excluded.due),
            lapses = MAX(srs.lapses, excluded.lapses)''',
          [r['word_key'], r['strength'], r['due'], r['lapses']],
        );
      }
      for (final r in rows('stats')) {
        final key = r['key'] as String;
        final cur = await tx.query('stats', where: 'key = ?', whereArgs: [key]);
        final a = cur.isEmpty ? 0 : cur.first['value'] as int;
        final b = r['value'] as int;
        final v = key == 'memory_best'
            ? ([a, b].where((x) => x > 0).fold<int?>(null, (m, x) => m == null || x < m ? x : m) ?? 0)
            : (a > b ? a : b);
        await tx.insert('stats', {'key': key, 'value': v}, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      for (final r in rows('quests')) {
        await tx.rawInsert(
          '''
          INSERT INTO quests (day, idx, kind, target, progress, claimed_at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(day, idx) DO UPDATE SET
            progress = MAX(quests.progress, excluded.progress),
            claimed_at = COALESCE(quests.claimed_at, excluded.claimed_at)''',
          [r['day'], r['idx'], r['kind'], r['target'], r['progress'], r['claimed_at']],
        );
      }
      for (final r in rows('legendary')) {
        await tx.insert('legendary', {'lesson_id': r['lesson_id'], 'done_at': r['done_at']}, conflictAlgorithm: ConflictAlgorithm.ignore);
      }
      final xp = ((remote['xp'] as Map?) ?? const {}).cast<String, dynamic>();
      for (final e in xp.entries) {
        final cur = await tx.rawQuery('SELECT SUM(amount) AS s FROM xp_log WHERE day = ?', [e.key]);
        final have = (cur.first['s'] as int?) ?? 0;
        final want = e.value as int;
        if (want > have) await tx.insert('xp_log', {'day': e.key, 'amount': want - have});
      }
    });
  }

  static int _max(Object? a, Object? b) {
    final x = (a as num?)?.toInt() ?? 0;
    final y = (b as num?)?.toInt() ?? 0;
    return x > y ? x : y;
  }

  Future<Set<String>> legendary() async => {for (final r in await db.query('legendary')) r['lesson_id'] as String};

  Future<void> saveLegendary(String id) =>
      db.insert('legendary', {'lesson_id': id, 'done_at': DateTime.now().toIso8601String()}, conflictAlgorithm: ConflictAlgorithm.ignore);
}
