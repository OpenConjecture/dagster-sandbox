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

export interface ModuleProgress {
  moduleId: string;
  completedSections: string[];
  currentSection: string;
  percentComplete: number;
}