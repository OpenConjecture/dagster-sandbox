export interface Curriculum {
  version: string;
  lastUpdated: string;
  levels: Level[];
}

export interface Level {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  modules: string[];
}

export interface Module {
  id: string;
  level: string;
  title: string;
  description: string;
  estimatedHours: number;
  prerequisites: string[];
  learningObjectives: string[];
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  type: 'theory' | 'hands-on' | 'lab';
  estimatedMinutes: number;
  file: string;
  content?: string;
}

export interface UserProgress {
  userId: string;
  startedAt: string;
  lastActiveAt: string;
  completedModules: string[];
  moduleProgress: Record<string, ModuleProgress>;
  totalTimeSpent: number; // in seconds
  currentStreak: number;
}

export interface ModuleProgress {
  moduleId: string;
  startedAt: string;
  completedSections: string[];
  currentSectionId: string;
  quizScore?: number;
  timeSpent: number; // in seconds
  lastAccessedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  codeTheme: 'vs-dark' | 'dracula' | 'github';
  reduceMotion: boolean;
  autoPlayVideos: boolean;
}