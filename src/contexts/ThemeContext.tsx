import { createContext, useContext, useEffect } from 'react';

interface ThemeContextValue {
  theme: 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    try {
      localStorage.removeItem('unicircle_theme');
    } catch {}
  }, []);

  return <ThemeContext.Provider value={{ theme: 'dark' }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
