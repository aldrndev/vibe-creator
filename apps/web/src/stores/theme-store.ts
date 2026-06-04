import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',

      toggleTheme: () => {
        set({ theme: 'dark' });
      },

      setTheme: () => {
        set({ theme: 'dark' });
      },
    }),
    {
      name: 'vibe-creator-theme',
      merge: (_persistedState, currentState) => ({ ...currentState, theme: 'dark' }),
    },
  ),
);
