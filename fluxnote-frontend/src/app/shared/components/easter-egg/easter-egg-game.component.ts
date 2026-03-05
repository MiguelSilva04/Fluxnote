import {
  Component, Input, Output, EventEmitter,
  inject, signal, computed,
  OnChanges, SimpleChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { DocumentService, TeamService } from '../../../core/services';
import { ModalComponent, ButtonComponent } from '../ui';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface WordEntry {
  original: string;
  scrambled: string;
  category: 'document' | 'team' | 'member';
}

@Component({
  selector: 'app-easter-egg-game',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ModalComponent,
    ButtonComponent,
    TranslateModule,
  ],
  styles: [`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    .animate-shake { animation: shake 0.35s ease-in-out; }

    @keyframes pop-in {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-pop { animation: pop-in 0.3s ease-out; }

    @keyframes float-up {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-40px); opacity: 0; }
    }
    .animate-float { animation: float-up 1s ease-out forwards; }
  `],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="modalTitle()"
      maxWidth="lg"
      (onClose)="close()"
    >
      <!-- Loading -->
      @if (gameState() === 'loading') {
        <div class="flex flex-col items-center justify-center py-16">
          <div class="animate-spin h-10 w-10 border-4 border-[#155347] border-t-transparent rounded-full mb-4"></div>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            {{ 'EASTER_EGG.LOADING' | translate }}
          </p>
        </div>
      }

      <!-- Not enough data -->
      @if (gameState() === 'nodata') {
        <div class="text-center py-10">
          <div class="text-6xl mb-5">🎮</div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {{ 'EASTER_EGG.NO_DATA' | translate }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-8 text-sm max-w-xs mx-auto">
            {{ 'EASTER_EGG.NO_DATA_DESC' | translate }}
          </p>
          <app-button variant="outline" (onClick)="close()">
            {{ 'EASTER_EGG.CLOSE' | translate }}
          </app-button>
        </div>
      }

      <!-- Ready / Intro -->
      @if (gameState() === 'ready') {
        <div class="text-center py-6 animate-pop">
          <div class="text-6xl mb-4">🎮</div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            FluxNote Scramble
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            {{ 'EASTER_EGG.INTRO' | translate }}
          </p>

          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 mb-6 text-left space-y-3 max-w-sm mx-auto">
            <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span class="text-lg">⏱️</span>
              {{ 'EASTER_EGG.RULES_TIME' | translate }}
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span class="text-lg">💡</span>
              {{ 'EASTER_EGG.RULES_HINT' | translate }}
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span class="text-lg">⚡</span>
              {{ 'EASTER_EGG.RULES_SCORE' | translate }}
            </div>
          </div>

          <div class="flex items-center justify-center gap-3 mb-6 text-xs text-gray-400 dark:text-gray-500">
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              📄 {{ 'EASTER_EGG.CATEGORY_DOCUMENT' | translate }}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              👥 {{ 'EASTER_EGG.CATEGORY_TEAM' | translate }}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              👤 {{ 'EASTER_EGG.CATEGORY_MEMBER' | translate }}
            </span>
          </div>

          <app-button size="lg" customClass="w-full max-w-sm" (onClick)="startGame()">
            {{ 'EASTER_EGG.START' | translate }}
          </app-button>
        </div>
      }

      <!-- Playing -->
      @if (gameState() === 'playing' && currentWord()) {
        <div class="py-2">
          <!-- Top bar: round + score -->
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ 'EASTER_EGG.ROUND' | translate }} {{ currentIndex() + 1 }} {{ 'EASTER_EGG.OF' | translate }} {{ totalRounds() }}
            </span>
            <span class="text-sm font-bold text-[#155347] dark:text-emerald-400">
              ⭐ {{ score() }}
            </span>
          </div>

          <!-- Timer bar -->
          <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-linear"
              [ngClass]="timerPercent() > 33 ? 'bg-[#155347]' : 'bg-red-500'"
              [style.width.%]="timerPercent()"
            ></div>
          </div>

          <!-- Category badge -->
          <div class="flex justify-center mb-5">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              [ngClass]="categoryClass()"
            >
              {{ categoryIcon() }} {{ categoryLabel() | translate }}
            </span>
          </div>

          <!-- Scrambled word -->
          <div
            class="text-center mb-6 relative min-h-[60px] flex items-center justify-center"
            [class.animate-shake]="feedback() === 'wrong'"
          >
            <p class="text-3xl sm:text-4xl font-mono font-bold tracking-[0.15em] text-gray-800 dark:text-gray-100 select-none">
              {{ currentWord()!.scrambled }}
            </p>

            @if (feedback() === 'correct') {
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-5xl animate-float">✅</span>
              </div>
            }
          </div>

          <!-- Hint -->
          @if (showHint()) {
            <div class="text-center mb-4 animate-pop">
              <p class="text-sm text-amber-600 dark:text-amber-400">
                💡 {{ 'EASTER_EGG.HINT_PREFIX' | translate }}:
                <span class="font-mono font-bold tracking-wider">{{ hintText() }}</span>
              </p>
            </div>
          }

          <!-- Input + actions -->
          <div class="flex gap-2">
            <input
              #guessInput
              type="text"
              [placeholder]="'EASTER_EGG.YOUR_GUESS' | translate"
              [value]="guess()"
              (input)="guess.set(guessInput.value)"
              (keydown.enter)="checkAnswer()"
              [disabled]="feedback() === 'correct'"
              class="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#155347] dark:focus:ring-emerald-500 font-medium text-center text-lg"
            />
            <app-button
              size="lg"
              (onClick)="checkAnswer()"
              [disabled]="!guess() || feedback() === 'correct'"
            >
              {{ 'EASTER_EGG.CHECK' | translate }}
            </app-button>
          </div>

          <button
            (click)="skipRound()"
            [disabled]="feedback() === 'correct'"
            class="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            {{ 'EASTER_EGG.SKIP' | translate }}
          </button>
        </div>
      }

      <!-- Results -->
      @if (gameState() === 'results') {
        <div class="text-center py-6 animate-pop">
          <div class="text-7xl mb-4">{{ resultRating().emoji }}</div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {{ 'EASTER_EGG.GAME_OVER' | translate }}
          </h3>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {{ resultRating().key | translate }}
          </p>

          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6 max-w-xs mx-auto">
            <p class="text-5xl font-bold text-[#155347] dark:text-emerald-400 mb-1">
              {{ score() }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {{ 'EASTER_EGG.FINAL_SCORE' | translate }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ correctCount() }}/{{ totalRounds() }} {{ 'EASTER_EGG.CORRECT_ANSWERS' | translate }}
            </p>
          </div>

          <div class="flex gap-3 max-w-sm mx-auto">
            <app-button variant="outline" customClass="flex-1" (onClick)="close()">
              {{ 'EASTER_EGG.CLOSE' | translate }}
            </app-button>
            <app-button customClass="flex-1" (onClick)="playAgain()">
              🔄 {{ 'EASTER_EGG.PLAY_AGAIN' | translate }}
            </app-button>
          </div>
        </div>
      }
    </app-modal>
  `,
})
export class EasterEggGameComponent implements OnChanges, OnDestroy {
  private documentService = inject(DocumentService);
  private teamService = inject(TeamService);
  private translate = inject(TranslateService);

  @Input() isOpen = false;
  @Output() onClose = new EventEmitter<void>();

  // ── State ──
  gameState = signal<'loading' | 'nodata' | 'ready' | 'playing' | 'results'>('loading');
  words = signal<WordEntry[]>([]);
  currentIndex = signal(0);
  score = signal(0);
  correctCount = signal(0);
  guess = signal('');
  timeLeft = signal(15);
  feedback = signal<'none' | 'correct' | 'wrong'>('none');
  showHint = signal(false);

  // ── Computed ──
  currentWord = computed(() => this.words()[this.currentIndex()] ?? null);
  totalRounds = computed(() => this.words().length);
  timerPercent = computed(() => (this.timeLeft() / this.ROUND_TIME) * 100);

  modalTitle = computed(() => {
    const state = this.gameState();
    if (state === 'playing') {
      return `🎮 ${this.translate.instant('EASTER_EGG.ROUND')} ${this.currentIndex() + 1}/${this.totalRounds()}`;
    }
    if (state === 'results') return `🎉 ${this.translate.instant('EASTER_EGG.GAME_OVER')}`;
    return 'FluxNote Scramble';
  });

  categoryIcon = computed(() => {
    const w = this.currentWord();
    if (!w) return '';
    return w.category === 'document' ? '📄' : w.category === 'team' ? '👥' : '👤';
  });

  categoryLabel = computed(() => {
    const w = this.currentWord();
    if (!w) return '';
    return w.category === 'document'
      ? 'EASTER_EGG.CATEGORY_DOCUMENT'
      : w.category === 'team'
        ? 'EASTER_EGG.CATEGORY_TEAM'
        : 'EASTER_EGG.CATEGORY_MEMBER';
  });

  categoryClass = computed(() => {
    const w = this.currentWord();
    if (!w) return '';
    switch (w.category) {
      case 'document': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'team':     return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'member':   return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    }
  });

  hintText = computed(() => {
    const w = this.currentWord();
    if (!w) return '';
    return w.original
      .split(' ')
      .map(part => part[0].toUpperCase() + '...')
      .join(' ');
  });

  resultRating = computed(() => {
    const pct = this.totalRounds() > 0 ? this.correctCount() / this.totalRounds() : 0;
    if (pct >= 0.8) return { emoji: '🏆', key: 'EASTER_EGG.RATING_MASTER' };
    if (pct >= 0.6) return { emoji: '⭐', key: 'EASTER_EGG.RATING_GREAT' };
    if (pct >= 0.4) return { emoji: '👍', key: 'EASTER_EGG.RATING_GOOD' };
    return { emoji: '💪', key: 'EASTER_EGG.RATING_TRY' };
  });

  // ── Private ──
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly ROUND_TIME = 15;
  private readonly MAX_ROUNDS = 8;

  // ── Lifecycle ──
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadGame();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // ── Public actions ──
  async loadGame(): Promise<void> {
    this.gameState.set('loading');
    this.resetGame();

    try {
      const [docs, teams] = await Promise.all([
        firstValueFrom(this.documentService.getDocuments()),
        firstValueFrom(this.teamService.getTeams()),
      ]);

      const pool: WordEntry[] = [];
      const seen = new Set<string>();

      const addWord = (original: string, category: WordEntry['category']) => {
        const trimmed = original.trim();
        const key = trimmed.toLowerCase();
        if (trimmed.length < 3 || seen.has(key)) return;
        seen.add(key);
        pool.push({
          original: trimmed,
          scrambled: this.scramblePhrase(trimmed),
          category,
        });
      };

      // Document titles
      for (const doc of docs ?? []) {
        if (doc.title) addWord(doc.title, 'document');
      }

      // Team names & members
      for (const team of teams ?? []) {
        if (team.name) addWord(team.name, 'team');
        for (const m of team.members ?? []) {
          if (m.name) addWord(m.name, 'member');
        }
      }

      if (pool.length < 3) {
        this.gameState.set('nodata');
        return;
      }

      this.shuffleArray(pool);
      this.words.set(pool.slice(0, this.MAX_ROUNDS));
      this.gameState.set('ready');
    } catch {
      this.gameState.set('nodata');
    }
  }

  startGame(): void {
    this.gameState.set('playing');
    this.startTimer();
  }

  checkAnswer(): void {
    const word = this.currentWord();
    if (!word || this.feedback() !== 'none' || !this.guess().trim()) return;

    if (this.guess().trim().toLowerCase() === word.original.toLowerCase()) {
      this.stopTimer();
      const timeBonus = Math.round((this.timeLeft() / this.ROUND_TIME) * 100);
      this.score.update(s => s + 100 + timeBonus);
      this.correctCount.update(c => c + 1);
      this.feedback.set('correct');
      setTimeout(() => this.nextRound(), 1100);
    } else {
      this.feedback.set('wrong');
      setTimeout(() => this.feedback.set('none'), 500);
    }
  }

  skipRound(): void {
    if (this.feedback() === 'correct') return;
    this.stopTimer();
    this.nextRound();
  }

  playAgain(): void {
    this.loadGame();
  }

  close(): void {
    this.stopTimer();
    this.onClose.emit();
  }

  // ── Private helpers ──
  private nextRound(): void {
    const next = this.currentIndex() + 1;
    if (next >= this.totalRounds()) {
      this.gameState.set('results');
      return;
    }
    this.currentIndex.set(next);
    this.guess.set('');
    this.feedback.set('none');
    this.showHint.set(false);
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timeLeft.set(this.ROUND_TIME);
    this.showHint.set(false);

    this.timerInterval = setInterval(() => {
      const t = this.timeLeft() - 1;
      this.timeLeft.set(t);
      if (t <= 5) this.showHint.set(true);
      if (t <= 0) {
        this.stopTimer();
        this.nextRound();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private resetGame(): void {
    this.stopTimer();
    this.currentIndex.set(0);
    this.score.set(0);
    this.correctCount.set(0);
    this.guess.set('');
    this.feedback.set('none');
    this.showHint.set(false);
    this.words.set([]);
  }

  private scramblePhrase(phrase: string): string {
    return phrase.split(' ').map(w => this.scrambleWord(w)).join(' ');
  }

  private scrambleWord(word: string): string {
    if (word.length <= 2) return word;
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const result = arr.join('');
    return result === word ? this.scrambleWord(word) : result;
  }

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
