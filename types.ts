
export interface VerseData {
  id: string;
  reference: string;
  text: string;
  explanation: {
    theologicalMeaning: string;
    historicalContext: string;
    practicalApplication: string;
  };
  keyThemes: string[];
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  READING = 'READING',
  ERROR = 'ERROR'
}

export type View = 'SEARCH' | 'SAVED' | 'SETTINGS' | 'DEVELOPER';
