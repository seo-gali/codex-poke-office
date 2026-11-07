export interface Pokemon {
  id: number;
  name: string;
  spriteUrl: string | null;
}

export interface SessionView {
  sessionId: string;
  shortId: string;
  projectName: string | null;
  pokemon: Pokemon;
  lastObservedAt: string | null;
  lastFileModifiedAt: string | null;
  observation: 'recent-event' | 'turn-complete' | 'quiet' | 'unknown';
  usage: 'active' | 'inactive' | 'unknown';
}

export interface Snapshot {
  sessions: SessionView[];
  error: string | null;
}
