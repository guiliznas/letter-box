import { EmailItem } from '../types';
import { COLORS } from '../constants';

// Safe environment variable access
const getEnv = (key: string) => {
  // Try process.env first (Standard/Bundlers)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}

  // Try import.meta.env (Vite/ESM)
  try {
    // @ts-ignore
    if (import.meta?.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  
  return '';
};

// Environment variables
const API_KEY = getEnv('VITE_GOOGLE_API_KEY');
const CLIENT_ID = getEnv('VITE_GOOGLE_CLIENT_ID');
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize Google API Client
export const initGoogleClient = async (onInitComplete: () => void) => {
  if (!API_KEY || !CLIENT_ID) {
    console.warn("Google API Key or Client ID missing in environment variables.");
    console.warn("Please set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID");
    return;
  }

  const gapiLoaded = new Promise<void>((resolve) => {
    // @ts-ignore
    if (window.gapi) {
        // @ts-ignore
      window.gapi.load('client', async () => {
        // @ts-ignore
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        resolve();
      });
    } else {
        // Retry if script hasn't loaded yet
        const interval = setInterval(() => {
             // @ts-ignore
            if (window.gapi) {
                clearInterval(interval);
                 // @ts-ignore
                window.gapi.load('client', async () => {
                     // @ts-ignore
                    await window.gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    resolve();
                });
            }
        }, 500);
    }
  });

  const gisLoaded = new Promise<void>((resolve) => {
     // @ts-ignore
    if (window.google) {
         // @ts-ignore
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
      });
      gisInited = true;
      resolve();
    } else {
        const interval = setInterval(() => {
            // @ts-ignore
            if (window.google) {
                clearInterval(interval);
                // @ts-ignore
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', 
                });
                gisInited = true;
                resolve();
            }
        }, 500);
    }
  });

  await Promise.all([gapiLoaded, gisLoaded]);
  onInitComplete();
};

// Helper to decode Base64Url
const decodeBase64 = (data: string) => {
  try {
    return decodeURIComponent(
      atob(data.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    return "";
  }
};

// Recursive function to find HTML/Text parts
const getBody = (payload: any): { html: string, text: string } => {
  let html = '';
  let text = '';

  if (payload.body && payload.body.data) {
    const decoded = decodeBase64(payload.body.data);
    if (payload.mimeType === 'text/html') html = decoded;
    if (payload.mimeType === 'text/plain') text = decoded;
  }

  if (payload.parts) {
    payload.parts.forEach((part: any) => {
      const result = getBody(part);
      if (result.html) html = result.html;
      if (result.text) text = result.text;
    });
  }

  return { html, text };
};

const getHeader = (headers: any[], name: string) => {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
};

// Mesma cor para o mesmo remetente em qualquer dispositivo.
const colorForSender = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
};

export interface GmailPage {
  emails: EmailItem[];
  nextPageToken: string | null;
}

// Uma página de e-mails, já filtrada por remetente na própria query do Gmail.
export const fetchGmailPage = async (
  senderEmails: string[],
  pageToken: string | null = null,
  limit = 20
): Promise<GmailPage> => {
  // @ts-ignore
  if (!gapiInited || !window.gapi?.client?.gmail) {
    throw new Error('Gmail API not initialized');
  }

  if (senderEmails.length === 0) return { emails: [], nextPageToken: null };

  const query = `from:(${senderEmails.join(' OR ')})`;

  // @ts-ignore
  const listResponse = await window.gapi.client.gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    q: query,
    ...(pageToken ? { pageToken } : {}),
  });

  const messages = listResponse.result.messages;
  const nextPageToken = listResponse.result.nextPageToken || null;

  if (!messages || messages.length === 0) return { emails: [], nextPageToken };

  const emails = await Promise.all(
    messages.map(async (msg: any) => {
      // @ts-ignore
      const detail = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
      });

      const result = detail.result;
      const headers = result.payload.headers;
      const { html, text } = getBody(result.payload);

      const from = getHeader(headers, 'From');
      // "Name <email@domain.com>"
      const nameMatch = from.match(/(.*)<(.*)>/);
      const senderName = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : from.split('@')[0];
      const senderEmail = nameMatch ? nameMatch[2].trim() : from;

      return {
        id: result.id,
        senderEmail,
        senderName,
        subject: getHeader(headers, 'Subject') || '(Sem assunto)',
        bodyHtml: html || `<p>${text}</p>`,
        bodyText: text || 'Sem pré-visualização',
        receivedAt: new Date(parseInt(result.internalDate)).toISOString(),
        isRead: !result.labelIds.includes('UNREAD'),
        avatarColor: colorForSender(senderEmail),
      } as EmailItem;
    })
  );

  return { emails, nextPageToken };
};