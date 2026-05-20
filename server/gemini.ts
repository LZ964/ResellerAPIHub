import { GoogleGenAI } from "@google/genai";
import { getFirebase } from "./config";

let assistantModel: any = null;

export async function executeAgentTurn(uid: string, message: string, history: any[] = []) {
  const { db } = getFirebase();
  const ai = new (GoogleGenAI as any)({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  if (!assistantModel) {
    assistantModel = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  // Load persistent history from DB if not provided
  let chatHistory = history;
  if (db && (!history || history.length === 0)) {
    const historySnap = await db.collection('ai_conversations').doc(uid).get();
    if (historySnap.exists) {
      chatHistory = historySnap.data()?.history || [];
    }
  }

  const systemInstruction = `Tu es l'Agent IA Souverain de ResellerHub. 
  Ton rôle est d'assister les revendeurs dans la gestion de leurs infrastructures (Domaines, SSL, Emails).
  Tu es précis, professionnel et tu as une touche de terminal rétro dans ton langage.
  Tu as accès à l'historique de la conversation pour maintenir le contexte.
  Ta personnalité : Experte, Sûre, Souveraine.`;

  const chat = assistantModel.startChat({
    history: chatHistory.map((h: any) => ({
      role: h.role,
      parts: [{ text: h.content || h.parts[0].text }]
    })),
    systemInstruction: { parts: [{ text: systemInstruction }] }
  });

  const result = await chat.sendMessage(message);
  const responseText = result.response.text();

  // Save updated history
  const updatedHistory = [
    ...chatHistory,
    { role: 'user', content: message, timestamp: new Date() },
    { role: 'model', content: responseText, timestamp: new Date() }
  ];

  if (db) {
    await db.collection('ai_conversations').doc(uid).set({ 
      history: updatedHistory.slice(-50), // Keep last 50
      lastUpdated: new Date() 
    });
  }

  return { text: responseText, history: updatedHistory };
}

export async function clearAgentMemory(uid: string) {
  const { db } = getFirebase();
  if (db) {
    await db.collection('ai_conversations').doc(uid).delete();
  }
}
