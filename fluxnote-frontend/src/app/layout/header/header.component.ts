import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService, PanelStateService, DocumentService } from '../../core/services';
import { WorkInProgressComponent } from '../../shared/components/ui';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentDto } from '../../core/models';
import { Subject, debounceTime, takeUntil, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, WorkInProgressComponent, TranslateModule],
  template: `
    <header class="h-14 md:h-16 bg-white border-b border-gray-200 px-3 md:px-6 flex items-center gap-2 md:gap-4 shrink-0">
      <!-- Hamburger (mobile only) -->
      <button
        (click)="panelState.toggleSidebar()"
        class="lg:hidden flex-shrink-0 p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle sidebar"
      >
        <lucide-icon name="menu" class="h-5 w-5"></lucide-icon>
      </button>

      <div class="flex items-center gap-4 flex-1 min-w-0">
        <div class="relative w-full max-w-md">
          <lucide-icon name="search" class="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
          <input
            type="text"
            [placeholder]="'HEADER.SEARCH_PLACEHOLDER' | translate"
            [(ngModel)]="searchQuery"
            (input)="onSearchInput()"
            (focus)="showResults.set(true)"
            (blur)="onBlur()"
            class="w-full h-10 pl-12 pr-4 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm"
          />
          
          <!-- Dropdown de resultados -->
          @if (showResults() && searchQuery.length >= 2) {
            <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              @if (isSearching()) {
                <div class="p-4 text-center text-gray-500">
                  <lucide-icon name="loader-circle" class="h-5 w-5 animate-spin mx-auto mb-2"></lucide-icon>
                  <p class="text-sm">{{ 'HEADER.SEARCHING' | translate }}</p>
                </div>
              } @else if (searchResults().length === 0) {
                <div class="p-4 text-center text-gray-500">
                  <lucide-icon name="file-search" class="h-8 w-8 mx-auto mb-2 text-gray-300"></lucide-icon>
                  <p class="text-sm">{{ 'HEADER.NO_RESULTS' | translate }}</p>
                </div>
              } @else {
                <div class="py-2">
                  <p class="px-4 py-1 text-xs text-gray-500 font-medium">
                    {{ searchResults().length }} {{ searchResults().length > 1 ? ('HEADER.RESULTS_COUNT_PLURAL' | translate) : ('HEADER.RESULTS_COUNT' | translate) }}
                  </p>
                  @for (doc of searchResults(); track doc.id) {
                    <button
                      (mousedown)="openDocument(doc)"
                      class="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div class="flex items-start gap-3">
                        <lucide-icon name="file-text" class="h-5 w-5 text-gray-400 mt-0.5 shrink-0"></lucide-icon>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                          <p class="text-xs text-gray-500 mt-0.5">{{ doc.teamName }}</p>
                          @if (doc.preview) {
                            <p 
                              class="text-xs text-gray-600 mt-1 line-clamp-2"
                              [innerHTML]="highlightMatch(doc.preview)"
                            ></p>
                          }
                        </div>
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
      <div class="flex items-center gap-1 md:gap-2 flex-shrink-0">
        <button
          (click)="showWipModal.set(true)"
          class="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <lucide-icon name="bell" class="h-5 w-5"></lucide-icon>
          <span class="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        <button
          (click)="panelState.openSettingsPanel()"
          class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <lucide-icon name="settings" class="h-5 w-5"></lucide-icon>
        </button>
        <button
          (click)="panelState.openProfilePanel()"
          class="h-9 w-9 rounded-full text-white flex items-center justify-center text-sm font-medium hover:opacity-90 transition-opacity overflow-hidden"
          [style.background]="user()?.profilePictureUrl ? 'transparent' : user()?.color"
        >
          @if (user()?.profilePictureUrl) {
            <img
              [src]="user()?.profilePictureUrl"
              alt="Profile"
              class="h-full w-full object-cover"
            />
          } @else {
            {{ user()?.initials }}
          }
        </button>
      </div>
    </header>

    <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class HeaderComponent implements OnDestroy {
  panelState = inject(PanelStateService);
  user = inject(AuthService).currentUser;
  
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  searchQuery = '';
  searchResults = signal<DocumentDto[]>([]);
  isSearching = signal(false);
  showResults = signal(false);

  constructor() {
    // Debounce de 300ms na pesquisa
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => this.performSearch(query));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(): void {
    if (this.searchQuery.length >= 2) {
      this.isSearching.set(true);
      this.searchSubject.next(this.searchQuery);
    } else {
      this.searchResults.set([]);
    }
  }

  onBlur(): void {
    // Delay para permitir clique nos resultados
    setTimeout(() => this.showResults.set(false), 200);
  }

  private performSearch(query: string): void {
    if (query.length < 2) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.documentService.searchDocuments(query).subscribe({
      next: (docs) => {
        this.searchResults.set(docs);
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  openDocument(doc: DocumentDto): void {
    this.showResults.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);
    this.router.navigate(['/editor', doc.id]);
  }

  highlightMatch(text: string): string {
    if (!this.searchQuery) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  showWipModal = signal(false);
}
