
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VerseData } from "../types";

// Manual decode function following guidelines
function decode(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom audio decoding logic for raw PCM data
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

// Utility to handle JSON extraction if the model returns markdown blocks
function extractJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Extraction failed:", e);
    throw new Error("সার্ভার থেকে প্রাপ্ত তথ্য সঠিক ফরম্যাটে নেই।");
  }
}

export const geminiService = {
  async fetchVerseExplanation(query: string): Promise<VerseData> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("এপিআই কী (API Key) সঠিকভাবে সেট করা নেই।");
    }

    // Always create a new instance with the current API key right before the call
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        // Updated to gemini-3-flash-preview for general text analysis task
        model: "gemini-3-flash-preview",
        contents: `Analyses the following spiritual song lyrics, poem, or Bible verse: "${query}". 
        Provide a deep, poetic, and soulful explanation in Bengali.`,
        config: {
          systemInstruction: "You are a world-class Bengali Lyrical and Spiritual Scholar. Your goal is to provide a structured analysis of the input text. If it's a song, identify the mood. If it's a verse, explain the theology. ALWAYS output in valid JSON. Use Bengali script for all explanations.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reference: { type: Type.STRING, description: "Title of the song or Bible reference" },
              text: { type: Type.STRING, description: "The original lyrics or verse snippet" },
              explanation: {
                type: Type.OBJECT,
                properties: {
                  theologicalMeaning: { type: Type.STRING, description: "Inner spiritual meaning" },
                  historicalContext: { type: Type.STRING, description: "Background context" },
                  practicalApplication: { type: Type.STRING, description: "Personal reflection or life lesson" },
                },
                required: ["theologicalMeaning", "historicalContext", "practicalApplication"]
              },
              keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 emotional or spiritual tags" }
            },
            required: ["reference", "text", "explanation", "keyThemes"]
          }
        }
      });

      // Use .text property directly
      const data = extractJson(response.text || '');
      return {
        ...data,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      throw new Error(error.message || "সার্ভার থেকে তথ্য পাওয়া যায়নি।");
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
    
    // Cross-browser AudioContext initialization
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
  }
};
