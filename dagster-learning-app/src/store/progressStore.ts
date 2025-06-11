import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProgress, ModuleProgress } from '@/types/content';

interface ProgressState {
  progress: UserProgress | null;
  
  // Actions
  initializeProgress: () => void;
  markSectionComplete: (moduleId: string, sectionId: string) => void;
  updateCurrentSection: (moduleId: string, sectionId: string) => void;
  updateTimeSpent: (moduleId: string, seconds: number) => void;
  setQuizScore: (moduleId: string, score: number) => void;
  getModuleProgress: (moduleId: string) => ModuleProgress | undefined;
  calculateModuleCompletion: (moduleId: string, totalSections: number) => number;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: null,

      initializeProgress: () => {
        const state = get();
        if (!state.progress) {
          set({
            progress: {
              userId: 'user-' + Date.now(),
              startedAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              completedModules: [],
              moduleProgress: {},
              totalTimeSpent: 0,
              currentStreak: 1,
            }
          });
        }
      },

      markSectionComplete: (moduleId: string, sectionId: string) => {
        set((state) => {
          if (!state.progress) return state;

          const moduleProgress = state.progress.moduleProgress[moduleId] || {
            moduleId,
            startedAt: new Date().toISOString(),
            completedSections: [],
            currentSectionId: sectionId,
            timeSpent: 0,
            lastAccessedAt: new Date().toISOString(),
          };

          if (!moduleProgress.completedSections.includes(sectionId)) {
            moduleProgress.completedSections.push(sectionId);
          }

          return {
            progress: {
              ...state.progress,
              lastActiveAt: new Date().toISOString(),
              moduleProgress: {
                ...state.progress.moduleProgress,
                [moduleId]: moduleProgress,
              }
            }
          };
        });
      },

      updateCurrentSection: (moduleId: string, sectionId: string) => {
        set((state) => {
          if (!state.progress) return state;

          const moduleProgress = state.progress.moduleProgress[moduleId] || {
            moduleId,
            startedAt: new Date().toISOString(),
            completedSections: [],
            currentSectionId: sectionId,
            timeSpent: 0,
            lastAccessedAt: new Date().toISOString(),
          };

          moduleProgress.currentSectionId = sectionId;
          moduleProgress.lastAccessedAt = new Date().toISOString();

          return {
            progress: {
              ...state.progress,
              lastActiveAt: new Date().toISOString(),
              moduleProgress: {
                ...state.progress.moduleProgress,
                [moduleId]: moduleProgress,
              }
            }
          };
        });
      },

      updateTimeSpent: (moduleId: string, seconds: number) => {
        set((state) => {
          if (!state.progress) return state;

          const moduleProgress = state.progress.moduleProgress[moduleId];
          if (!moduleProgress) return state;

          return {
            progress: {
              ...state.progress,
              totalTimeSpent: state.progress.totalTimeSpent + seconds,
              moduleProgress: {
                ...state.progress.moduleProgress,
                [moduleId]: {
                  ...moduleProgress,
                  timeSpent: moduleProgress.timeSpent + seconds,
                }
              }
            }
          };
        });
      },

      setQuizScore: (moduleId: string, score: number) => {
        set((state) => {
          if (!state.progress) return state;

          const moduleProgress = state.progress.moduleProgress[moduleId];
          if (!moduleProgress) return state;

          return {
            progress: {
              ...state.progress,
              moduleProgress: {
                ...state.progress.moduleProgress,
                [moduleId]: {
                  ...moduleProgress,
                  quizScore: score,
                }
              }
            }
          };
        });
      },

      getModuleProgress: (moduleId: string) => {
        const state = get();
        return state.progress?.moduleProgress[moduleId];
      },

      calculateModuleCompletion: (moduleId: string, totalSections: number) => {
        const state = get();
        const moduleProgress = state.progress?.moduleProgress[moduleId];
        if (!moduleProgress || totalSections === 0) return 0;

        return Math.round((moduleProgress.completedSections.length / totalSections) * 100);
      },
    }),
    {
      name: 'dagster-learning-progress',
    }
  )
);