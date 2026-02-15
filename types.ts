
export interface VerseData {
  id: string;
  reference: string;
  text: string;
  explanation: {
    theologicalMeaning: string;
    historicalContext: string;
    practicalApplication: string;
  };
  prayer: string;
  keyThemes: string[];
  tags?: string[];
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  ERROR = 'ERROR'
}

export type View = 'SEARCH' | 'SAVED' | 'SETTINGS';
