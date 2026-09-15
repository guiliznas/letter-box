import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'gmail_repository.dart';

class AuthResult {
  const AuthResult(this.account);

  final GoogleSignInAccount account;
}

/// Login com Google + permissão do Gmail. Na v7 do google_sign_in a
/// autenticação e a autorização de escopos são passos separados.
class AuthService {
  AuthService(this._serverClientId);

  final String _serverClientId;
  bool _initialized = false;

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    await GoogleSignIn.instance.initialize(
      serverClientId: _serverClientId.isEmpty ? null : _serverClientId,
    );
    _initialized = true;
  }

  Future<AuthResult?> signIn() async {
    await _ensureInitialized();

    final GoogleSignInAccount account = await GoogleSignIn.instance.authenticate(
      scopeHint: <String>[gmailReadonlyScope],
    );

    final GoogleSignInClientAuthorization authorization =
        await account.authorizationClient.authorizeScopes(<String>[gmailReadonlyScope]);

    await FirebaseAuth.instance.signInWithCredential(
      GoogleAuthProvider.credential(
        idToken: account.authentication.idToken,
        accessToken: authorization.accessToken,
      ),
    );

    return AuthResult(account);
  }

  /// Tenta recuperar a sessão sem interface, para o app abrir já logado.
  Future<AuthResult?> restore() async {
    await _ensureInitialized();
    final GoogleSignInAccount? account =
        await GoogleSignIn.instance.attemptLightweightAuthentication();
    return account == null ? null : AuthResult(account);
  }

  Future<void> signOut() async {
    await GoogleSignIn.instance.signOut();
    await FirebaseAuth.instance.signOut();
  }
}
