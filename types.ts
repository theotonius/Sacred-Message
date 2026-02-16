
export interface VerseData {
  id: string;
  reference: string;
  text: string;
  explanation: {
    theologicalMeaning: string;
    theologicalReference: string;
    historicalContext: string;
    historicalReference: string;
    practicalApplication: string;
    practicalReference: string;
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
