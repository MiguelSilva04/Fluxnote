import {
  Component,
  input,
  output,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import Quill from 'quill';
import { Subject, debounceTime, takeUntil } from 'rxjs';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  listOrdered: boolean;
  listBullet: boolean;
  align: string;
  header: string;
}

const DEFAULT_FORMATS: EditorFormats = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: false,
  blockquote: false,
  codeBlock: false,
  listOrdered: false,
  listBullet: false,
  align: '',
  header: '',
};

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.styles.css'],
})
export class TextEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerSelect') headerSelect!: ElementRef<HTMLSelectElement>;

  initialContent = input<string>('');
  placeholder = input<string>('Start writing...');
  autoSaveDelay = input<number>(2000);

  contentChange = output<string>();
  save = output<string>();

  saveStatus = signal<SaveStatus>('idle');
  formats: EditorFormats = { ...DEFAULT_FORMATS };

  private quill!: Quill;
  private destroy$ = new Subject<void>();
  private contentChange$ = new Subject<string>();

  ngOnInit(): void {
    this.contentChange$
      .pipe(debounceTime(this.autoSaveDelay()), takeUntil(this.destroy$))
      .subscribe((content) => {
        this.triggerSave(content);
      });
  }

  ngAfterViewInit(): void {
    this.initializeQuill();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeQuill(): void {
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: false,
      },
    });

    if (this.initialContent()) {
      this.quill.root.innerHTML = this.initialContent();
    }

    this.quill.on('text-change', () => {
      const content = this.quill.root.innerHTML;
      this.contentChange.emit(content);
      this.contentChange$.next(content);
      this.saveStatus.set('idle');
    });

    this.quill.on('selection-change', (range) => {
      if (range) {
        this.updateActiveFormats();
      }
    });

    this.quill.root.addEventListener('keyup', () => {
      this.updateActiveFormats();
    });
  }

  private updateActiveFormats(): void {
    if (!this.quill) return;

    const quillFormats = this.quill.getFormat();
    this.formats = {
      bold: !!quillFormats['bold'],
      italic: !!quillFormats['italic'],
      underline: !!quillFormats['underline'],
      strike: !!quillFormats['strike'],
      link: !!quillFormats['link'],
      blockquote: !!quillFormats['blockquote'],
      codeBlock: !!quillFormats['code-block'],
      listOrdered: quillFormats['list'] === 'ordered',
      listBullet: quillFormats['list'] === 'bullet',
      align: (quillFormats['align'] as string) || '',
      header: (quillFormats['header'] as string) || '',
    };

    if (this.headerSelect) {
      this.headerSelect.nativeElement.value = quillFormats['header']?.toString() || '';
    }
  }

  private triggerSave(content: string): void {
    this.saveStatus.set('saving');
    this.save.emit(content);

    setTimeout(() => {
      this.saveStatus.set('saved');
      setTimeout(() => {
        if (this.saveStatus() === 'saved') {
          this.saveStatus.set('idle');
        }
      }, 2000);
    }, 500);
  }

  format(formatType: string): void {
    const currentFormat = this.quill.getFormat();
    this.quill.format(formatType, !currentFormat[formatType]);
    this.updateActiveFormats();
  }

  formatHeader(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.quill.format('header', value ? parseInt(value, 10) : false);
    this.updateActiveFormats();
  }

  formatList(type: 'ordered' | 'bullet'): void {
    const currentFormat = this.quill.getFormat();
    const currentList = currentFormat['list'];
    this.quill.format('list', currentList === type ? false : type);
    this.updateActiveFormats();
  }

  formatAlign(alignment: string): void {
    this.quill.format('align', alignment || false);
    this.updateActiveFormats();
  }

  formatLink(): void {
    const currentFormat = this.quill.getFormat();
    if (currentFormat['link']) {
      this.quill.format('link', false);
    } else {
      const url = prompt('Enter URL:');
      if (url) {
        this.quill.format('link', url);
      }
    }
    this.updateActiveFormats();
  }

  formatBlockquote(): void {
    const currentFormat = this.quill.getFormat();
    this.quill.format('blockquote', !currentFormat['blockquote']);
    this.updateActiveFormats();
  }

  formatCode(): void {
    const currentFormat = this.quill.getFormat();
    this.quill.format('code-block', !currentFormat['code-block']);
    this.updateActiveFormats();
  }

  getToolbarButtonClass(isActive: boolean | string | undefined): string {
    const baseClass = 'p-2 rounded hover:bg-gray-100 transition-colors';
    return isActive ? `${baseClass} bg-[#e8f0ee] text-[#155347]` : `${baseClass} text-gray-600`;
  }

  getContent(): string {
    return this.quill?.root.innerHTML || '';
  }

  setContent(content: string): void {
    if (this.quill) {
      this.quill.root.innerHTML = content;
    }
  }

  setSaveStatus(status: SaveStatus): void {
    this.saveStatus.set(status);
  }
}
