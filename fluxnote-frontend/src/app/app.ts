import { ApplicationRef, Component, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/components/ui/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `
})
export class App {
  private appRef = inject(ApplicationRef);
  private router = inject(Router);
  private auth = inject(AuthService);
  title = 'FluxNote';

  constructor() {
    afterNextRender(() => {
      queueMicrotask(() => this.appRef.tick());
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        queueMicrotask(() => this.appRef.tick());
      }
    });
  }
}
