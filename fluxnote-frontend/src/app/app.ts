import { ApplicationRef, Component, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App {
  private appRef = inject(ApplicationRef);
  private router = inject(Router);
  title = 'FluxNote';

  constructor() {
    afterNextRender(() => {
      // Force a full change detection pass after the initial render.
      queueMicrotask(() => this.appRef.tick());
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        queueMicrotask(() => this.appRef.tick());
      }
    });
  }
}
