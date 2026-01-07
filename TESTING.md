# 🧪 Guia de Testes - LetterBox

Este projeto utiliza **Vitest** e **React Testing Library** para garantir a qualidade dos componentes.

## 1. Pré-requisitos

Você precisará ter as seguintes dependências instaladas no seu ambiente de desenvolvimento local:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

## 2. Estrutura de Testes

Os testes estão localizados na pasta `/tests` e seguem a convenção `.test.tsx`.

*   **Mocks**: As APIs externas (Gmail e Gemini) são mockadas para permitir testes rápidos e determinísticos sem custo de API ou necessidade de internet.
*   **Ambiente**: O Vitest está configurado para simular o DOM do navegador usando `jsdom`.

## 3. Comandos

Adicione estes scripts ao seu `package.json`:

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "coverage": "vitest run --coverage"
}
```

Para rodar os testes:
```bash
npm test
```

## 4. O que está sendo testado?

### Componentes UI
- Renderização correta em modo claro/escuro.
- Comportamento de botões e navegação entre telas.
- Estados de erro e carregamento (loading).

### Lógica de Negócio
- Filtros de e-mails não lidos.
- Fluxo de solicitação de resumo por IA.
- Persistência básica (simulada via mocks de Storage).

## 5. Dica de Sênior
Ao adicionar novas funcionalidades, sempre crie um arquivo de teste correspondente. Isso evita regressões, especialmente em PWAs onde o comportamento offline pode ser complexo de depurar manualmente.