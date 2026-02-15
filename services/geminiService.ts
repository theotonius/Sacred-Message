
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
  // Remove markdown code blocks if present
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

export const geminiService = {
  async fetchVerseExplanation(query: string): Promise<VerseData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Bible Verse or Spiritual Theme to explain: "${query}". 
      Explain this deeply in Bengali language.`,
      config: {
        systemInstruction: "You are a professional Bengali Biblical Scholar. Provide structured, accurate, and spiritually deep information. Ensure all Bengali text is grammatically correct. Output must be in valid JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reference: { type: Type.STRING, description: "The Bible reference in Bengali (e.g., যোহন ৩:১৬)" },
            text: { type: Type.STRING, description: "The full verse text in Bengali script" },
            explanation: {
              type: Type.OBJECT,
              properties: {
                theologicalMeaning: { type: Type.STRING, description: "Spiritual and theological meaning in Bengali" },
                historicalContext: { type: Type.STRING, description: "Historical background of the verse in Bengali" },
                practicalApplication: { type: Type.STRING, description: "How to apply this in daily life in Bengali" },
              },
              required: ["theologicalMeaning", "historicalContext", "practicalApplication"]
            },
            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 key theme keywords in Bengali" }
          },
          required: ["reference", "text", "explanation", "keyThemes"]
        }
      }
    });

    const rawText = response.text || '{}';
    const cleanedText = cleanJsonResponse(rawText);
    
    try {
      const data = JSON.parse(cleanedText);
      return {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      };
    } catch (e) {
      console.error("JSON Parsing failed. Raw:", rawText, "Cleaned:", cleanedText);
      throw new Error("সার্ভার থেকে সঠিক তথ্য পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
    }
  },

  async readVerseAloud(text: string, voice: string = 'Kore'): Promise<AudioBuffer> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `অনুগ্রহ করে এই পবিত্র পদটি গম্ভীর ও স্পষ্টভাবে পাঠ করুন: ${text}` }] }],
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
