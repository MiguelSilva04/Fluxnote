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
   * Inicializa o tema a partir do localStorage e aplica-o.
   * Deve ser chamado uma vez no arranque da aplicação.
   */
  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    this._theme = saved && ['light', 'dark', 'auto'].includes(saved) ? saved : DEFAULT_THEME;
    this.applyTheme();

    // Escuta alterações de preferência do SO (relevante quando o tema é 'auto')
    this.mediaQuery.addEventListener('change', () => {
      if (this._theme === 'auto') {
        this.applyTheme();
      }
    });
  }

  /**
   * Altera e persiste a preferência de tema.
   */
  setTheme(theme: AppTheme): void {
    this._theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyTheme();
  }

  /**
   * Retorna true quando a aparência efetiva é escura.
   */
  get isDark(): boolean {
    if (this._theme === 'dark') return true;
    if (this._theme === 'auto') return this.mediaQuery.matches;
    return false;
  }

  /**
   * Aplica ou remove a classe 'dark' no elemento <html>.
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
