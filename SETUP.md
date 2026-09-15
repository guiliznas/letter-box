# 🚀 Guia de Configuração - LetterBox (Híbrido)

O LetterBox utiliza **Firebase** para gerenciamento de identidade e preferências, e a **API do Gmail** para acesso direto aos dados.

---

## 1. Google Cloud Console (Para Gmail API)

1.  Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2.  Ative a **Gmail API**.
3.  Em **Tela de Consentimento OAuth**, adicione o escopo: `https://www.googleapis.com/auth/gmail.readonly`.
4.  Crie um **ID do cliente OAuth** (App da Web). 
    *   Adicione as URLs autorizadas da Vercel e `http://localhost:3000`.

---

## 2. Firebase Console (Para Auth e Senders)

1.  Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2.  **Authentication**: Ative o provedor **Google**.
3.  **Firestore Database**: 
    *   Crie um banco de dados em "Production Mode".
    *   Vá em **Rules** e cole as seguintes regras de segurança:
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```
4.  Crie um **Web App** no Firebase e copie o objeto `firebaseConfig`.

---

## 3. Variáveis de Ambiente (.env)

No seu ambiente local ou painel da Vercel:

```env
# Google GAPI (Gmail)
VITE_GOOGLE_API_KEY=...
VITE_GOOGLE_CLIENT_ID=...

# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 4. Chave de IA (fornecida pelo usuário)

Nenhuma chave de IA vai no build. Cada usuário configura a própria dentro do app, na tela
**Perfil → Inteligência Artificial**, escolhendo entre Claude, OpenAI, Gemini e OpenRouter.

A chave fica salva apenas no dispositivo (`localStorage` no web, Keystore no Android) e nunca é
gravada no Firestore.

---

## 5. Funcionamento Offline e Anti-Duplicação

*   **Offline**: Todos os e-mails lidos são armazenados no `localStorage` do navegador. Se não houver internet, o app carrega esses dados instantaneamente.
*   **Filtro Inteligente**: O app só importa e-mails cujos remetentes estão cadastrados na aba "Fontes" (salvos no Firestore).
*   **Anti-Duplicação**: Durante a sincronização, o app verifica o `messageId` único do Gmail. Se o ID já existir no armazenamento local, ele é ignorado, garantindo uma lista limpa.