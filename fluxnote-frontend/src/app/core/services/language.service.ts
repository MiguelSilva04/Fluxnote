import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'pt';

const STORAGE_KEY = 'fluxnote-language';
const DEFAULT_LANG: AppLanguage = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  get currentLang(): AppLanguage {
    return (this.translate.currentLang as AppLanguage) || DEFAULT_LANG;
  }

  /**
   * Initializes translation service. Should be called once at app startup.
   */
  init(): void {
    this.translate.addLangs(['en', 'pt']);
    this.translate.setFallbackLang(DEFAULT_LANG);

    const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    const lang = saved && ['en', 'pt'].includes(saved) ? saved : DEFAULT_LANG;

    this.translate.use(lang);
  }

  /**
   * Change the active language and persist in localStorage.
   */
  setLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  /**
   * Get display label for a language code.
   */
  getLabel(lang: AppLanguage): string {
    return lang === 'pt' ? 'Português' : 'English';
  }
}
