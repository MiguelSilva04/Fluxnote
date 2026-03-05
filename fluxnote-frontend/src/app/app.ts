import { ApplicationRef, Component, afterNextRender, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/components/ui/toast/toast.component';
import { TourOverlayComponent } from './shared/components/ui/tour/tour-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, TourOverlayComponent, CommonModule],
  template: `
    <!-- Loading bar durante navegação -->
    @if (isNavigating()) {
      <div class="fixed top-0 left-0 right-0 z-[9999]">
        <div class="h-1 bg-[#155347] dark:bg-emerald-400 animate-loading-bar"></div>
      </div>
    }
    <router-outlet></router-outlet>
    <app-toast></app-toast>
    <app-tour-overlay></app-tour-overlay>
  `,
  styles: [`
    @keyframes loading-bar {
      0% { width: 0%; left: 0; }
      100% { width: 100%; left: 0; }
    }
    .animate-loading-bar {
      position: absolute;
      animation: loading-bar 0.8s ease-out forwards;
    }
  `]
})
export class App {
  private appRef = inject(ApplicationRef);
  private router = inject(Router);
  private auth = inject(AuthService);
  title = 'FluxNote';
  
  isNavigating = signal(false);

  constructor() {
    afterNextRender(() => {
      queueMicrotask(() => this.appRef.tick());
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.isNavigating.set(true);
      }
      if (event instanceof NavigationEnd) {
        this.isNavigating.set(false);
        queueMicrotask(() => this.appRef.tick());
      }
    });
  }
}
