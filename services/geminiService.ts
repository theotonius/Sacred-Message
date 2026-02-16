
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VerseData } from "../types";

const searchCache = new Map<string, VerseData>();

function decode(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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
  async fetchVerseExplanation(query: string): Promise<VerseData> {
    const normalizedQuery = query.trim().toLowerCase();
    
    if (searchCache.has(normalizedQuery)) {
      return searchCache.get(normalizedQuery)!;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze: "${query}". Provide soulful explanation in modern common Bengali. For each section (theological, historical, practical), YOU MUST provide a specific Biblical reference/source (সূত্র). Output JSON.`,
        config: {
          systemInstruction: "You are 'Sacred Word'. Use MODERN COMMON BENGALI only. AVOID Carey/Archaic Bengali. For each analytical part, include a specific 'reference' (e.g., specific verse or scholarly source). Provide: reference, verse text, 3-part explanation with individual sources, a modern prayer, and key themes. Output STRICT JSON.",
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING },
              text: { type: Type.STRING },
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
  },

  async readVerseAloud(text: string, voice: string = 'Kore'): Promise<AudioBuffer> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `দয়া করে এই পবিত্র বাইবেলের পদটি ভক্তিভরে পাঠ করুন: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as any } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
  }
};
