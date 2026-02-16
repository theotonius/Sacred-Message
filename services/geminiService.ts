
import { GoogleGenAI, Type } from "@google/genai";
import { VerseData } from "../types";

const searchCache = new Map<string, VerseData>();

function extractJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parsing failed:", e);
    throw new Error("সার্ভার থেকে প্রাপ্ত তথ্য সঠিক ফরম্যাটে নেই।");
  }
}

export const geminiService = {
  async fetchVerseExplanation(query: string, version: 'modern' | 'carey' = 'modern'): Promise<VerseData> {
    const normalizedQuery = `${query.trim().toLowerCase()}_${version}`;
    
    if (searchCache.has(normalizedQuery)) {
      return searchCache.get(normalizedQuery)!;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const explanationStyle = version === 'carey' 
      ? "Carey Style (Traditional Sadhu Bhasha, classical tone)" 
      : "Modern Simple Bengali (Soulful, contemporary tone)";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze: "${query}". 
        IMPORTANT RULES:
        1. The "text" field (the core verse/lyric) MUST ALWAYS be in Modern Simple Bengali for clarity.
        2. The "explanation" fields (theologicalMeaning, historicalContext, practicalApplication) MUST be in ${explanationStyle}.
        3. The "prayer" and "keyThemes" should match the explanation style.
        4. For each explanation part, provide a source (সূত্র). 
        Output STRICT JSON.`,
        config: {
          systemInstruction: `You are 'Sacred Word'. Regardless of the user's version preference, the MAIN VERSE (text) should always be Modern Simple Bengali. The EXPLANATION details should follow the selected version: ${explanationStyle}. Ensure deep theological and historical accuracy with references.`,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING },
              text: { type: Type.STRING, description: "Main verse in Modern Simple Bengali" },
              explanation: {
                type: Type.OBJECT,
                properties: {
                  theologicalMeaning: { type: Type.STRING },
                  theologicalReference: { type: Type.STRING },
                  historicalContext: { type: Type.STRING },
                  historicalReference: { type: Type.STRING },
                  practicalApplication: { type: Type.STRING },
                  practicalReference: { type: Type.STRING },
                },
                required: ["theologicalMeaning", "theologicalReference", "historicalContext", "historicalReference", "practicalApplication", "practicalReference"]
              },
              prayer: { type: Type.STRING },
              keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["reference", "text", "explanation", "prayer", "keyThemes"]
          }
        }
      });

      const data = extractJson(response.text || '');
      const result = {
        ...data,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now()
      };

      searchCache.set(normalizedQuery, result);
      return result;
    } catch (error: any) {
      console.error("Gemini API Request Error:", error);
      throw new Error(error.message || "এপিআই এর সাথে সংযোগ করা যাচ্ছে না।");
    }
  }
};
