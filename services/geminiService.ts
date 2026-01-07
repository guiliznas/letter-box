import { GoogleGenAI } from "@google/genai";

export const summarizeNewsletter = async (title: string, content: string): Promise<string> => {
  // A SDK espera process.env.API_KEY conforme as instruções do sistema
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