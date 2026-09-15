// Substitui services/googleService.ts no modo mock: uma caixa do Gmail falsa,
// determinística, grande o bastante para exercitar o scroll infinito.
import { EmailItem } from '../types';
import { COLORS } from '../constants';

export interface GmailPage {
  emails: EmailItem[];
  nextPageToken: string | null;
}

const LATENCY_MS = 500;
const HOUR = 60 * 60 * 1000;

const NEWSLETTERS = [
  {
    email: 'newsletter@techweekly.com',
    name: 'Tech Weekly',
    topics: ['IA generativa', 'chips e semicondutores', 'modelos locais', 'segurança de APIs', 'agentes autônomos'],
  },
  {
    email: 'daily@finance.com',
    name: 'Morning Finance',
    topics: ['juros e inflação', 'mercado de ações', 'câmbio', 'renda fixa', 'resultados trimestrais'],
  },
  {
    email: 'cooking@recipes.com',
    name: "Chef's Corner",
    topics: ['massas caseiras', 'fermentação natural', 'cozinha vegetariana', 'sobremesas rápidas', 'churrasco'],
  },
];

// Remetente que existe na caixa mas não está nas fontes: prova que o filtro funciona.
const NOISE = { email: 'promo@loja.com', name: 'Loja Promo', topics: ['ofertas da semana'] };

export const EMAILS_PER_NEWSLETTER = 45;

const colorFor = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
};

const buildEmail = (
  sender: { email: string; name: string; topics: string[] },
  index: number,
  hoursAgo: number
): EmailItem => {
  const topic = sender.topics[index % sender.topics.length];
  const edition = EMAILS_PER_NEWSLETTER - index;
  const subject = `${sender.name} #${edition}: ${topic}`;
  const text = `Nesta edição falamos sobre ${topic}. Três destaques, uma análise e links para aprofundar.`;

  return {
    id: `mock-${sender.email}-${index}`,
    senderEmail: sender.email,
    senderName: sender.name,
    subject,
    bodyText: text,
    bodyHtml: `
      <h2>${subject}</h2>
      <p>${text}</p>
      <h3>Destaques</h3>
      <ul>
        <li><strong>Primeiro ponto:</strong> o que mudou em ${topic} nesta semana.</li>
        <li><strong>Segundo ponto:</strong> quem está ganhando com isso.</li>
        <li><strong>Terceiro ponto:</strong> o que observar nos próximos dias.</li>
      </ul>
      <p>Obrigado por ler a edição ${edition}.</p>
    `,
    receivedAt: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
    isRead: index >= 4,
    avatarColor: colorFor(sender.email),
  };
};

const MAILBOX: EmailItem[] = [
  ...NEWSLETTERS.flatMap((sender, s) =>
    Array.from({ length: EMAILS_PER_NEWSLETTER }, (_, i) => buildEmail(sender, i, 2 + i * 16 + s * 5))
  ),
  ...Array.from({ length: 20 }, (_, i) => buildEmail(NOISE, i, 1 + i * 20)),
].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

export const initGoogleClient = async (onInitComplete: () => void) => {
  onInitComplete();
};

export const fetchGmailPage = async (
  senderEmails: string[],
  pageToken: string | null = null,
  limit = 20
): Promise<GmailPage> => {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  if (senderEmails.length === 0) return { emails: [], nextPageToken: null };

  const allowed = new Set(senderEmails.map((e) => e.toLowerCase()));
  const matching = MAILBOX.filter((email) => allowed.has(email.senderEmail.toLowerCase()));

  const offset = pageToken ? Number(pageToken) : 0;
  const emails = matching.slice(offset, offset + limit);
  const next = offset + limit;

  (window as any).__letterboxMock?.gmailCalls.push({ senderEmails, pageToken, limit });

  return { emails, nextPageToken: next < matching.length ? String(next) : null };
};
