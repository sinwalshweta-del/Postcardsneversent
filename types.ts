
export type PostcardTexture = 'grainy' | 'matte' | 'simple';
export type MoodKey = 'nostalgic' | 'joyful' | 'bittersweet' | 'peaceful' | 'melancholic';

export interface VibeResponse {
  emotion: MoodKey;
  visualMood: string;
  visualMetaphor: string;
  colorFeeling: string;
  distilledSentence: string;
  palette: string[];
  primaryColor: string;
  secondaryColor: string;
  country: string;
}

export interface Postcard extends VibeResponse {
  id: string;
  location: string;
  toName: string;
  fromName: string;
  rawInput: string;
  message: string;
  imageUrl: string;
  videoUrl?: string;
  timestamp: number;
}
