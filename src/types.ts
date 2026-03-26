export type Tool = 'line' | 'arrow' | 'circle' | 'rect' | 'pen' | 'segment' | 'eraser' | null;

export interface Annotation {
  id: string;
  tool: Tool;
  color: string;
  points: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export type ViewMode = 'home' | 'single' | 'dual';

export interface AppSettings {
  autoPlayback: boolean;
  playbackDelay: number;
  recordDelay: number;
  enableAudio: boolean;
}
