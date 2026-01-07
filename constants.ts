import { Sender, EmailItem } from './types';

export const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
  'bg-pink-500', 'bg-rose-500'
];

export const INITIAL_SENDERS: Sender[] = [
  { email: 'newsletter@techweekly.com', name: 'Tech Weekly', avatarColor: 'bg-blue-500' },
  { email: 'daily@finance.com', name: 'Morning Finance', avatarColor: 'bg-green-500' },
  { email: 'cooking@recipes.com', name: 'Chef\'s Corner', avatarColor: 'bg-orange-500' },
];

export const INITIAL_EMAILS: EmailItem[] = [
  {
    id: '1',
    senderEmail: 'newsletter@techweekly.com',
    senderName: 'Tech Weekly',
    subject: 'The Future of AI in 2025',
    bodyText: 'This week we explore the rapid advancements in generative AI...',
    bodyHtml: `
      <h2>The Future of AI in 2025</h2>
      <p>This week we explore the rapid advancements in generative AI. From video generation to real-time voice, the landscape is shifting.</p>
      <h3>Key Highlights</h3>
      <ul>
        <li><strong>Gemini 2.5:</strong> The new standard for speed and reasoning.</li>
        <li><strong>Local Models:</strong> Running LLMs on your phone.</li>
      </ul>
      <p>Read on to discover how these changes impact your workflow.</p>
    `,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    isRead: false,
    avatarColor: 'bg-blue-500',
  },
  {
    id: '2',
    senderEmail: 'daily@finance.com',
    senderName: 'Morning Finance',
    subject: 'Market Watch: Bull Run Continues',
    bodyText: 'Stocks hit all time highs as inflation data cools down.',
    bodyHtml: `
      <h2>Market Watch</h2>
      <p>Stocks hit all time highs as inflation data cools down. The S&P 500 broke another record today.</p>
      <p>Investors are looking at the tech sector for continued growth, specifically in semiconductor manufacturing.</p>
    `,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true,
    avatarColor: 'bg-green-500',
  }
];