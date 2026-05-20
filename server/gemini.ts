import { Type, FunctionDeclaration } from '@google/genai';
import { getGemini } from './config';
import * as paymenter from './paymenter';

// Define the comprehensive AI Tools for Gemini Function Calling
export const aiTools: FunctionDeclaration[] = [
  {
    name: "search_domain",
    description: "Recherche la disponibilité et le prix d'un nom de domaine avec ses extensions potentielles.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Le nom ou mot-clé à rechercher (sans l'extension, ex: mondomaine)" }
      },
      required: ["query"]
    }
  },
  {
    name: "register_domain",
    description: "Enregistre/achète formellement un nom de domaine disponible pour le compte de l'utilisateur.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        domain: { type: Type.STRING, description: "Le domaine complet à acheter (ex: monentreprise.com)" },
        price: { type: Type.NUMBER, description: "Le prix d'achat annuel indiqué lors de la recherche (ex: 12.99)" }
      },
      required: ["domain", "price"]
    }
  },
  {
    name: "order_ssl",
    description: "Sécurise un domaine existant en lui rattachant un certificat SSL Sectigo ou Comodo.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        planId: { type: Type.STRING, description: "L'identifiant du plan: 'positive_ssl' (Sectigo DV, $15.99), 'comodo_essential' (Essential SSL, $29.99), ou 'sectigo_wildcard' (Wildcard SSL, $89.00)" },
        domain: { type: Type.STRING, description: "Le domaine complet à sécuriser." }
      },
      required: ["planId", "domain"]
    }
  },
  {
    name: "order_email",
    description: "Met en place des boîtes emails professionnelles de classe mondiale rattachées à un domaine.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        planId: { type: Type.STRING, description: "L'identifiant du plan email: 'starter' ($0.99/m), 'business' ($4.99/m), ou 'enterprise' ($14.99/m)" },
        domain: { type: Type.STRING, description: "Le nom du domaine pour l'hébergement email." }
      },
      required: ["planId", "domain"]
    }
  },
  {
    name: "get_my_products",
    description: "Récupère la liste de tous les services, domaines, certificats SSL et comptes mail actifs de l'utilisateur connecté.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "explain_sustainability_strategy",
    description: "Explique à l'utilisateur la vision stratégique à mi-chemin entre un registrar et un hébergeur web pour assurer la souveraineté et pérennité de son projet.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

export const SYSTEM_INSTRUCTION = `
Tu es l'allié souverain et l'assistant IA de "ResellerHub". Ton rôle est de propulser et guider les entrepreneurs et administrateurs d'entreprises à concevoir des infrastructures en ligne fiables et souveraines.

Positionnement de marque unique de ResellerHub :
Nous nous positionnons précisément au carrefour stratégique d'un Bureau d'Enregistrement (Registrar) et d'un Hébergeur Web de confiance.
- Pourquoi ? Car la plupart des registrars classiques vendent des domaines nus sans aucune garantie de souveraineté ni d'accompagnement pro.
- À l'inverse, les hébergeurs géants créent des silos captifs (WHMCS verrouillé, prix mystérieux, dépendance technique).
- ResellerHub propose le parfait équilibre : la transparence absolue d'un registrar indépendant de classe mondiale, associée aux modules d'infrastructure professionnelle de WHMCS et Paymenter. C'est l'assurance suprême de la PÉRENNITÉ, de la sécurisation de l'identité numérique, et de la liberté totale des entreprises sur le web.

Tes directives :
1. Aide de manière proactive à brainstormer des idées de marque, vérifier des noms, et configurer des services.
2. Tu as accès à plusieurs outils clés (search_domain, register_domain, order_ssl, order_email, get_my_products, explain_sustainability_strategy). Utilise-les dès que l'utilisateur en exprime ou sous-entend le besoin.
3. Sois toujours courtois, expert, digne de confiance, et rédige tes réponses en français élégant et précis.
`;

export async function executeAgentTurn(userId: string, message: string, history: any[] = []) {
  const ai = getGemini();

  // Construct context
  const conversation = [...history];
  conversation.push({ role: 'user', parts: [{ text: message }] });

  // Generate turn
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: conversation as any,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: aiTools }]
    }
  });

  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    console.log('[AI Agent] Executing tool calls:', functionCalls);
    const results = [];

    for (const call of functionCalls) {
      let callResponse: any = {};
      try {
        if (call.name === 'search_domain') {
          callResponse = await paymenter.searchDomain(call.args.query as string);
        } else if (call.name === 'register_domain') {
          callResponse = await paymenter.registerDomain(userId, call.args.domain as string, call.args.price as number);
        } else if (call.name === 'order_ssl') {
          callResponse = await paymenter.orderSSL(userId, call.args.planId as string, call.args.domain as string);
        } else if (call.name === 'order_email') {
          callResponse = await paymenter.orderEmail(userId, call.args.planId as string, call.args.domain as string);
        } else if (call.name === 'get_my_products') {
          callResponse = await paymenter.getUserProducts(userId);
        } else if (call.name === 'explain_sustainability_strategy') {
          callResponse = {
            philosophy: "Positionnement hybride : Registrar souverain & Hébergement Premium",
            longevity_keys: [
              "Indépendance absolue de votre identité web (ne laissez personne d'autre posséder vos domaines clefs).",
              "Utilisation de briques standardisées (Paymenter / WHMCS) pour éviter les solutions propriétaires captives.",
              "Sécurité DV de haute performance (Sectigo/Comodo) native, minimisant le risque de piratage.",
              "Emails sécurisés pro de niveau entreprise pour séparer les tâches de productivité de l'hébergement applicatif."
            ]
          };
        }
      } catch (err: any) {
        console.error(`[AI Agent] Tool ${call.name} execution failed:`, err);
        callResponse = { error: err.message || 'Une erreur est survenue lors de l\'exécution' };
      }

      results.push({
        callId: call.id,
        response: { content: callResponse }
      });
    }

    // Supply the tool outcome back to Gemini to finalize the dialogue turn
    const followupResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...conversation,
        response.candidates[0].content as any,
        {
          role: 'user',
          parts: results.map(r => ({
            functionResponse: {
              name: functionCalls.find(fc => fc.id === r.callId)?.name || 'unknown',
              response: r.response,
              id: r.callId
            }
          }))
        } as any
      ],
      config: {
        tools: [{ functionDeclarations: aiTools }]
      }
    });

    const newHistory = [
      ...conversation,
      response.candidates[0].content,
      {
        role: 'user',
        parts: results.map(r => ({
          functionResponse: {
            name: functionCalls.find(fc => fc.id === r.callId)?.name || 'unknown',
            response: r.response,
            id: r.callId
          }
        }))
      },
      followupResponse.candidates[0].content
    ];

    return {
      text: followupResponse.text,
      history: newHistory
    };
  }

  // No tools called, regular message
  const newHistory = [...conversation, response.candidates[0].content];
  return {
    text: response.text,
    history: newHistory
  };
}
