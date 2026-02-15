
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VerseData } from "../types";

// Standard base64 decode for audio handling
function decode(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decode raw PCM audio from the API
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

// Robust JSON extraction helper
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
    // Strictly using process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following spiritual text or song lyrics: "${query}". 
        Provide a deep, poetic, and soulful explanation in Bengali.`,
        config: {
          systemInstruction: "You are a world-class Bengali Lyrical and Spiritual Scholar. Analyze the input carefully. If it's a song, describe its emotional depth. If it's a verse, explain its wisdom. ALWAYS output in valid JSON. All values must be in Bengali script.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING, description: "Title or Source" },
              text: { type: Type.STRING, description: "The original lyric/verse snippet" },
              explanation: {
                type: Type.OBJECT,
                properties: {
                  theologicalMeaning: { type: Type.STRING, description: "Inner spiritual essence" },
                  historicalContext: { type: Type.STRING, description: "Background info" },
                  practicalApplication: { type: Type.STRING, description: "Personal reflection" },
                },
                required: ["theologicalMeaning", "historicalContext", "practicalApplication"]
              },
              keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 Bengali keyword tags" }
            },
            required: ["reference", "text", "explanation", "keyThemes"]
          }
        }
      });

      const data = extractJson(response.text || '');
      return {
        ...data,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error("Gemini API Request Error:", error);
      throw new Error("দুঃখিত, তথ্যটি খুঁজে পাওয়া যাচ্ছে না। আপনার ইন্টারনেট সংযোগ বা এপিআই সেটিংস চেক করুন।");
    }
  },

  async readVerseAloud(text: string, voice: string = 'Kore'): Promise<AudioBuffer> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `দয়া করে এই লিরিক্সটি অত্যন্ত ভক্তি ও আবেগ দিয়ে পাঠ করুন: ${text}` }] }],
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
