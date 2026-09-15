# Guia de Configuração para Produção - LetterBox

Este documento descreve os passos necessários para transformar o protótipo do **LetterBox** em uma aplicação real, segura e pronta para uso em produção.

---

## 1. Arquitetura e Stack Recomendada

Atualmente, o projeto utiliza `LocalStorage` para persistência e simulações de login. Para produção, recomenda-se a seguinte migração:

*   **Frontend**: React + Vite (já utilizado).
*   **Backend/BaaS**: Firebase (Recomendado pela facilidade com Auth e PWA) ou Supabase.
*   **AI**: Google Gemini API via Google AI Studio.
*   **Hospedagem**: Vercel, Netlify ou Firebase Hosting.

---

## 2. Configuração de Autenticação (OAuth com Google)

Para substituir o login simulado (`Profile.tsx`) por um login real:

1.  **Criar Projeto no Firebase Console**:
    *   Acesse [console.firebase.google.com](https://console.firebase.google.com).
    *   Crie um novo projeto.
2.  **Ativar Authentication**:
    *   No menu lateral, vá em **Authentication** -> **Sign-in method**.
    *   Habilite o provedor **Google**.
    *   Configure o email de suporte e salve.
3.  **Integrar no Código**:
    *   Instale o SDK: `npm install firebase`
    *   Crie um arquivo `services/firebase.ts` com suas credenciais.
    *   No `Profile.tsx` e `App.tsx`, substitua a lógica de estado local por:
    ```typescript
    import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
    
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    const login = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            // O usuário está logado: result.user
        } catch (error) {
            console.error(error);
        }
    };
    ```

---

## 3. Banco de Dados e Sincronização

O `localStorage` não sincroniza entre dispositivos. Migre para o **Firestore** (Firebase) ou **Postgres**:

1.  **Estrutura de Dados Sugerida**:
    *   Collection `users/{userId}`: Dados do perfil.
    *   Collection `users/{userId}/emails`: Newsletters recebidas.
    *   Collection `users/{userId}/subscriptions`: Remetentes permitidos.
2.  **Atualizar `storageService.ts`**:
    *   Substitua as funções `loadEmails` e `saveEmails` por `getDocs` e `setDoc` do Firestore.
    *   Isso garantirá que, se o usuário ler um email no celular, ele apareça como lido no desktop.

---

## 4. Ingestão de Emails (Como receber dados reais)

Esta é a parte crítica. Como o aplicativo recebe as newsletters?

### Estratégia A: Encaminhamento (Recomendada)
1.  O usuário recebe um endereço único ao se cadastrar (ex: `usuario123@inbound.seuapp.com`).
2.  O usuário configura um filtro no Gmail pessoal para encaminhar newsletters para este endereço.
3.  **Serviço de Inbound Parse**: Utilize serviços como **SendGrid**, **Mailgun** ou **Postmark**.
    *   Eles recebem o email, processam o HTML e enviam um JSON para um **Webhook** (sua API).
4.  **Webhook (Cloud Function)**:
    *   Crie uma *Firebase Cloud Function* que recebe esse JSON.
    *   Extrai o corpo do email e o remetente.
    *   Salva no Firestore do usuário correspondente.

### Estratégia B: Gmail API (Restrita)
1.  Solicitar permissão `https://www.googleapis.com/auth/gmail.readonly`.
2.  Ler a caixa de entrada do usuário diretamente.
3.  *Nota*: O Google exige uma verificação de segurança cara (CASA Tier 2) para apps que leem emails de usuários públicos. Não recomendado para MVPs.

---

## 5. Integração com Gemini AI (Resumos)

1.  **Obter Chave**: Gere uma API Key em [aistudio.google.com](https://aistudio.google.com/).
2.  **Segurança**:
    *   **NÃO** deixe a API Key exposta no código frontend em produção.
    *   Crie uma *Cloud Function* ou *API Route* (no Next.js/Vercel) para intermediar a chamada.
    *   O Frontend chama seu Backend -> Seu Backend insere a Key e chama o Gemini -> Retorna o resultado.

---

## 6. Configuração PWA para Produção

Para o app ser instalável e confiável:

1.  **HTTPS Obrigatório**: Service Workers só funcionam em HTTPS.
2.  **Assets**: Gere os ícones em todos os tamanhos (192, 512, apple-touch-icon) e coloque na pasta `public`.
3.  **Atualize o Manifest**:
    *   Garanta que `start_url`, `scope` e `display` estejam corretos para o domínio final.
4.  **Cache Strategy**: O arquivo `service-worker.js` atual usa uma estratégia "Cache First". Para produção com dados dinâmicos (newsletters novas), mude para "Network First" para a API e "Stale-While-Revalidate" para assets estáticos.

---

## 7. Deploy (Vercel ou Netlify)

1.  Crie um repositório no GitHub.
2.  Conecte o repositório à Vercel.
3.  **Variáveis de Ambiente**:
    *   Configure `VITE_FIREBASE_API_KEY`, `VITE_GOOGLE_CLIENT_ID`, etc., no painel da Vercel. A chave de IA não vai no build: cada usuário configura a sua dentro do app.
4.  **Build Command**: `npm run build` (ou `tsc && vite build`).
5.  **Output Directory**: `dist`.

---

## Resumo do Fluxo de Dados em Produção

1.  Newsletter chega no Gmail do Usuário.
2.  Gmail encaminha para `inbound@seuapp.com`.
3.  SendGrid processa e chama sua Cloud Function.
4.  Cloud Function salva o email no Firestore.
5.  O App (PWA) detecta atualização em tempo real (Firestore Listener).
6.  Usuário abre o app, o conteúdo é baixado.
7.  Usuário clica em "Resumir", app chama API do Gemini e exibe o resumo.
