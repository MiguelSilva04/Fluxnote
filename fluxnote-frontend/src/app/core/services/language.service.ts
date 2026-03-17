import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export type AppLanguage = 'en' | 'pt';

const STORAGE_KEY = 'fluxnote-language';
const DEFAULT_LANG: AppLanguage = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  get currentLang(): AppLanguage {
    return (this.translate.getCurrentLang() as AppLanguage) || DEFAULT_LANG;
  }

  /**
   * Inicializa o serviço de tradução. Deve ser chamado uma vez no arranque da aplicação.
   */
  init(): void {
    this.translate.addLangs(['en', 'pt']);
    this.translate.setFallbackLang(DEFAULT_LANG);

    const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    const lang = saved && ['en', 'pt'].includes(saved) ? saved : DEFAULT_LANG;

    this.translate.use(lang);
  }

  /**
   * Altera o idioma ativo e persiste no localStorage.
   * Sincroniza também a preferência de idioma de notificações com o backend.
   */
  setLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    if (this.authService.isAuthenticated()) {
      this.syncLanguagePreferences();
    }
  }

  /**
   * Sincroniza o idioma do frontend para o backend.
   * Garante que a preferência guardada no backend está sempre alinhada com o que o utilizador vê.
   */
  syncLanguagePreferences(): void {
    const localLang = this.currentLang;
    this.notificationService.getPreferences().subscribe(prefs => {
      if (prefs.language !== localLang) {
        this.notificationService.updatePreferences({ ...prefs, language: localLang }).subscribe();
      }
    });
  }

  /**
   * Retorna o nome de exibição para um código de idioma.
   */
  getLabel(lang: AppLanguage): string {
    return lang === 'pt' ? 'Português' : 'English';
  }
}
