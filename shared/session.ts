import type { TrainerId } from './trainers.ts';

export interface Pokemon {
  id: number;
  name: string;
  spriteUrl: string | null;
  types: string[];
  description: string | null;
  heightDm: number | null;
}

export interface SessionRecord {
  sessionId: string;
  shortId: string;
  projectName: string | null;
  pokemon: Record<TrainerId, Pokemon>;
  lastObservedAt: string | null;
  lastFileModifiedAt: string | null;
  observation: 'recent-event' | 'turn-complete' | 'quiet' | 'unknown';
  usage: 'active' | 'inactive' | 'unknown';
  activity: { kind: 'unknown' | 'started' | 'tool' | 'result' | 'message' | 'complete' | 'aborted'; label: string; at: string | null; toolCalls: number; records: number };
}

export type SessionView = Omit<SessionRecord, 'pokemon'> & { pokemon: Pokemon };

export interface Snapshot {
  sessions: SessionRecord[];
  error: string | null;
}
