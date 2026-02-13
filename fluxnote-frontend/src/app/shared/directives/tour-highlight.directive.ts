import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appTourHighlight]',
  standalone: true,
})
export class TourHighlightDirective implements OnInit {
  private readonly el = inject(ElementRef);

  @Input({ required: true }) appTourHighlight = '';

  ngOnInit(): void {
    this.el.nativeElement.setAttribute('data-tour', this.appTourHighlight);
  }
}
