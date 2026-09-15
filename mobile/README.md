# LetterBox — Android

App Flutter do LetterBox. Visão geral da arquitetura no `CLAUDE.md` da raiz do repositório.

## Rodar localmente

```bash
flutter pub get
flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id do Firebase>
```

Sem `android/key.properties`, o build de release usa a chave de debug — serve para testar, não para distribuir.

## Releases automáticas

O workflow `.github/workflows/android-release.yml`:

| Evento | O que faz |
|---|---|
| Push na `main` que altera `mobile/**` | Gera o APK assinado e publica uma **Release** com o instalador |
| Pull request que altera `mobile/**` | Só compila e anexa o APK como artefato do run |
| Manual (Actions → Run workflow) | Na `main`, publica release; em outro branch, só compila |

Cada release recebe a tag `android-v<versão>-build.<n>`. O `n` é o número do run, que só cresce — o Android precisa disso para aceitar a atualização por cima da versão instalada. A versão (`0.1.0`) vem do `pubspec.yaml`.

### Configuração única (antes da primeira release)

**1. Gerar a chave de assinatura**

```bash
keytool -genkeypair -v -keystore letterbox-release.jks -storetype PKCS12 \
  -keyalg RSA -keysize 2048 -validity 10000 -alias letterbox
```

> ⚠️ **Guarde esse arquivo e as senhas num gerenciador de senhas.** Se a chave for perdida, nenhuma atualização futura instala por cima do app — todo mundo teria que desinstalar e perder os dados locais.

**2. Cadastrar os secrets no GitHub**

```bash
gh secret set ANDROID_KEYSTORE_BASE64 < <(base64 -w0 letterbox-release.jks)
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body letterbox
gh secret set ANDROID_KEY_PASSWORD
gh secret set GOOGLE_SERVICES_JSON < <(base64 -w0 android/app/google-services.json)
gh variable set GOOGLE_SERVER_CLIENT_ID --body "<web client id>"
```

Sem os quatro secrets `ANDROID_*`, o workflow **falha de propósito** em vez de publicar um APK com a chave de debug — ela muda a cada build, então ninguém conseguiria atualizar e o login com Google quebraria.

**3. Cadastrar o SHA-1 no Firebase**

```bash
keytool -list -v -keystore letterbox-release.jks -alias letterbox | grep SHA1
```

Adicione em Firebase → Configurações do projeto → app Android. O resumo de cada run no Actions também mostra o SHA-1 do APK gerado.

## Instalar

Baixe o `.apk` da [página de Releases](https://github.com/guiliznas/letter-box/releases) no celular, abra e permita a instalação de fontes desconhecidas. O `.sha256` ao lado serve para conferir a integridade do arquivo.

O login só funciona para contas cadastradas como usuário de teste no Google Cloud Console (limite de 100), enquanto o app estiver em modo de teste.
