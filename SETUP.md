# 🚀 Guia de Configuração - LetterBox

Siga estes passos para configurar as APIs necessárias e realizar o deploy do LetterBox na Vercel.

---

## 1. Configuração do Google Cloud Console (Autenticação e Gmail)

O app usa a API do Gmail para ler newsletters diretamente do seu navegador.

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um novo projeto chamado `LetterBox`.
3.  No menu lateral, vá em **APIs e Serviços > Biblioteca**.
4.  Pesquise por **Gmail API** e clique em **Ativar**.
5.  Vá para **Tela de Consentimento OAuth**:
    *   Escolha `External`.
    *   Preencha as informações básicas (App name, suporte email).
    *   Em **Escopos (Scopes)**, adicione: `https://www.googleapis.com/auth/gmail.readonly`.
    *   Adicione seu email como **Usuário de Teste** (obrigatório enquanto o app não for verificado).
6.  Vá para **Credenciais**:
    *   Clique em `Criar Credenciais` > `ID do cliente OAuth`.
    *   Tipo: `Aplicativo da Web`.
    *   **Origens JavaScript autorizadas**: Adicione `http://localhost:3000` e a URL da sua Vercel (ex: `https://seu-app.vercel.app`).
    *   Copie o **Client ID**.
7.  Ainda em **Credenciais**, clique em `Criar Credenciais` > `Chave de API`. Copie a **API Key**.

---

## 2. Configuração do Google AI (Gemini)

Para os recursos de resumo por IA:

1.  Acesse o [Google AI Studio](https://aistudio.google.com/).
2.  Clique em **Get API Key**.
3.  Gere uma nova chave e copie-a.

---

## 3. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou adicione no painel da Vercel) com as seguintes chaves:

```env
VITE_GOOGLE_API_KEY=sua_chave_de_api_google
VITE_GOOGLE_CLIENT_ID=seu_client_id_oauth.apps.googleusercontent.com
VITE_GEMINI_API_KEY=sua_chave_do_gemini
```

---

## 4. Testes Unitários 🧪

Para garantir que o app está funcionando conforme o esperado, consulte o arquivo [TESTING.md](./TESTING.md) para instruções sobre como rodar a suíte de testes unitários.

---

## 5. Deploy na Vercel

1.  Empurre seu código para um repositório GitHub.
2.  Importe o projeto na [Vercel](https://vercel.com).
3.  No passo "Environment Variables", cole as chaves do passo anterior.
4.  O comando de build padrão (`npm run build`) e diretório (`dist`) devem funcionar automaticamente.

---

## 6. Notas sobre PWA

O LetterBox já está configurado como PWA. Para garantir a instalação:
*   O deploy deve ser feito obrigatoriamente via **HTTPS**.
*   No iOS, clique em "Compartilhar" > "Adicionar à Tela de Início".
*   No Android, um banner de instalação aparecerá automaticamente após alguns segundos de uso.