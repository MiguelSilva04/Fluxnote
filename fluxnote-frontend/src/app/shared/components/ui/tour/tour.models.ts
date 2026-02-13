export type TourPosition = 'top' | 'bottom' | 'left' | 'right';

/** Posição do tooltip no ecrã quando não há elemento alvo. Default: 'center' */
export type ScreenPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface TourStep {
  /** Seletor CSS do elemento alvo. Se omitido, o tooltip posiciona-se no ecrã conforme screenPosition. */
  targetSelector?: string;

  /** Título exibido no cabeçalho do tooltip */
  title: string;

  /** Texto descritivo deste passo */
  description: string;

  /** Posição preferida do tooltip em relação ao elemento alvo (usado quando targetSelector está presente) */
  position: TourPosition;

  /** Posição do tooltip no ecrã quando targetSelector é omitido. Default: 'center' */
  screenPosition?: ScreenPosition;

  /** Opcional: Classe CSS personalizada para o tooltip neste passo */
  customClass?: string;

  /** Opcional: Callback invocado quando este passo fica ativo */
  onActivate?: () => void;

  /** Opcional: Callback invocado ao sair deste passo */
  onDeactivate?: () => void;
}

export interface TourConfig {
  /** Padding (px) à volta do elemento destacado no spotlight. Default: 8 */
  spotlightPadding?: number;

  /** Border radius (px) do recorte do spotlight. Default: 8 */
  spotlightBorderRadius?: number;

  /** Se clicar no backdrop fecha o tour. Default: false */
  backdropDismiss?: boolean;

  /** Se a tecla ESC fecha o tour. Default: true */
  escDismiss?: boolean;

  /** Se deve fazer scroll suave até ao elemento alvo. Default: true */
  scrollIntoView?: boolean;

  /** Opacidade do overlay (0-1). Default: 0.5 */
  overlayOpacity?: number;

  /** Callback invocado quando o tour termina (último passo concluído) */
  onFinish?: () => void;

  /** Callback invocado quando o tour é ignorado/saltado */
  onSkip?: () => void;
}
