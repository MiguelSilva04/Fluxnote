import {
  Component,
  inject,
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

// Custom image blot that persists inline styles (width, float, margins) inside the Quill Delta.
// The default ImageBlot only stores `src`, so direct DOM style mutations bypass Yjs and are
// lost on page reload / not synced to collaborators.
// By storing `{ src, style }` in the Delta, every resize/align goes through Quill → Yjs → SignalR.
const EmbedBlot = Quill.import('blots/embed') as any;
class StyledImageBlot extends EmbedBlot {
  static blotName = 'image';
  static tagName = 'img';

  static create(value: string | { src: string; style?: string }) {
    const node = super.create() as HTMLImageElement;
    const src = typeof value === 'string' ? value : (value?.src ?? '');
    const style = typeof value === 'object' ? (value?.style ?? '') : '';
    node.setAttribute('src', src);
    if (style) node.setAttribute('style', style);
    return node;
  }

  static value(node: HTMLImageElement) {
    const src = node.getAttribute('src') ?? '';
    const style = node.getAttribute('style') ?? '';
    return style ? { src, style } : src;
  }
}
Quill.register({ 'formats/image': StyledImageBlot }, true);
import { UploadService, CollaborationService, AuthService } from '../../../core/services';
import { CollaboratorState } from '../../../core/services/collaboration.service';

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

// Paleta de cores para cada colaborador (índice circular)
const COLLABORATOR_COLORS = [
  '#E53935', '#8E24AA', '#1E88E5', '#00897B',
  '#FB8C00', '#6D4C41', '#546E7A', '#43A047',
];

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

  // ─── Inputs existentes ───
  initialContent = input<string>('');
  placeholder = input<string>('Start writing...');
  autoSaveDelay = input<number>(2000);
  editable = input<boolean>(true);

  // ─── Inputs novos para colaboração ───
  /** ID do documento para colaboração em tempo real. Null desactiva a colaboração. */
  documentId = input<number | null>(null);

  // ─── Outputs ───
  contentChange = output<string>();
  save = output<string>();

  // ─── State ───
  saveStatus = signal<SaveStatus>('idle');
  formats: EditorFormats = { ...DEFAULT_FORMATS };

  // Colaboradores visíveis (avatares no topo do editor)
  collaboratorNames = signal<string[]>([]);

  // Manipulação de imagem
  selectedImage = signal<HTMLImageElement | null>(null);
  showImageMenu = signal(false);
  imageMenuPosition = signal({ top: 0, left: 0 });

  // ─── Privados ───
  private quill!: Quill;
  private destroy$ = new Subject<void>();
  private contentChange$ = new Subject<string>();
  private snapshotInterval?: ReturnType<typeof setInterval>;
  private awarenessInterval?: ReturnType<typeof setInterval>;
  private colorIndex = 0;
  // Mapa connectionId → elemento DOM do cursor no editor
  private collaboratorCursors = new Map<string, HTMLElement>();
  // Scroll: re-render cursors when the local user scrolls (fixed-position cursors go stale)
  private scrollRafId: number | null = null;
  private readonly onScroll = () => {
    if (this.scrollRafId !== null) return;
    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;
      for (const [id, state] of this.collaborationService.collaborators) {
        this.renderCursor(id, state);
      }
    });
  };
  private uploadService = inject(UploadService);
  private collaborationService = inject(CollaborationService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.contentChange$
      .pipe(debounceTime(this.autoSaveDelay()), takeUntil(this.destroy$))
      .subscribe((content) => {
        if (!this.editable()) return;
        this.triggerSave(content);
      });
  }

  ngAfterViewInit(): void {
    this.initializeQuill();
    document.addEventListener('click', this.handleClickOutside.bind(this));
    document.addEventListener('scroll', this.onScroll, true);

    // Iniciar colaboração após Quill estar pronto
    const docId = this.documentId();
    if (docId !== null) {
      this.initCollaboration(docId);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    document.removeEventListener('scroll', this.onScroll, true);
    if (this.scrollRafId !== null) cancelAnimationFrame(this.scrollRafId);

    // Limpar intervalos
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    if (this.awarenessInterval) clearInterval(this.awarenessInterval);

    // Limpar cursores remotos antes de desconectar
    this.clearAllCursors();

    // Desconectar colaboração (guarda snapshot final automaticamente)
    this.collaborationService.disconnect();

    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────
  // Colaboração CRDT
  // ─────────────────────────────────────────────────────────────

  private async initCollaboration(documentId: number): Promise<void> {
    try {
      // Conectar ao documento (busca snapshot, liga Yjs ao Quill, inicia SignalR)
      await this.collaborationService.connect(documentId, this.quill);

      // Snapshot periódico a cada 30 segundos
      this.snapshotInterval = setInterval(() => {
        this.collaborationService.saveSnapshot(documentId);
      }, 30_000);

      // ── Awareness: enviar posição do cursor do utilizador actual ──
      const user = this.authService.currentUser();
      if (user) {
        const color = COLLABORATOR_COLORS[this.colorIndex++ % COLLABORATOR_COLORS.length];

        const sendAwareness = () => {
          const range = this.quill.getSelection();
          this.collaborationService.sendAwareness(documentId, {
            connectionId: '',
            userId: user.id || '',
            name: user.fullName || user.email,
            color,
            cursor: range ? { index: range.index, length: range.length } : null,
          });
        };

        // Enviar imediatamente ao conectar
        sendAwareness();

        // Enviar em cada mudança de selecção (debounced 150ms para não inundar)
        const selectionChange$ = new Subject<void>();
        selectionChange$
          .pipe(debounceTime(20), takeUntil(this.destroy$))
          .subscribe(() => sendAwareness());
        this.quill.on('selection-change', () => selectionChange$.next());

        // Fallback periódico para manter presença (ex: tab em background)
        this.awarenessInterval = setInterval(sendAwareness, 5_000);
      }

      // ── Reagir a cursores dos outros utilizadores ──
      this.collaborationService.awarenessUpdate$
        .pipe(takeUntil(this.destroy$))
        .subscribe(({ connectionId, state }) => {
          this.renderCursor(connectionId, state);
          this.collaboratorNames.set(
            [...this.collaborationService.collaborators.values()].map((s) => s.name)
          );
        });

      // Remover cursor quando um utilizador sai
      this.collaborationService.userLeft$
        .pipe(takeUntil(this.destroy$))
        .subscribe((connectionId) => {
          this.clearCursor(connectionId);
          this.collaboratorNames.set(
            [...this.collaborationService.collaborators.values()].map((s) => s.name)
          );
        });

    } catch (err) {
      // Colaboração falhou → editor continua a funcionar em modo offline (HTTP save)
      console.error('[TextEditor] Colaboração não iniciada:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Renderização de cursores remotos
  // ─────────────────────────────────────────────────────────────

  private renderCursor(connectionId: string, state: CollaboratorState): void {
    // Remover cursor anterior deste utilizador (será re-criado na nova posição)
    this.clearCursor(connectionId);

    // Sem cursor = utilizador sem foco no editor
    if (!state.cursor) return;

    let bounds: { left: number; top: number; height: number } | null;
    try {
      bounds = this.quill.getBounds(state.cursor.index, state.cursor.length ?? 0) as typeof bounds;
    } catch {
      return;
    }
    if (!bounds) return;

    // quill.getBounds() devolve coordenadas relativas ao elemento do container do Quill.
    // Com position:fixed + getBoundingClientRect() do container, obtemos a posição no viewport.
    const containerRect = this.editorContainer.nativeElement.getBoundingClientRect();

    // Linha vertical do cursor (2px de largura, cor do utilizador)
    const el = document.createElement('div');
    el.setAttribute('data-collab-id', connectionId);
    Object.assign(el.style, {
      position:      'fixed',
      pointerEvents: 'none',
      userSelect:    'none',
      zIndex:        '1000',
      left:          `${containerRect.left + bounds.left}px`,
      top:           `${containerRect.top  + bounds.top}px`,
      height:        `${bounds.height}px`,
      width:         '2px',
      background:    state.color,
    });

    // Etiqueta com o nome do utilizador
    const label = document.createElement('div');
    label.textContent = state.name;
    Object.assign(label.style, {
      position:     'absolute',
      top:          '-20px',
      left:         '0',
      background:   state.color,
      color:        '#fff',
      fontSize:     '11px',
      fontWeight:   '600',
      padding:      '2px 7px',
      borderRadius: '4px 4px 4px 0',
      whiteSpace:   'nowrap',
      lineHeight:   '1.4',
    });
    el.appendChild(label);

    document.body.appendChild(el);
    this.collaboratorCursors.set(connectionId, el);
  }

  private clearCursor(connectionId: string): void {
    const el = this.collaboratorCursors.get(connectionId);
    if (el) { el.remove(); this.collaboratorCursors.delete(connectionId); }
  }

  private clearAllCursors(): void {
    for (const el of this.collaboratorCursors.values()) el.remove();
    this.collaboratorCursors.clear();
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
      modules: { toolbar: false },
    });

    this.quill.root.setAttribute('spellcheck', 'false');

    // Conteúdo inicial (HTML) — se não houver snapshot Yjs, fica aqui
    if (this.initialContent()) {
      this.quill.root.innerHTML = this.initialContent();
    }

    if (!this.editable()) {
      this.quill.enable(false);
    }

    this.quill.on('text-change', () => {
      this.triggerContentChange();
      this.saveStatus.set('idle');
    });

    this.quill.on('selection-change', (range) => {
      if (range) this.updateActiveFormats();
    });

    this.quill.root.addEventListener('keyup', () => {
      this.updateActiveFormats();
    });

    // Emitir eventos de seleção para o componente pai (tooltip de Improve)
    this.setupSelectionChangeEmitter();

    // Intercetar CTRL+V de imagens para fazer upload em vez de inserir base64
    this.quill.root.addEventListener('paste', (e: ClipboardEvent) => {
      if (!this.editable()) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const file = item.getAsFile();
          if (file) {
            this.handleDroppedImage(file);
          }
          return;
        }
      }
    }, true);

    // Intercetar CTRL+V de imagens para fazer upload em vez de inserir base64
    this.quill.root.addEventListener('paste', (e: ClipboardEvent) => {
      if (!this.editable()) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const file = item.getAsFile();
          if (file) {
            this.handleDroppedImage(file);
          }
          return;
        }
      }
    }, true);

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
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert(`Image size must be less than 5MB. Dropped image is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return;
    }
    this.uploadService.uploadImage(file).subscribe({
      next: (res) => this.insertImageAtCursor(res.url),
      error: () => alert('Failed to upload image. Please try again.'),
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
    // O snapshot Y.Doc é agora enviado junto com o HTML no pedido HTTP
    // pelo document-editor.component (via documentService.updateDocument).
    // O saveStatus é atualizado pelo parent (document-editor) via setSaveStatus().
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
      if (url) this.quill.format('link', url);
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
    this.showTextColorMenu.update((v) => !v);
  }

  toggleBgColorMenu(): void {
    this.showTextColorMenu.set(false);
    this.showBgColorMenu.update((v) => !v);
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
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      if (file.size > maxSizeInBytes) {
        alert(`Image size must be less than 5MB. Selected image is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        return;
      }
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => this.insertImageAtCursor(res.url),
        error: () => alert('Failed to upload image. Please try again.'),
      });
    }
    input.value = '';
  }

  private insertImageAtCursor(imageUrl: string): void {
    const range = this.quill.getSelection(true);
    this.quill.insertEmbed(range.index, 'image', imageUrl);
    this.quill.setSelection(range.index + 1);
  }

  private selectImage(img: HTMLImageElement): void {
    this.deselectImage();
    this.selectedImage.set(img);
    img.classList.add('selected-image');
    const rect = img.getBoundingClientRect();
    const editorRect = this.editorContainer.nativeElement.getBoundingClientRect();
    this.imageMenuPosition.set({
      top: rect.top - editorRect.top - 45,
      left: rect.left - editorRect.left + rect.width / 2 - 100,
    });
    this.showImageMenu.set(true);
  }

  deselectImage(): void {
    const currentImage = this.selectedImage();
    if (currentImage) currentImage.classList.remove('selected-image');
    this.selectedImage.set(null);
    this.showImageMenu.set(false);
  }

  setImageSize(size: 'small' | 'medium' | 'large' | 'full'): void {
    const img = this.selectedImage();
    if (!img) return;

    const blot = (Quill as any).find(img);
    if (!blot) return;
    const index = this.quill.getIndex(blot);
    const src = img.getAttribute('src') ?? '';

    const widths = { small: '25%', medium: '50%', large: '75%', full: '100%' };
    const styleProps = this.parseInlineStyle(img.getAttribute('style') ?? '');
    styleProps['width'] = widths[size];
    styleProps['height'] = 'auto';
    const style = this.buildInlineStyle(styleProps);

    // Go through Quill API so the change is captured by QuillBinding → Yjs → SignalR
    this.quill.deleteText(index, 1, 'user');
    this.quill.insertEmbed(index, 'image', { src, style }, 'user');
    this.deselectImage();
  }

  setImageAlign(align: 'left' | 'center' | 'right'): void {
    const img = this.selectedImage();
    if (!img) return;

    const blot = (Quill as any).find(img);
    if (!blot) return;
    const index = this.quill.getIndex(blot);
    const src = img.getAttribute('src') ?? '';

    const styleProps = this.parseInlineStyle(img.getAttribute('style') ?? '');
    delete styleProps['float'];
    delete styleProps['margin-left'];
    delete styleProps['margin-right'];
    styleProps['display'] = 'block';

    if (align === 'left') {
      styleProps['float'] = 'left';
      styleProps['margin-right'] = '1rem';
    } else if (align === 'center') {
      styleProps['margin-left'] = 'auto';
      styleProps['margin-right'] = 'auto';
    } else {
      styleProps['float'] = 'right';
      styleProps['margin-left'] = '1rem';
    }

    const style = this.buildInlineStyle(styleProps);

    this.quill.deleteText(index, 1, 'user');
    this.quill.insertEmbed(index, 'image', { src, style }, 'user');
    this.deselectImage();
  }

  deleteImage(): void {
    const img = this.selectedImage();
    if (!img) return;

    const blot = (Quill as any).find(img);
    if (!blot) return;
    const index = this.quill.getIndex(blot);

    this.deselectImage();
    this.quill.deleteText(index, 1, 'user');
  }

  private parseInlineStyle(style: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!style) return result;
    for (const part of style.split(';')) {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) continue;
      const key = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      if (key && val) result[key] = val;
    }
    return result;
  }

  private buildInlineStyle(props: Record<string, string>): string {
    return Object.entries(props)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }

  private triggerContentChange(): void {
    const content = this.quill.root.innerHTML;
    this.contentChange.emit(content);
    this.contentChange$.next(content);
  }

  /** Devolve a cor do colaborador pelo índice (para usar no template) */
  getCollaboratorColor(index: number): string {
    return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
  }

  getToolbarButtonClass(isActive: boolean | string | undefined): string {
    const base = 'p-2 rounded hover:bg-gray-100 transition-colors';
    return isActive ? `${base} bg-[#e8f0ee] text-[#155347]` : `${base} text-gray-600`;
  }

  getContent(): string {
    return this.quill?.root.innerHTML || '';
  }

  setContent(content: string): void {
    if (this.quill) this.quill.root.innerHTML = content;
  }

  setSaveStatus(status: SaveStatus): void {
    this.saveStatus.set(status);
  }

  /**
   * Devolve o texto atualmente selecionado no editor Quill.
   * @returns Texto selecionado ou string vazia se não houver seleção.
   */
  getSelectedText(): string {
    if (!this.quill) return '';
    const range = this.quill.getSelection();
    if (!range || range.length === 0) return '';
    return this.quill.getText(range.index, range.length);
  }

  /**
   * Devolve os bounds (posição no ecrã) da seleção atual, útil para posicionar tooltips.
   * @returns { top, left, width, height } relativo ao viewport, ou null se não houver seleção.
   */
  getSelectionBounds(): { top: number; left: number; width: number; height: number } | null {
    if (!this.quill) return null;
    const range = this.quill.getSelection();
    if (!range || range.length === 0) return null;
    const bounds = this.quill.getBounds(range.index, range.length) as {
      top: number; left: number; width: number; height: number;
    };
    // Converter coordenadas relativas ao container do Quill para coordenadas do viewport
    const containerRect = this.quill.root.closest('.ql-editor')?.getBoundingClientRect()
      ?? this.quill.root.getBoundingClientRect();
    return {
      top: containerRect.top + bounds.top,
      left: containerRect.left + bounds.left,
      width: bounds.width,
      height: bounds.height,
    };
  }

  /**
   * Substitui o texto atualmente selecionado no editor por um novo texto.
   * @param newText Texto de substituição.
   */
  replaceSelectedText(newText: string): void {
    if (!this.quill) return;
    const range = this.quill.getSelection();
    if (!range || range.length === 0) return;
    this.quill.deleteText(range.index, range.length, 'user');
    this.quill.insertText(range.index, newText, 'user');
    // Selecionar o novo texto inserido
    this.quill.setSelection(range.index, newText.length, 'silent');
  }

  /**
   * Evento de seleção: emitido quando a seleção do utilizador muda.
   */
  selectionChange = output<{ text: string; bounds: { top: number; left: number; width: number; height: number } | null }>();

  /**
   * Evento emitido quando o utilizador clica no botão "+" de gerar conteúdo.
   * Inclui as coordenadas de viewport no momento do clique para posicionar o card.
   */
  generateButtonClick = output<{ viewportTop: number; viewportLeft: number; viewportHeight: number }>();

  // Botão "+" interno — posicionado em absolute dentro do container do editor
  showGenerateButton = signal(false);
  generateButtonPos = signal({ top: 0 });
  private currentEmptyLineIndex = 0;

  /** Emite eventos de seleção para o componente pai detetar seleções de texto. */
  private setupSelectionChangeEmitter(): void {
    if (!this.quill) return;

    const evaluate = (range: { index: number; length: number } | null) => {
      if (!range) {
        this.selectionChange.emit({ text: '', bounds: null });
        this.showGenerateButton.set(false);
        return;
      }
      if (range.length > 0) {
        const text = this.quill.getText(range.index, range.length);
        const bounds = this.getSelectionBounds();
        this.selectionChange.emit({ text, bounds });
        this.showGenerateButton.set(false);
      } else {
        this.selectionChange.emit({ text: '', bounds: null });
        this.checkEmptyLine(range.index);
      }
    };

    // Reagir a mudanças de cursor/seleção
    this.quill.on('selection-change', (range: any) => evaluate(range));

    // Reagir a mudanças de conteúdo (ex: apagar até linha ficar vazia, Enter para nova linha)
    this.quill.on('text-change', () => {
      // Defer para garantir que o cursor já está na posição final após a alteração
      setTimeout(() => {
        const range = this.quill.getSelection();
        evaluate(range);
      }, 0);
    });
  }

  /**
   * Verifica se a posição do cursor está numa linha vazia e emite o evento.
   */
  private checkEmptyLine(index: number): void {
    if (!this.quill) {
      this.showGenerateButton.set(false);
      return;
    }

    const [lineBlot] = this.quill.getLine(index);
    if (!lineBlot) {
      this.showGenerateButton.set(false);
      return;
    }

    const lineText = (lineBlot as any).domNode?.textContent ?? '';
    const isEmptyLine = lineText.trim().length === 0;

    if (isEmptyLine) {
      const bounds = this.quill.getBounds(index, 0) as { top: number; left: number; height: number };
      this.currentEmptyLineIndex = index;
      // Posicionar o botão verticalmente centrado na linha, relativo ao .ql-editor
      this.generateButtonPos.set({ top: bounds.top + bounds.height / 2 - 14 });
      this.showGenerateButton.set(true);
    } else {
      this.showGenerateButton.set(false);
    }
  }

  /** Clique no botão "+": emite coordenadas de viewport frescas para o componente pai posicionar o card. */
  onGenerateButtonMousedown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const rootRect = this.quill.root.getBoundingClientRect();
    const bounds = this.quill.getBounds(this.currentEmptyLineIndex, 0) as { top: number; left: number; height: number };
    this.generateButtonClick.emit({
      viewportTop: rootRect.top + bounds.top,
      viewportLeft: rootRect.left + bounds.left,
      viewportHeight: bounds.height,
    });
    this.showGenerateButton.set(false);
  }

  /**
   * Insere texto na posição atual do cursor.
   */
  insertTextAtCursor(text: string): void {
    if (!this.quill) return;
    const range = this.quill.getSelection();
    const index = range ? range.index : this.quill.getLength() - 1;
    this.quill.insertText(index, text, 'user');
    this.quill.setSelection(index + text.length, 0, 'silent');
  }
}