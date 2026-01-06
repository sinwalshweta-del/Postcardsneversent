import { GoogleGenAI, Type } from "@google/genai";
import { VibeResponse } from "../types";

const generateSeed = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const distillTravelVibe = async (location: string, input: string): Promise<VibeResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [{ text: `Location: ${location}\nUser Story: "${input}"` }] },
    config: {
      systemInstruction: "You are a poetic travel archiver. Your task is to distill a travel memory into a stylized vibe JSON. CRITICAL: Correcty identify the 'country' based on the provided 'Location' (e.g., if Location is 'Delhi', country MUST be 'India'). If the location is vague, infer the most likely country from the user story context. Focus on extracting specific sensory visual elements from the user story.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          emotion: { type: Type.STRING },
          visualMood: { type: Type.STRING },
          visualMetaphor: { type: Type.STRING },
          colorFeeling: { type: Type.STRING },
          distilledSentence: { type: Type.STRING },
          palette: { type: Type.ARRAY, items: { type: Type.STRING } },
          primaryColor: { type: Type.STRING },
          secondaryColor: { type: Type.STRING },
          country: { type: Type.STRING, description: "The specific country the location belongs to (e.g. India, Japan, France)." }
        },
        required: ["emotion", "visualMood", "visualMetaphor", "colorFeeling", "distilledSentence", "palette", "primaryColor", "secondaryColor", "country"]
      }
    }
  });
  const text = response.text;
  if (!text) throw new Error("No response from AI model.");
  return JSON.parse(text);
};

export const generatePostcardVisual = async (vibe: VibeResponse, location: string, rawInput: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Refined prompt to use the raw memory more literally while keeping the artistic medium
  const prompt = `Detailed atmospheric illustration based on this memory: "${rawInput}". 
    Setting: ${location}. 
    Art Style: A high-quality poetic stylized painting. 
    Mood: ${vibe.visualMood}. 
    Colors: ${vibe.palette.join(', ')}. 
    Incorporate the metaphor of ${vibe.visualMetaphor}. 
    Capture the specific objects and environment described by the user vividly.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { 
      imageConfig: { aspectRatio: "3:4" }, 
      seed: generateSeed(rawInput) 
    },
  });
  
  const part = response.candidates?.[0].content.parts.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Failed to generate image.");
  return `data:image/png;base64,${part.inlineData.data}`;
};

export const generatePostcardMotion = async (vibe: VibeResponse, imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: "Subtle atmospheric movement, light shifting, cinematic and slow movement that breathes life into the painting.",
    image: { imageBytes: imageBase64.split(',')[1], mimeType: 'image/png' },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
  });
  while (!operation.done) {
    await new Promise(r => setTimeout(r, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
};
