import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '@/types/content';

interface PreferencesState {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: {
        theme: 'system',
        fontSize: 'medium',
        codeTheme: 'vs-dark',
        reduceMotion: false,
        autoPlayVideos: true,
      },

      updatePreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          }
        }));
      },
    }),
    {
      name: 'dagster-learning-preferences',
    }
  )
);