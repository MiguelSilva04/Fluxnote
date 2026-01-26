import { Injectable, NgZone, inject, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private readonly zone = inject(NgZone);

  /**
   * mostra uma notificação toast.
   * 
   * @param message - mensagem a ser exibida
   * @param type - tipo de toast (success, error, info, warning)
   * @param duration - duração em milissegundos (padrão: 5000ms para error, 3000ms para outros)
   */
  show(message: string, type: ToastType = 'info', duration?: number): void {
    const id = Math.random().toString(36).substr(2, 9);
    const defaultDuration = type === 'error' ? 6000 : 3000;
    
    const toast: Toast = {
      id,
      message,
      type,
      duration: duration ?? defaultDuration
    };

    // garante que a atualizaÃ§Ã£o acontece dentro do Angular para acionar o CD
    this.zone.run(() => {
      this._toasts.update(toasts => [...toasts, toast]);
    });

    // remove automaticamente após a duração especificada
    setTimeout(() => {
      this.zone.run(() => this.remove(id));
    }, toast.duration);
  }

  /**
   * mostra uma notificação de sucesso.
   */
  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * mostra uma notificação de erro.
   */
  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  /**
   * mostra uma notificação de informação.
   */
  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /**
   * mostra uma notificação de aviso.
   */
  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  /**
   * remove uma notificação toast específica.
   */
  remove(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * remove todas as notificações.
   */
  clear(): void {
    this._toasts.set([]);
  }
}

