import { GoogleGenAI } from "@google/genai";
import { EmailItem } from "../types";

export const summarizeNewsletter = async (title: string, content: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resuma esta newsletter intitulada "${title}" em no máximo 4 tópicos curtos e impactantes. Use emojis relacionados aos temas. \n\nConteúdo: ${content.substring(0, 15000)}`,
      config: {
        systemInstruction: "Você é um assistente de leitura produtiva. Seu objetivo é extrair o valor real de newsletters longas, removendo anúncios e introduções irrelevantes.",
        temperature: 0.7,
      },
    });

    return response.text || "Não foi possível extrair um resumo deste conteúdo.";
  } catch (error) {
    console.error("Erro no Gemini:", error);
    return "Ocorreu um erro ao tentar resumir. Verifique sua conexão ou a chave de API.";
  }
};

export const summarizeDailyDigest = async (date: string, emails: EmailItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (emails.length === 0) return "Nenhum e-mail encontrado para esta data.";

  const emailsContent = emails.map((e, i) => `[Email ${i + 1}] Assunto: ${e.subject}\nConteúdo: ${e.bodyText}`).join('\n\n---\n\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crie um resumo executivo de todas as newsletters recebidas no dia ${date}. 
      Organize por temas principais. Para cada tema, sintetize o que há de mais importante vindo dos diferentes e-mails.
      Use um tom profissional, porém engajador. Use emojis.
      
      E-mails do dia:\n${emailsContent.substring(0, 20000)}`,
      config: {
        systemInstruction: "Você é um curador de conteúdo sênior. Sua missão é fazer o usuário economizar tempo, entregando apenas o 'suco' das notícias do dia em um formato digestível e elegante.",
        temperature: 0.5,
      },
    });

    return response.text || "Não foi possível gerar o resumo diário.";
  } catch (error) {
    console.error("Erro no Gemini Digest:", error);
    return "Erro ao processar o resumo do dia. Pode ser que o volume de texto seja muito grande ou a API esteja instável.";
  }
};