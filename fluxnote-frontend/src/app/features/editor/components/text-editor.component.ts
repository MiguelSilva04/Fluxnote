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
  textColor: string;
  backgroundColor: string;
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
  textColor: '#000000',
  backgroundColor: '#ffffff',
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
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  initialContent = input<string>('');
  placeholder = input<string>('Start writing...');
  autoSaveDelay = input<number>(2000);
  editable = input<boolean>(true);

  contentChange = output<string>();
  save = output<string>();

  saveStatus = signal<SaveStatus>('idle');
  formats: EditorFormats = { ...DEFAULT_FORMATS };

  // Manipulação de imagem
  selectedImage = signal<HTMLImageElement | null>(null);
  showImageMenu = signal(false);
  imageMenuPosition = signal({ top: 0, left: 0 });

  private quill!: Quill;
  private destroy$ = new Subject<void>();
  private contentChange$ = new Subject<string>();

  ngOnInit(): void {
    this.contentChange$
      .pipe(debounceTime(this.autoSaveDelay()), takeUntil(this.destroy$))
      .subscribe((content) => {
        if (!this.editable()) {
          return;
        }
        this.triggerSave(content);
      });
  }

  ngAfterViewInit(): void {
    this.initializeQuill();
    
    // Fechar menus de cores ao clicar fora
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showTextColorMenu.set(false);
      this.showBgColorMenu.set(false);
    }
  }

  private initializeQuill(): void {
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: false,
      },
    });

    // Desativar corretor ortográfico
    this.quill.root.setAttribute('spellcheck', 'false');

    if (this.initialContent()) {
      this.quill.root.innerHTML = this.initialContent();
    }

    // Define modo read-only baseado no input editable
    if (!this.editable()) {
      this.quill.enable(false);
    }

    this.quill.on('text-change', () => {
      this.triggerContentChange();
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

    // Interceptar drag & drop para validar tamanho da imagem (fase de captura para executar antes do Quill)
    this.quill.root.addEventListener(
      'drop',
      (e: DragEvent) => {
        if (!this.editable()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.handleDroppedImage(file);
          }
        }
      },
      true
    );

    // Handler de clique em imagem para manipulação (apenas para editores)
    this.quill.root.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && this.editable()) {
        e.preventDefault();
        this.selectImage(target as HTMLImageElement);
      } else {
        this.deselectImage();
      }
    });
  }

  private handleDroppedImage(file: File): void {
    const maxSizeInMB = 2;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      alert(`Image size must be less than ${maxSizeInMB}MB. Dropped image is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.insertImageAtCursor(base64);
    };
    reader.readAsDataURL(file);
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
      textColor: (quillFormats['color'] as string) || '#000000',
      backgroundColor: (quillFormats['background'] as string) || '#ffffff',
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

  // Menus de cores
  showTextColorMenu = signal(false);
  showBgColorMenu = signal(false);

  textColors = [
    { name: 'Black', value: '#000000' },
    { name: 'Dark Gray', value: '#4a4a4a' },
    { name: 'Gray', value: '#9b9b9b' },
    { name: 'Light Gray', value: '#d9d9d9' },
    { name: 'White', value: '#ffffff' },
    { name: 'Red', value: '#e53935' },
    { name: 'Orange', value: '#fb8c00' },
    { name: 'Yellow', value: '#fdd835' },
    { name: 'Green', value: '#43a047' },
    { name: 'Teal', value: '#00897b' },
    { name: 'Blue', value: '#1e88e5' },
    { name: 'Purple', value: '#8e24aa' },
  ];

  backgroundColors = [
    { name: 'No Color', value: '#ffffff' },
    { name: 'Light Gray', value: '#f5f5f5' },
    { name: 'Light Red', value: '#ffebee' },
    { name: 'Light Orange', value: '#fff3e0' },
    { name: 'Light Yellow', value: '#fffde7' },
    { name: 'Light Green', value: '#e8f5e9' },
    { name: 'Light Teal', value: '#e0f2f1' },
    { name: 'Light Blue', value: '#e3f2fd' },
    { name: 'Light Purple', value: '#f3e5f5' },
    { name: 'Red', value: '#ffcdd2' },
    { name: 'Yellow', value: '#fff59d' },
    { name: 'Green', value: '#c8e6c9' },
  ];

  toggleTextColorMenu(): void {
    this.showBgColorMenu.set(false);
    this.showTextColorMenu.update(v => !v);
  }

  toggleBgColorMenu(): void {
    this.showTextColorMenu.set(false);
    this.showBgColorMenu.update(v => !v);
  }

  applyTextColor(color: string): void {
    this.quill.format('color', color || false);
    this.showTextColorMenu.set(false);
    this.updateActiveFormats();
  }

  applyBackgroundColor(color: string): void {
    this.quill.format('background', color || false);
    this.showBgColorMenu.set(false);
    this.updateActiveFormats();
  }

  insertImage(): void {
    this.imageInput.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const maxSizeInMB = 2;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      if (file.size > maxSizeInBytes) {
        alert(`Image size must be less than ${maxSizeInMB}MB. Selected image is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.insertImageAtCursor(base64);
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  private insertImageAtCursor(imageUrl: string): void {
    const range = this.quill.getSelection(true);
    this.quill.insertEmbed(range.index, 'image', imageUrl);
    this.quill.setSelection(range.index + 1);
  }

  // Métodos de manipulação de imagem
  private selectImage(img: HTMLImageElement): void {
    // Remover seleção da imagem anterior
    this.deselectImage();
    
    this.selectedImage.set(img);
    img.classList.add('selected-image');
    
    // Calcular posição do menu
    const rect = img.getBoundingClientRect();
    const editorRect = this.editorContainer.nativeElement.getBoundingClientRect();
    
    this.imageMenuPosition.set({
      top: rect.top - editorRect.top - 45,
      left: rect.left - editorRect.left + (rect.width / 2) - 100
    });
    
    this.showImageMenu.set(true);
  }

  deselectImage(): void {
    const currentImage = this.selectedImage();
    if (currentImage) {
      currentImage.classList.remove('selected-image');
    }
    this.selectedImage.set(null);
    this.showImageMenu.set(false);
  }

  setImageSize(size: 'small' | 'medium' | 'large' | 'full'): void {
    const img = this.selectedImage();
    if (!img) return;

    // Remover classes de tamanho existentes
    img.classList.remove('img-small', 'img-medium', 'img-large', 'img-full');
    
    switch (size) {
      case 'small':
        img.style.width = '25%';
        break;
      case 'medium':
        img.style.width = '50%';
        break;
      case 'large':
        img.style.width = '75%';
        break;
      case 'full':
        img.style.width = '100%';
        break;
    }
    
    img.style.height = 'auto';
    this.triggerContentChange();
  }

  setImageAlign(align: 'left' | 'center' | 'right'): void {
    const img = this.selectedImage();
    if (!img) return;

    // Resetar estilos
    img.style.display = 'block';
    img.style.marginLeft = '';
    img.style.marginRight = '';
    img.style.float = '';

    switch (align) {
      case 'left':
        img.style.float = 'left';
        img.style.marginRight = '1rem';
        break;
      case 'center':
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
        break;
      case 'right':
        img.style.float = 'right';
        img.style.marginLeft = '1rem';
        break;
    }
    
    this.triggerContentChange();
  }

  deleteImage(): void {
    const img = this.selectedImage();
    if (!img) return;

    img.remove();
    this.deselectImage();
    this.triggerContentChange();
  }

  private triggerContentChange(): void {
    const content = this.quill.root.innerHTML;
    this.contentChange.emit(content);
    this.contentChange$.next(content);
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
