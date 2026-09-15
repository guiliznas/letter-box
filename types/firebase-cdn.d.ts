// O SDK do Firebase é carregado por URL do CDN (services/firebase.ts), então o
// TypeScript não encontra os tipos pelo node_modules.
declare module 'https://www.gstatic.com/firebasejs/*';
