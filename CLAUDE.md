# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monorepo with two apps: the React PWA at the repo root (`web`) and a Flutter Android app in `mobile/`. They share the same Firebase project and the same Firestore schema for senders, so a change to one usually implies a change to the other.

## Commands

**Web (repo root)**
```bash
npm install
npm run dev         # Vite dev server on port 3000 (host 0.0.0.0)
npm run build        # production build to dist/
npm run test         # vitest watch
npm run test:run      # single run
npm run typecheck      # tsc --noEmit
npx vitest run tests/EmailList.test.tsx   # single test file
```

**Mobile (`mobile/`)**
```bash
flutter pub get
flutter analyze
flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id>
flutter build apk --release --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id>
```

`GOOGLE_SERVER_CLIENT_ID` is the **web** OAuth client ID from the Firebase project — Android needs it to receive an `idToken`. Without it sign-in fails at runtime, not at build time. `flutterfire configure` must have been run to generate `android/app/google-services.json`.

## Architecture

### Shared model
Both apps talk directly to Firebase (auth + Firestore) and the Gmail API from the client; there is no backend. Senders live in Firestore at `users/{uid}/subscriptions/{base64(email)}` and sync between web and mobile. Emails are never persisted server-side — each client caches them locally.

Only messages from senders the user registered are fetched: the sender list is compiled into the Gmail query itself (`from:(a@x.com OR b@y.com)`), not filtered after the fact.

### Pagination
Both apps paginate with the Gmail `nextPageToken`, persisted as a sync cursor so the position survives restarts. "Sync" restarts from page one; scrolling to the end fetches the next page. Web uses an `IntersectionObserver` sentinel in `EmailList.tsx`; mobile uses a `ScrollController` threshold in `inbox_screen.dart`.

### AI (BYOK)
No API key ships in either app. The user supplies their own key and picks a provider (Anthropic, OpenAI, Gemini, OpenRouter) in an AI settings screen. One abstraction per app covers all four: `services/aiService.ts` on web, `lib/data/ai_service.dart` on mobile. Both use plain HTTP, not vendor SDKs.

- Web stores the key in `localStorage`, mobile in the Android Keystore via `flutter_secure_storage`. The key is **never** written to Firestore and never leaves the device except to the chosen provider.
- Anthropic calls from the browser require the `anthropic-dangerous-direct-browser-access: true` header; mobile does not (no CORS).
- With no key configured, both apps work normally and the AI entry points route the user to settings instead of erroring.

### Web specifics
- Vite bundles normally — `index.html` loads `/index.tsx` via a module script. (There used to be an `esm.sh` importmap and no script tag at all, which meant `dist/` never contained the app.)
- Emails live in **IndexedDB** (`services/storageService.ts`), not `localStorage`: full newsletter HTML blows past the ~5MB quota once infinite scroll accumulates pages. Senders, user and cursors stay in `localStorage`. There's a one-time migration from the old `letterbox_emails` key.
- The Firebase SDK is imported from `https://www.gstatic.com/firebasejs/...` CDN URLs, not the npm package (which isn't a dependency). `types/firebase-cdn.d.ts` exists solely to keep `tsc` quiet about those imports.
- `gapi`/Google Identity Services load from `<script>` tags in `index.html`. Firebase sign-in yields the OAuth access token that gets handed to `gapi.client.setToken`.
- State lives entirely in `App.tsx` (`useState` + callbacks down). No router — navigation is a `ViewState` union switched in `renderView()`.
- Tailwind comes from the `cdn.tailwindcss.com` script with `darkMode: 'class'` configured inline; theme toggles the `dark` class on `document.documentElement`.

### Mobile specifics
- Riverpod for state. `InboxNotifier` in `lib/state/app_state.dart` owns emails, senders, pagination and sync.
- Offline cache is **sqflite** with plain SQL (`lib/data/local_database.dart`) — chosen over drift to avoid a `build_runner` codegen step. The list and reader read only from SQLite, so the app works offline by construction; sync writes into it.
- `google_sign_in` v7 splits authentication from authorization: `authenticate()` signs in, then `authorizationClient.authorizeScopes([gmailReadonlyScope])` grants Gmail access. `authorizationHeaders()` produces the header map injected into the `googleapis` Gmail client via `AuthenticatedClient`.
- Newsletters render in a `webview_flutter` `loadHtmlString` with JavaScript disabled, wrapped in a theme-aware HTML shell.

## Gotchas

- **Restricted scope**: `gmail.readonly` requires each user to be registered as a test user (max 100) while the OAuth app is in testing mode — distributing the APK outside does not bypass this. Public release needs a paid CASA assessment.
- **Android SHA-1**: Google Sign-In validates the signing key. Debug and release SHA-1 must *both* be registered in Firebase, or login works in the emulator and fails in the distributed APK.
