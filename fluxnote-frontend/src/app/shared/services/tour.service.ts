import { Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { TourStep, TourConfig } from '../components/ui/tour/tour.models';

const DEFAULT_CONFIG: TourConfig = {
  spotlightPadding: 8,
  spotlightBorderRadius: 8,
  backdropDismiss: false,
  escDismiss: true,
  scrollIntoView: true,
  overlayOpacity: 0.5,
};

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly zone = inject(NgZone);

  private readonly _steps = signal<TourStep[]>([]);
  private readonly _currentIndex = signal<number>(0);
  private readonly _isActive = signal<boolean>(false);
  private readonly _config = signal<TourConfig>({ ...DEFAULT_CONFIG });

  readonly steps = this._steps.asReadonly();
  readonly currentStepIndex = this._currentIndex.asReadonly();
  readonly isActive = this._isActive.asReadonly();
  readonly config = this._config.asReadonly();

  readonly totalSteps = computed(() => this._steps().length);

  readonly currentStep = computed<TourStep | null>(() => {
    const steps = this._steps();
    const index = this._currentIndex();
    return steps.length > 0 && index >= 0 && index < steps.length
      ? steps[index]
      : null;
  });

  readonly isFirstStep = computed(() => this._currentIndex() === 0);

  readonly isLastStep = computed(
    () => this._currentIndex() === this._steps().length - 1,
  );

  readonly progress = computed(() => {
    const total = this.totalSteps();
    if (total === 0) return 0;
    return ((this._currentIndex() + 1) / total) * 100;
  });

  /** Inicia um tour com os passos e configuração fornecidos. */
  start(steps: TourStep[], config: Partial<TourConfig> = {}): void {
    if (steps.length === 0) return;

    const fullConfig: TourConfig = { ...DEFAULT_CONFIG, ...config };

    this.zone.run(() => {
      this._config.set(fullConfig);
      this._steps.set(steps);
      this._currentIndex.set(0);
      this._isActive.set(true);
      steps[0].onActivate?.();
    });
  }

  /** Avança para o próximo passo. Se for o último, finaliza o tour. */
  next(): void {
    const steps = this._steps();
    const currentIdx = this._currentIndex();

    if (currentIdx >= steps.length - 1) {
      this.finish();
      return;
    }

    this.zone.run(() => {
      steps[currentIdx].onDeactivate?.();
      const nextIdx = currentIdx + 1;
      this._currentIndex.set(nextIdx);
      steps[nextIdx].onActivate?.();
    });
  }

  /** Volta ao passo anterior. */
  previous(): void {
    const currentIdx = this._currentIndex();
    if (currentIdx <= 0) return;

    const steps = this._steps();

    this.zone.run(() => {
      steps[currentIdx].onDeactivate?.();
      const prevIdx = currentIdx - 1;
      this._currentIndex.set(prevIdx);
      steps[prevIdx].onActivate?.();
    });
  }

  /** Salta/ignora o tour. */
  skip(): void {
    const config = this._config();
    config.onSkip?.();
    this.cleanup();
  }

  /** Finaliza o tour. */
  finish(): void {
    const config = this._config();
    const steps = this._steps();
    const currentIdx = this._currentIndex();

    steps[currentIdx]?.onDeactivate?.();
    config.onFinish?.();
    this.cleanup();
  }

  private cleanup(): void {
    this.zone.run(() => {
      this._isActive.set(false);
      this._steps.set([]);
      this._currentIndex.set(0);
    });
  }
}
