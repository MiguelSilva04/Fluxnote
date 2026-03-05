import {
  Component,
  inject,
  signal,
  effect,
  HostListener,
  ChangeDetectorRef,
  OnDestroy,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { TourService } from '../../../services/tour.service';
import { TourPosition, ScreenPosition } from './tour.models';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: string;
  left: string;
}

@Component({
  selector: 'app-tour-overlay',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  template: `
    @if (tourService.isActive()) {
      <!-- Overlay SVG com recorte de spotlight -->
      <div
        class="fixed inset-0 z-[9998] transition-opacity duration-300"
        [class.opacity-100]="isVisible()"
        [class.opacity-0]="!isVisible()"
        (click)="onBackdropClick()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'TOUR.ARIA_LABEL' | translate:{ current: tourService.currentStepIndex() + 1, total: tourService.totalSteps() }"
      >
        <svg
          class="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              @if (hasTarget()) {
                <rect
                  [attr.x]="spotlight().left"
                  [attr.y]="spotlight().top"
                  [attr.width]="spotlight().width"
                  [attr.height]="spotlight().height"
                  [attr.rx]="tourService.config().spotlightBorderRadius"
                  [attr.ry]="tourService.config().spotlightBorderRadius"
                  fill="black"
                  class="transition-all duration-300 ease-in-out"
                />
              }
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            [attr.fill-opacity]="tourService.config().overlayOpacity"
            fill="black"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      </div>

      <!-- Card do tooltip -->
      @if (tourService.currentStep()) {
        <div
          #tooltipEl
          class="fixed z-[9999] w-80 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-in-out"
          [style.top]="tooltipPos().top"
          [style.left]="tooltipPos().left"
          [class.opacity-100]="isVisible()"
          [class.opacity-0]="!isVisible()"
          [class.scale-100]="isVisible()"
          [class.scale-95]="!isVisible()"
          role="tooltip"
          [attr.aria-describedby]="'tour-desc-' + tourService.currentStepIndex()"
        >
          <!-- Seta direcional -->
          <div [class]="arrowClass()"></div>

          <div
            class="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <!-- Barra de progresso -->
            <div class="h-1 bg-gray-100">
              <div
                class="h-full bg-primary transition-all duration-500 ease-out rounded-r"
                [style.width.%]="tourService.progress()"
              ></div>
            </div>

            <!-- Conteúdo -->
            <div class="p-5">
              <div class="flex items-start justify-between mb-1">
                <h3 class="text-base font-semibold text-gray-900">
                  {{ tourService.currentStep()?.title }}
                </h3>
                <button
                  (click)="tourService.skip()"
                  class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 -mt-1 -mr-1"
                  [attr.aria-label]="'TOUR.SKIP' | translate"
                >
                  <lucide-icon name="x" [size]="16"></lucide-icon>
                </button>
              </div>

              <p
                [id]="'tour-desc-' + tourService.currentStepIndex()"
                class="text-sm text-gray-600 leading-relaxed mb-4"
              >
                {{ tourService.currentStep()?.description }}
              </p>

              <!-- Rodapé -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400 font-medium">
                  {{ 'TOUR.STEP_OF' | translate:{ current: tourService.currentStepIndex() + 1, total: tourService.totalSteps() } }}
                </span>

                <div class="flex items-center gap-2">
                  @if (!tourService.isFirstStep()) {
                    <button
                      (click)="tourService.previous()"
                      class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {{ 'TOUR.PREVIOUS' | translate }}
                    </button>
                  }

                  @if (tourService.isLastStep()) {
                    <button
                      (click)="tourService.finish()"
                      class="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      {{ 'TOUR.FINISH' | translate }}
                    </button>
                  } @else {
                    <button
                      (click)="tourService.next()"
                      class="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      {{ 'TOUR.NEXT' | translate }}
                      <lucide-icon
                        name="arrow-right"
                        [size]="14"
                        class="ml-1"
                      ></lucide-icon>
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .arrow-top {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid white;
        filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.05));
      }
      .arrow-bottom {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05));
      }
      .arrow-left {
        position: absolute;
        right: 100%;
        top: 24px;
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-right: 8px solid white;
        filter: drop-shadow(-1px 0 1px rgba(0, 0, 0, 0.05));
      }
      .arrow-right {
        position: absolute;
        left: 100%;
        top: 24px;
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-left: 8px solid white;
        filter: drop-shadow(1px 0 1px rgba(0, 0, 0, 0.05));
      }
    `,
  ],
})
export class TourOverlayComponent implements OnDestroy {
  readonly tourService = inject(TourService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isVisible = signal(false);
  /** Indica se o passo atual tem um elemento alvo (com spotlight) */
  readonly hasTarget = signal(true);
  readonly spotlight = signal<SpotlightRect>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  readonly tooltipPos = signal<TooltipPos>({ top: '0px', left: '0px' });
  readonly arrowClass = signal('');

  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private stepTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const step = this.tourService.currentStep();
      const isActive = this.tourService.isActive();

      if (isActive && step) {
        this.isVisible.set(false);
        this.stepTransitionTimeout = setTimeout(() => {
          if (step.targetSelector) {
            this.hasTarget.set(true);
            this.positionElements(step.targetSelector, step.position);
          } else {
            this.hasTarget.set(false);
            this.positionOnScreen(step.screenPosition ?? 'center');
          }
          this.isVisible.set(true);
          this.cdr.detectChanges();
        }, 150);
      } else {
        this.isVisible.set(false);
      }
    });

    afterNextRender(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.repositionIfActive();
      });
      this.resizeObserver.observe(document.body);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.stepTransitionTimeout) clearTimeout(this.stepTransitionTimeout);
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.tourService.isActive() && this.tourService.config().escDismiss) {
      this.tourService.skip();
    }
  }

  @HostListener('document:keydown.arrowRight')
  onArrowRight(): void {
    if (this.tourService.isActive()) this.tourService.next();
  }

  @HostListener('document:keydown.arrowLeft')
  onArrowLeft(): void {
    if (this.tourService.isActive()) this.tourService.previous();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.repositionIfActive();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.repositionIfActive();
  }

  onBackdropClick(): void {
    if (this.tourService.config().backdropDismiss) {
      this.tourService.skip();
    }
  }

  private repositionIfActive(): void {
    const step = this.tourService.currentStep();
    if (step && this.tourService.isActive()) {
      if (step.targetSelector) {
        this.positionElements(step.targetSelector, step.position);
      } else {
        this.positionOnScreen(step.screenPosition ?? 'center');
      }
    }
  }

  /** Posiciona o tooltip no ecrã sem spotlight, conforme a direção indicada */
  private positionOnScreen(screenPos: ScreenPosition): void {
    const tw = 320;
    const th = 180;
    const margin = 32;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    switch (screenPos) {
      case 'center':
        top = vh / 2 - th / 2;
        left = vw / 2 - tw / 2;
        break;
      case 'top':
        top = margin;
        left = vw / 2 - tw / 2;
        break;
      case 'bottom':
        top = vh - th - margin;
        left = vw / 2 - tw / 2;
        break;
      case 'left':
        top = vh / 2 - th / 2;
        left = margin;
        break;
      case 'right':
        top = vh / 2 - th / 2;
        left = vw - tw - margin;
        break;
      case 'top-left':
        top = margin;
        left = margin;
        break;
      case 'top-right':
        top = margin;
        left = vw - tw - margin;
        break;
      case 'bottom-left':
        top = vh - th - margin;
        left = margin;
        break;
      case 'bottom-right':
        top = vh - th - margin;
        left = vw - tw - margin;
        break;
    }

    this.spotlight.set({ top: 0, left: 0, width: 0, height: 0 });
    this.tooltipPos.set({ top: `${top}px`, left: `${left}px` });
    this.arrowClass.set('');
    this.cdr.detectChanges();
  }

  private positionElements(
    selector: string,
    preferredPosition: TourPosition,
  ): void {
    const targetEl = document.querySelector(selector) as HTMLElement | null;

    if (!targetEl) {
      console.warn(`[TourOverlay] Target element not found: ${selector}`);
      this.tourService.next();
      return;
    }

    const config = this.tourService.config();

    if (config.scrollIntoView) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }

    this.animationFrameId = requestAnimationFrame(() => {
      const rect = targetEl.getBoundingClientRect();
      const padding = config.spotlightPadding ?? 8;

      this.spotlight.set({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      const pos = this.computeTooltipPosition(
        rect,
        preferredPosition,
        padding,
      );
      this.tooltipPos.set(pos.position);
      this.arrowClass.set(pos.arrowClass);

      this.cdr.detectChanges();
    });
  }

  private computeTooltipPosition(
    targetRect: DOMRect,
    preferred: TourPosition,
    padding: number,
  ): { position: TooltipPos; arrowClass: string } {
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const positions: TourPosition[] = [
      preferred,
      'bottom',
      'top',
      'right',
      'left',
    ];

    for (const pos of positions) {
      const result = this.calculatePosition(
        targetRect,
        pos,
        tooltipWidth,
        tooltipHeight,
        gap,
        padding,
        vw,
        vh,
      );
      if (result) return result;
    }

    return {
      position: {
        top: `${targetRect.bottom + gap + padding}px`,
        left: `${Math.max(16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2)}px`,
      },
      arrowClass: 'arrow-top',
    };
  }

  private calculatePosition(
    rect: DOMRect,
    pos: TourPosition,
    tw: number,
    th: number,
    gap: number,
    padding: number,
    vw: number,
    vh: number,
  ): { position: TooltipPos; arrowClass: string } | null {
    let top: number;
    let left: number;
    let arrowClass: string;

    switch (pos) {
      case 'bottom':
        top = rect.bottom + gap + padding;
        left = rect.left + rect.width / 2 - tw / 2;
        arrowClass = 'arrow-top';
        if (top + th > vh - 16) return null;
        break;
      case 'top':
        top = rect.top - th - gap - padding;
        left = rect.left + rect.width / 2 - tw / 2;
        arrowClass = 'arrow-bottom';
        if (top < 16) return null;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.right + gap + padding;
        arrowClass = 'arrow-left';
        if (left + tw > vw - 16) return null;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - gap - padding;
        arrowClass = 'arrow-right';
        if (left < 16) return null;
        break;
    }

    left = Math.max(16, Math.min(left!, vw - tw - 16));
    top = Math.max(16, Math.min(top!, vh - th - 16));

    return {
      position: { top: `${top}px`, left: `${left}px` },
      arrowClass: arrowClass!,
    };
  }
}
