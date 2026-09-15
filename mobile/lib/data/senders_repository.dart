import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/models.dart';

/// Mesma coleção usada pelo app web (`users/{uid}/subscriptions`, id do
/// documento = base64 do e-mail), então as fontes sincronizam entre os dois.
class SendersRepository {
  SendersRepository(this._firestore);

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> _collection(String userId) =>
      _firestore.collection('users').doc(userId).collection('subscriptions');

  String _docId(String email) => base64.encode(utf8.encode(email));

  Future<List<Sender>> load(String userId) async {
    final QuerySnapshot<Map<String, dynamic>> snapshot = await _collection(userId).get();
    return snapshot.docs.map((doc) => Sender.fromMap(doc.data())).toList();
  }

  Future<void> save(String userId, Sender sender) =>
      _collection(userId).doc(_docId(sender.email)).set(sender.toMap());

  Future<void> remove(String userId, String email) =>
      _collection(userId).doc(_docId(email)).delete();
}
