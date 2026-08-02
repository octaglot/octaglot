import { useEffect, useState } from 'react';

/* Theme preference. Held in localStorage rather than the app database: it has
   to be read and applied by the small script in index.html before React mounts,
   otherwise a frame of white flashes on startup. The same key is written
   there. */

export type Theme = 'system' | 'light' | 'dark';

export const THEME_KEY = 'octaglot-theme';
const DEFAULT: Theme = 'dark';

function isTheme(v: unknown): v is Theme {
  return v === 'system' || v === 'light' || v === 'dark';
}

export function storedTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolves the choice to a concrete theme and writes it to the root element. */
export function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(storedTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* With localStorage disabled the theme still works for this session */
    }
  }, [theme]);

  // While "system" is selected, follow macOS appearance changes immediately.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return [theme, setThemeState] as const;
}
