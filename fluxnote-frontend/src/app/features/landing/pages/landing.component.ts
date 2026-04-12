import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LandingHeaderComponent,
  LandingFooterComponent,
  HeroSectionComponent,
  FeaturesSectionComponent,
  FaqSectionComponent
} from '../components';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    LandingHeaderComponent,
    LandingFooterComponent,
    HeroSectionComponent,
    FeaturesSectionComponent,
    FaqSectionComponent
  ],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>
      <app-hero-section></app-hero-section>
      <app-features-section></app-features-section>
      <app-faq-section></app-faq-section>
      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class LandingComponent {}
