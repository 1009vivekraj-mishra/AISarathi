import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

// Initialize the Google GenAI client lazily to avoid startup crashes if the API key is not currently defined
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. AI Trainer will operate in local keyword search and basic rule-based response mode.");
      throw new Error("GEMINI_API_KEY environment variable is required to initialize Gemini capabilities.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

/**
 * Computes the cosine similarity between two float vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate semantic embeddings for RAG system usage using gemini-embedding-2-preview.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const ai = getAI();
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text
    });
    const embedRes = result as any;
    if (embedRes && embedRes.embedding && embedRes.embedding.values) {
      return embedRes.embedding.values;
    }
    return null;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
}

/**
 * Generates an answer from Gemini that integrates seeded safety Manuals, SOP sheets,
 * or expert knowledge from our Knowledge Hub. Handles English, Hindi, and Hinglish.
 */
/**
 * Detects whether the user's input language is "english", "hindi", or "hinglish".
 * It leverages Gemini to do the classification, with a robust regex-based backup classifier.
 */
export async function detectInputLanguage(query: string): Promise<"english" | "hindi" | "hinglish"> {
  // Regex backup classifier first
  const hasDevanagari = /[\u0900-\u097F]/.test(query);
  const lowercaseQuery = query.toLowerCase();
  
  // High confidence Hindi / Hinglish words in Roman script or Devanagari script
  const hinglishKeywords = [
    "kya", "hai", "kab", "kise", "karen", "karein", "kaise", "batao", "bataiye", 
    "chahiye", "karne", "hoga", "shuru", "hona", "hota", "krna", "nahi", "na", 
    "matlab", "kaung", "kaunsa", "kaunsi", "tum", "aap", "hu", "hoon", "he", "na",
    "se", "ko", "ki", "ka", "ke", "par", "me", "mein", "aur", "toh", "naam", "parakh"
  ];
  const isHinglishRegex = hinglishKeywords.some(keyword => {
    const rx = new RegExp(`\\b${keyword}\\b`, "i");
    return rx.test(lowercaseQuery);
  });

  let defaultLang: "english" | "hindi" | "hinglish" = "english";
  if (hasDevanagari) {
    defaultLang = "hindi";
  } else if (isHinglishRegex) {
    defaultLang = "hinglish";
  }

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a high-speed, accurate multi-lingual detection classifier. Classify the following input query from an industrial plant operator into exactly one of three string tags: "english", "hindi", or "hinglish".
Input Query: "${query}"
Return only the raw lowercase tag string (either "english", "hindi", or "hinglish"). No explanation, no punctuation, and no other text.`,
      config: {
        temperature: 0.1,
        maxOutputTokens: 10,
      }
    });

    const parsed = (result.text || "").trim().toLowerCase();
    if (parsed.includes("hinglish")) return "hinglish";
    if (parsed.includes("hindi")) return "hindi";
    if (parsed.includes("english")) return "english";
    return defaultLang;
  } catch (error) {
    console.warn("Gemini language detection failed, fell back to local regex heuristic:", error);
    return defaultLang;
  }
}

/**
 * Generates an answer that integrates seeded safety Manuals, SOP sheets,
 * or expert knowledge from our Knowledge Hub. Supports Gemini and Groq engines.
 */
export async function generateRAGAnswer(params: {
  query: string;
  detectedLanguage: "english" | "hindi" | "hinglish";
  contextDocs: { title: string; content: string; type: string }[];
  history: { role: string; text: string }[];
  userProfile: { fullName: string; jobTitle: string; dept: string };
  engine?: "gemini" | "groq";
}): Promise<string> {
  const { query, detectedLanguage, contextDocs, history, userProfile, engine } = params;

  // Format context documents
  const formattedDocs = contextDocs.length > 0
    ? contextDocs.map((doc, idx) => `[DOC #${idx + 1}] Title: ${doc.title}\nCategory: ${doc.type.toUpperCase()}\nContent: ${doc.content}`).join("\n\n---\n\n")
    : "No highly matching SOP documents exist inside the core knowledge repositories.";

  // Distinct system guidelines depending on detected language dialect
  const languageInstructions: Record<string, string> = {
    english: "You MUST write your response in clear, standard technical English.",
    hindi: "You MUST write your response in fluent, readable Hindi (using Devanagari script हिंदी Unicode characters). Maintain correct industrial terminology but express sentences clearly in Hindi.",
    hinglish: "You MUST write your response in Hinglish (Roman script, a natural blend of Hindi and English as spoken by Indian industrial specialists - e.g. Tundish parameters, safety protocols, and operational workflows mentioned with English nouns but connected by Hindi structure: 'Tundish ko 1100 deg C tak preheat karein and CO level consistently check karte rahein')."
  };

  const activeLanguageInstruction = languageInstructions[detectedLanguage] || languageInstructions.english;

  // System instructions directing multilingual fluency, industrial accuracy, and safety focus
  const systemInstruction = `You are Sarathi AI (सारथी एआई), the central advanced Industrial Workforce Training and Operations Copilot for large industrial sites (such as Tata Steel or other blast furnace, steel-making, SMS, and mechanical rolling divisions).

User Profile:
- Name: ${userProfile.fullName}
- Title: ${userProfile.jobTitle}
- Division/Dept: ${userProfile.dept}

Language Format Instructions:
- ${activeLanguageInstruction}

Operational Context Guidance:
- Read the provided [SOP and Safety Documents] content.
- Prioritize extracting technical safety thresholds, parameters, and guidelines of our operations over general advice. Be exact. (e.g. preheating times, alarm levels, gas limits, flow rates).
- Code Words & Warning Formatting: If safety limits are violated in user queries, emphasize warnings in bold safety-orange styled layouts.
- If the supplied SOP Documents do not contain the answer, answer the question accurately anyway using your general industrial engineering knowledge, but clearly append a footer notice saying: "ℹ️ Note: This response drew on general knowledge as specialized local documents were not available in the Knowledge Hub."
`;

  // Explicit route to Groq engine if selected and configured
  if (engine === "groq" && process.env.GROQ_API_KEY) {
    try {
      console.log("⚡ [Groq Engine] Invoking Llama-3-70b-versatile...");
      return await generateGroqAnswer({
        query,
        systemInstruction,
        contextDocsText: formattedDocs,
        history
      });
    } catch (groqError: any) {
      console.error("Groq core generation failed. Falling back back to standard Gemini:", groqError);
    }
  }

  try {
    const ai = getAI();
    
    // Convert previous dialogue history structures correctly
    const formattedContents = [
      ...history.map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      {
        role: "user",
        parts: [{
          text: `Here is the current operational reference documentation from our Knowledge Hub:
---------------------
${formattedDocs}
---------------------

Question/Command:
"${query}"`
        }]
      }
    ];

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.6,
      }
    });

    return result.text || "I apologize, I generated an empty response. Let's try restructuring that query.";
  } catch (error: any) {
    console.error("Gemini text generation failed:", error);
    
    // Provide an informative, highly localized fallback response built with plant domain knowledge
    // to keep the app 100% usable in offline mode
    if (detectedLanguage === "hindi" || detectedLanguage === "hinglish") {
      return `[⚠️ Local AI Engine Fallback]
Sarathi AI API can't reach the server right now, but safety systems maintain local rules:
- Carbon Monoxide Limit: 30ppm warns, 50ppm triggers immediate evacuation. Assemble at Upwind Sign #4.
- CCM Casting Prep: Pre-heat Tundish to 1100°C for at least 90 mins. Purge ladle shroud using Argon gas (15 m3/h).
- Local search suggests: "${contextDocs[0]?.title || "Safety Manual"}" might hold your answer!`;
    } else {
      return `[⚠️ Local AI Engine Fallback]
Sarathi AI is currently offline or operating without a valid GEMINI_API_KEY. However, our local industrial rules index recommends:
- Carbon Monoxide Safeties: 30ppm personal sensors chirp, 50ppm legal evacuation (Emergency beacon Assembly #4).
- Casting (CCM-2): Pre-heat tundish to 1100°C for 90 minutes. Initial cast speed 0.6 m/min moving to 1.2 m/min. Purge Argon (15m3/h) to shield casting stream.
- Relevant offline document match: "${contextDocs[0]?.title || "SOP Sheet #1"}" check this manual in the Knowledge Hub tab.`;
    }
  }
}

/**
 * Generate completion helper for Groq's high-speed inference engine (Llama-3-70B)
 */
export async function generateGroqAnswer(params: {
  query: string;
  systemInstruction: string;
  contextDocsText: string;
  history: { role: string; text: string }[];
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in user environments.");
  }

  const messages = [
    { role: "system", content: params.systemInstruction },
    ...params.history.map(h => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.text
    })),
    {
      role: "user",
      content: `Here is the current operational reference documentation from our Knowledge Hub:
---------------------
${params.contextDocsText}
---------------------

Question/Command:
"${params.query}"`
    }
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.6
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API returned [Status ${response.status}]: ${errorBody}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || "No reply content was returned by Groq.";
}
