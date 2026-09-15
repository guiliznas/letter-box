import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../models/models.dart';

/// Cache offline dos e-mails. A lista e o leitor sempre leem daqui, então o app
/// funciona sem internet com tudo que já foi sincronizado.
class LocalDatabase {
  Database? _db;

  Future<Database> get _database async {
    _db ??= await openDatabase(
      p.join(await getDatabasesPath(), 'letterbox.db'),
      version: 1,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE emails (
            id TEXT PRIMARY KEY,
            sender_email TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            subject TEXT NOT NULL,
            body_html TEXT NOT NULL,
            body_text TEXT NOT NULL,
            received_at TEXT NOT NULL,
            is_read INTEGER NOT NULL
          )
        ''');
        await db.execute('CREATE INDEX idx_emails_received_at ON emails (received_at DESC)');
      },
    );
    return _db!;
  }

  Future<List<EmailItem>> loadEmails() async {
    final Database db = await _database;
    final List<Map<String, Object?>> rows =
        await db.query('emails', orderBy: 'received_at DESC');
    return rows.map(EmailItem.fromRow).toList();
  }

  Future<void> upsertEmails(List<EmailItem> emails) async {
    if (emails.isEmpty) return;
    final Database db = await _database;
    final Batch batch = db.batch();
    for (final EmailItem email in emails) {
      batch.insert('emails', email.toRow(), conflictAlgorithm: ConflictAlgorithm.ignore);
    }
    await batch.commit(noResult: true);
  }

  Future<void> setRead(String id, bool isRead) async {
    final Database db = await _database;
    await db.update(
      'emails',
      <String, Object?>{'is_read': isRead ? 1 : 0},
      where: 'id = ?',
      whereArgs: <Object?>[id],
    );
  }

  Future<void> clear() async {
    final Database db = await _database;
    await db.delete('emails');
  }
}
