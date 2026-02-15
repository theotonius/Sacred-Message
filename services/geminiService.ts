
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VerseData } from "../types";

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

function cleanJsonResponse(text: string): string {
  if (!text) return '{}';
  // Remove markdown blocks if present
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  }
  // Remove any potential text before or after the JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
}

export const geminiService = {
  async fetchVerseExplanation(query: string): Promise<VerseData> {
    // Re-initialize AI client on every call to ensure fresh API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Spiritual Verse, Song Lyrical or Theme: "${query}". Provide a deep and poetic explanation in Bengali.`,
        config: {
          systemInstruction: "You are a Bengali Spiritual and Musical Scholar. Provide a detailed analysis of the input verse or lyrics. Output MUST be a valid JSON object. All values must be in Bengali script.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING, description: "Reference or Title in Bengali" },
              text: { type: Type.STRING, description: "Original verse or lyrics in Bengali" },
              explanation: {
                type: Type.OBJECT,
                properties: {
                  theologicalMeaning: { type: Type.STRING, description: "Deeper meaning in Bengali" },
                  historicalContext: { type: Type.STRING, description: "Context or background in Bengali" },
                  practicalApplication: { type: Type.STRING, description: "Personal application or reflection in Bengali" },
                },
                required: ["theologicalMeaning", "historicalContext", "practicalApplication"]
              },
              keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 Bengali tags" }
            },
            required: ["reference", "text", "explanation", "keyThemes"]
          }
        }
      });

      const rawText = response.text;
      const cleanedText = cleanJsonResponse(rawText || '');
      
      const data = JSON.parse(cleanedText);
      return {
        ...data,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        throw new Error("এপিআই কী (API Key) এর সমস্যা। অনুগ্রহ করে সেটিংস চেক করুন।");
      }
      throw new Error("সার্ভার থেকে তথ্য সংগ্রহ করা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।");
    }
  },

  async readVerseAloud(text: string, voice: string = 'Kore'): Promise<AudioBuffer> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `দয়া করে এই অংশটি ভক্তিভরে পাঠ করুন: ${text}` }] }],
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
