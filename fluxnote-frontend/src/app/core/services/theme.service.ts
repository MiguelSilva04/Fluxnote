import { Injectable } from '@angular/core';

export type AppTheme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'fluxnote-theme';
const DEFAULT_THEME: AppTheme = 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme: AppTheme = DEFAULT_THEME;
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  get currentTheme(): AppTheme {
    return this._theme;
  }

  /**
   * Initializes theme from localStorage and applies it.
   * Should be called once at app startup.
   */
  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    this._theme = saved && ['light', 'dark', 'auto'].includes(saved) ? saved : DEFAULT_THEME;
    this.applyTheme();

    // Listen for OS preference changes (relevant when theme is 'auto')
    this.mediaQuery.addEventListener('change', () => {
      if (this._theme === 'auto') {
        this.applyTheme();
      }
    });
  }

  /**
   * Change and persist the theme preference.
   */
  setTheme(theme: AppTheme): void {
    this._theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyTheme();
  }

  /**
   * Returns true when the effective appearance is dark.
   */
  get isDark(): boolean {
    if (this._theme === 'dark') return true;
    if (this._theme === 'auto') return this.mediaQuery.matches;
    return false;
  }

  /**
   * Applies or removes the 'dark' class on <html>.
   */
  private applyTheme(): void {
    const html = document.documentElement;
    if (this.isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
