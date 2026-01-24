import { ApplicationRef, Component, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
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
