
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

export const geminiService = {
  async fetchVerseExplanation(query: string): Promise<VerseData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a biblical scholar specializing in the Bengali language. 
      Explain the Bible verse or theme: "${query}". 
      All text fields must be in Bengali script.
      Provide:
      1. reference: The standard Bible reference (e.g., যোহন ৩:১৬).
      2. text: The full verse text in Bengali.
      3. explanation.theologicalMeaning: Deep theological insight in Bengali.
      4. explanation.historicalContext: Historical background in Bengali.
      5. explanation.practicalApplication: Practical life application in Bengali.
      6. keyThemes: An array of 3-4 Bengali words representing themes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reference: { type: Type.STRING },
            text: { type: Type.STRING },
            explanation: {
              type: Type.OBJECT,
              properties: {
                theologicalMeaning: { type: Type.STRING },
                historicalContext: { type: Type.STRING },
                practicalApplication: { type: Type.STRING },
              },
              required: ["theologicalMeaning", "historicalContext", "practicalApplication"]
            },
            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["reference", "text", "explanation", "keyThemes"]
        }
      }
    });

    const text = response.text || '{}';
    try {
      const data = JSON.parse(text);
      return {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      };
    } catch (e) {
      console.error("JSON Parsing failed", text);
      throw new Error("Invalid response format");
    }
  },

  async readVerseAloud(text: string, voice: string = 'Kore'): Promise<AudioBuffer> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `অনুগ্রহ করে এই পবিত্র পদটি গম্ভীরভাবে পাঠ করুন: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as any } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio failed");
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
  }
};
