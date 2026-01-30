import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../models';

/**
 * interface que representa a resposta do servidor após uma tentativa de registo.
 * contém informações sobre o sucesso ou falha da operação, incluindo possíveis erros de validação.
 */
export interface RegisterResponse {
  /** mensagem descritiva sobre o resultado da operação de registo */
  message: string;
  /** status opcional da operação (ex: 'success', 'error') */
  status?: string;
  /** lista opcional de erros de validação ou processamento */
  errors?: string[]
}

/**
 * interface que representa a resposta do servidor após uma tentativa de autenticação bem-sucedida.
 * contém o token de acesso e informação sobre a sua duração de validade.
 */
export interface LoginResponse {
  /** token de acesso JWT que será utilizado para autenticar requisições subsequentes */
  accessToken: string;
  /** duração de validade do token em segundos */
  expiresInSeconds: number;
}

/**
 * interface que representa o resultado de uma operação de login.
 * contém informação sobre o sucesso da operação e mensagens de erro, se aplicável.
 */
export interface LoginResult {
  /** indica se o login foi bem-sucedido */
  success: boolean;
  /** mensagem de erro principal, se houver */
  message?: string;
  /** lista de erros detalhados, se houver */
  errors?: string[];
}

/**
 * interface que representa a resposta do servidor ao solicitar um novo token de acesso.
 * utilizada no processo de refresh token para obter um novo access token sem reautenticação.
 */
export interface TokenResponse {
  /** novo token de acesso JWT obtido através do refresh token */
  accessToken: string;
  /** duração de validade do novo token em segundos */
  expiresInSeconds: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  userName: string;
  profilePictureUrl: string;
  location: string;
  phoneNumber: string;
}

/**
 * tipo que representa os possíveis estados de autenticação do utilizador na aplicação.
 * 'unknown' indica que o estado ainda não foi determinado (inicialização),
 * 'authenticated' indica que o utilizador está autenticado,
 * 'unauthenticated' indica que o utilizador não está autenticado.
 */
type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

/**
 * serviço responsável pela gestão de autenticação e autorização na aplicação.
 * implementa o padrão de segurança "cookie refresh + access token em memória", onde o refresh token
 * é armazenado em cookie HttpOnly (gerido pelo backend) e o access token permanece apenas em memória
 * através de signals reativos do Angular.
 * 
 * este serviço centraliza todas as operações relacionadas com autenticação, incluindo login, registo,
 * confirmação de email, recuperação de palavra-passe, e gestão de tokens e mais tudo o que 
 * esteja relacionado com autenticação. Utiliza signals para manter o estado de autenticação reativo e computado, 
 * permitindo que componentes reajam automaticamente a mudanças no estado de autenticação.
 * 
 * @example
 * ```typescript
 * // injeção do serviço
 * constructor(private auth: AuthService) {}
 * 
 * // verificar se está autenticado na auth.guard.ts
 * if (this.auth.isAuthenticated()) {
 *   // utilizador autenticado
 * }
 * 
 * // realizar login
 * const success = await this.auth.login(email, password, rememberMe);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /**
   * signal privado que armazena o token de acesso JWT em memória.
   * este token não é persistido em localStorage por questões de segurança, sendo perdido
   * quando a aplicação é recarregada. a recuperação é feita através do refresh token
   * armazenado em cookie HttpOnly.
   */
  private readonly _accessToken = signal<string | null>(null);

  /**
   * signal privado que mantém o estado atual de autenticação do utilizador.
   * pode assumir os valores 'unknown' (ainda não determinado), 'authenticated' (autenticado),
   * ou 'unauthenticated' (não autenticado).
   */
  private readonly _status = signal<AuthStatus>('unknown');

  /**
   * propriedade pública readonly que expõe o estado de autenticação de forma reativa.
   * componentes podem observar este signal para reagir a mudanças no estado de autenticação.
   */
  readonly status = this._status.asReadonly();

  /**
   * signal privado que armazena os dados do utilizador atualmente autenticado.
   * estes dados são mantidos apenas em memória e extraídos do JWT após refresh.
   * não são persistidos em localStorage por questões de segurança.
   */
  private readonly _currentUser = signal<User | null>(null);

  /**
   * signal privado que indica se alguma operação de autenticação está em curso.
   * útil para mostrar indicadores de carregamento durante operações assíncronas.
   */
  private readonly _isLoading = signal(false);

  /**
   * promise privada que armazena uma operação de refresh em curso.
   * utilizada para implementar "single-flight" - se já existe um refresh a decorrer,
   * reutiliza-se a mesma promise em vez de disparar múltiplas chamadas paralelas.
   * isto evita rotação excessiva de tokens e pressão desnecessária na BD.
   */
  private _refreshPromise: Promise<boolean> | null = null;

  /**
   * propriedade pública readonly que expõe os dados do utilizador atual de forma reativa.
   * retorna null se não houver utilizador autenticado.
   */
  readonly currentUser = this._currentUser.asReadonly();

  /**
   * propriedade pública readonly que expõe o estado de carregamento de forma reativa.
   * útil para desabilitar botões ou mostrar spinners durante operações de autenticação.
   */
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * computed signal que determina se o utilizador está atualmente autenticado.
   * verifica a existência e validade do token de acesso em memória.
   * retorna true se o token existir e não estiver expirado, false caso contrário.
   */
  readonly isAuthenticated = computed(() => {
    const token = this._accessToken();
    return !!token && !this.isJwtExpired(token);
  });

  /**
   * url base para todas as requisições de autenticação ao backend.
   * todas as operações de autenticação são direcionadas para endpoints sob este caminho.
   */
  private readonly baseUrl = '/api/auth';

  /**
   * construtor do serviço de autenticação.
   * inicializa o serviço com estado limpo. o estado de autenticação será determinado
   * através da chamada ao método initAuth() no arranque da aplicação, que tenta
   * recuperar a sessão usando o refresh token em cookie HttpOnly.
   *
   * @param router - instância do router do Angular para navegação programática
   * @param http - cliente HTTP do Angular para realizar requisições ao backend
   */
  constructor(private router: Router, private http: HttpClient) { }

  /**
   * formata um tempo em segundos para uma string legível com minutos e segundos.
   *
   * @param totalSeconds - tempo total em segundos
   * @returns string formatada (ex: "14 minutes and 55 seconds", "2 minutes", "45 seconds")
   */
  private formatRetryTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    if (seconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  /**
   * método privado que verifica se um token JWT está expirado.
   * decodifica o payload do token (sem validação de assinatura) e verifica
   * se a data de expiração (exp) já foi ultrapassada.
   *
   * @param token - token JWT a ser verificado
   * @returns true se o token estiver expirado ou se ocorrer erro na decodificação, false caso contrário
   */
  private isJwtExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expMs = payload.exp * 1000;
      return Date.now() > expMs;
    } catch (error) {
      return true;
    }
  }

  /**
   * inicializa o processo de autenticação no arranque da aplicação.
   * este método deve ser chamado uma vez durante a inicialização da aplicação (geralmente
   * no componente raiz) para determinar o estado de autenticação do utilizador.
   * 
   * o método sempre tenta obter um novo access token através do endpoint /refresh,
   * utilizando o refresh token armazenado em cookie HttpOnly. se o refresh token for válido,
   * o access token obtido é armazenado em memória e o estado é definido como 'authenticated'.
   * caso contrário, o estado é definido como 'unauthenticated' e os dados locais são limpos.
   * 
   * este comportamento garante que mesmo após um refresh da página (F5), onde o access token
   * em memória é perdido, a sessão pode ser recuperada se o refresh token ainda for válido.
   * 
   * @returns Promise que resolve quando a inicialização estiver completa
   * 
   * @example
   * ```typescript
   * // no app.component.ts ou main.ts
   * constructor(private auth: AuthService) {
   *   this.auth.initAuth();
   * }
   * ```
   */
  async initAuth(): Promise<void> {
    try {
      // chama sempre /refresh (não verifica localStorage)
      // O refresh token está em cookie HttpOnly, então o backend envia automaticamente
      const res = await firstValueFrom(
        this.http.post<TokenResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      );

      // Guarda o access token APENAS em memória (signal) para evitar fácil acesso não desejado
      this._accessToken.set(res.accessToken);
      this.setAuthenticatedState(res.accessToken);
      this._status.set('authenticated');
      const resUser = await firstValueFrom(
        this.http.get<UserProfile>(`${this.baseUrl}/users/me`, {
          headers: { Authorization: `Bearer ${this._accessToken()}` }
        })
      );
      const user: User = {
        id: resUser.id,
        email: resUser.email,
        fullName: resUser.fullName,
        userName: resUser.userName,
        profilePictureUrl: resUser.profilePictureUrl,
        location: resUser.location,
        phoneNumber: resUser.phoneNumber,
        initials: this.getInitials(resUser.fullName),  
        color: this.generateColorFromName(resUser.id)    
      };
      this._currentUser.set(user);
    } catch {
      // Refresh token inválido/expirado ou não existe
      this._accessToken.set(null);
      this._currentUser.set(null);
      this._status.set('unauthenticated');
    }
  }

  /**
   * atualiza o token de acesso utilizando o refresh token armazenado em cookie HttpOnly.
   * este método é utilizado quando o access token atual expira ou quando uma requisição
   * retorna um erro 401 (não autorizado), permitindo obter um novo access token sem
   * exigir que o utilizador faça login novamente.
   *
   * o método realiza uma requisição POST para o endpoint /refresh, que utiliza automaticamente
   * o refresh token do cookie HttpOnly. se bem-sucedido, atualiza o access token em memória
   * e define o estado como 'authenticated'. em caso de falha (refresh token inválido ou expirado),
   * executa logout automático e retorna false.
   *
   * implementa o padrão "single-flight": se já existe uma chamada refresh() em curso,
   * reutiliza a mesma Promise em vez de disparar múltiplas requisições paralelas.
   * isto evita rotação excessiva de tokens e pressão desnecessária na BD.
   *
   * @returns Promise que resolve com true se o refresh foi bem-sucedido, false caso contrário
   *
   * @example
   * ```typescript
   * // em um interceptor HTTP ao receber 401
   * if (error.status === 401) {
   *   const refreshed = await this.auth.refresh();
   *   if (refreshed) {
   *     // repetir requisição original
   *   }
   * }
   * ```
   */
  async refresh(): Promise<boolean> {
    // Single-flight: se já há um refresh em curso, reutiliza a mesma Promise
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = this.doRefresh();

    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  /**
   * método privado que executa a lógica real do refresh.
   * separado do método público para permitir o padrão single-flight.
   */
  private async doRefresh(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<TokenResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      );

      // atualiza access token em memória
      this._accessToken.set(res.accessToken);
      this.setAuthenticatedState(res.accessToken);
      this._status.set('authenticated');
      return true;
    } catch (error: any) {
      // Rate limit - não fazer logout, apenas falhar silenciosamente
      if (error.status === 429) {
        console.warn('Refresh rate limit exceeded');
        return false;
      }
      this.logout();
      return false;
    }
  }

  /**
   * autentica um utilizador na aplicação utilizando credenciais de email e palavra-passe.
   * realiza uma requisição POST para o endpoint /login com as credenciais fornecidas.
   * 
   * em caso de sucesso, o método recebe um access token que é armazenado em memória através
   * do signal _accessToken. o refresh token é automaticamente armazenado em cookie HttpOnly
   * pelo backend, não sendo acessível via JavaScript por questões de segurança.
   * 
   * o parâmetro rememberMe controla a duração do refresh token: se true, o token persiste
   * por um período mais longo, permitindo que a sessão seja mantida mesmo após fechar o browser.
   * 
   * durante a operação, o signal isLoading é definido como true, permitindo que componentes
   * reajam e mostrem indicadores de carregamento.
   * 
   * @param email - endereço de email do utilizador
   * @param password - palavra-passe do utilizador
   * @param rememberMe - indica se a sessão deve ser mantida por um período prolongado
   * @returns Promise que resolve com LoginResult contendo informação sobre sucesso e erros
   * 
   * @example
   * ```typescript
   * const result = await this.auth.login('user@example.com', 'password123', true);
   * if (result.success) {
   *   this.router.navigate(['/dashboard']);
   * } else {
   *   // mostrar erro: result.error
   * }
   * ```
   */
  async login(email: string, password: string, rememberMe: boolean): Promise<LoginResult> {
    this._isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(
          `${this.baseUrl}/login`,
          { email, password, rememberMe },
          { withCredentials: true }
        )
      );

      // access token fica APENAS em memória (não localStorage)
      // refresh token fica em cookie HttpOnly (gerido pelo backend)
      this._accessToken.set(res.accessToken);
      this.setAuthenticatedState(res.accessToken);
      this._status.set('authenticated');
      return { success: true };
    } catch (error: any) {
      // extrai mensagens de erro diretamente do corpo da resposta HTTP
      if (error.status === 0) {
        // servidor não está acessível (offline, CORS, etc.)
        return {
          success: false,
          message: 'Server error. Check your internet connection or try again later.',
          errors: ['Unable to connect to the server.']
        };
      }

      // Rate limit exceeded (429)
      if (error.status === 429) {
        const retryAfter = error.headers?.get('Retry-After');
        const totalSeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // default 15min
        const timeMessage = this.formatRetryTime(totalSeconds);
        return {
          success: false,
          message: `Too many login attempts. Please try again in ${timeMessage}.`,
          errors: [`Rate limit exceeded. Retry after ${timeMessage}.`]
        };
      }

      // o backend retorna { message, errors } no corpo da resposta
      const errorBody = error.error || {};
      return {
        success: false,
        message: errorBody.message || 'Login failed. Please try again.',
        errors: errorBody.errors || [errorBody.message || 'Internal error.']
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * regista um novo utilizador na aplicação.
   * realiza uma requisição POST para o endpoint /register com os dados fornecidos.
   * 
   * este método não autentica automaticamente o utilizador após o registo. normalmente,
   * após um registo bem-sucedido, o utilizador recebe um email de confirmação e deve
   * confirmar a conta antes de poder fazer login.
   * 
   * a resposta contém informações sobre o resultado da operação, incluindo possíveis
   * erros de validação (ex: email já existente, palavra-passe fraca, etc.).
   * 
   * durante a operação, o signal isLoading é definido como true para indicar que
   * uma operação assíncrona está em curso.
   * 
   * @param fullName - nome completo do utilizador
   * @param email - endereço de email do utilizador (deve ser único)
   * @param password - palavra-passe do utilizador (deve cumprir requisitos de segurança)
   * @returns Promise que resolve com a resposta do servidor contendo mensagem e possíveis erros
   * 
   * @example
   * ```typescript
   * const response = await this.auth.register('João Silva', 'joao@example.com', 'senha123');
   * if (response.status === 'success') {
   *   // redirecionar para página de confirmação de email
   * } else {
   *   // mostrar erros de validação
   *   console.log(response.errors);
   * }
   * ```
   */
  async register(fullName: string, email: string, password: string): Promise<RegisterResponse> {
    this._isLoading.set(true);
    try {
      return await firstValueFrom(
        this.http.post<RegisterResponse>(`${this.baseUrl}/register`, { fullName, email, password })
      );
    } catch (error: any) {
      // extrai mensagens de erro diretamente do corpo da resposta HTTP
      if (error.status === 0) {
        // servidor não está acessível (offline, CORS, etc.)
        return {
          message: 'Server error. Check your internet connection or try again later.',
          status: 'error',
          errors: ['Unable to connect to the server.']
        };
      }

      // Rate limit exceeded (429)
      if (error.status === 429) {
        const retryAfter = error.headers?.get('Retry-After');
        const totalSeconds = retryAfter ? parseInt(retryAfter, 10) : 3600; // default 1 hora
        const timeMessage = this.formatRetryTime(totalSeconds);
        return {
          message: `Too many registration attempts. Please try again in ${timeMessage}.`,
          status: 'error',
          errors: [`Rate limit exceeded. Retry after ${timeMessage}.`]
        };
      }

      // o backend retorna { message, errors } no corpo da resposta
      const errorBody = error.error || {};
      return {
        message: errorBody.message || 'Failed to create account. Please try again.',
        status: 'error',
        errors: errorBody.errors || [errorBody.message || 'Internal error.']
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  async getDevLastConfirmationLink(email: string): Promise<string | null> {
    try {
      const params = new HttpParams().set('email', email);
      const res = await firstValueFrom(
        this.http.get<{ confirmationLink: string }>(
          `${this.baseUrl}/dev/last-confirmation-link`,
          { params }
        )
      );
      return res.confirmationLink;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // ou lançar erro
      }
      throw error;
    }
  }

  /**
   * confirma o endereço de email de um utilizador utilizando o token de confirmação.
   * este método é chamado quando o utilizador clica no link de confirmação recebido por email
   * após o registo. o link contém o userId e um token de confirmação único.
   * 
   * realiza uma requisição GET para o endpoint /confirm-email com os parâmetros userId e token
   * como query parameters. a resposta indica se a confirmação foi bem-sucedida ou se ocorreram
   * erros (ex: token inválido ou expirado).
   * 
   * após confirmação bem-sucedida, o utilizador pode fazer login normalmente. em caso de falha,
   * pode ser necessário solicitar um novo email de confirmação.
   * 
   * @param userId - identificador único do utilizador a confirmar
   * @param token - token de confirmação único enviado por email
   * @returns Promise que resolve com a resposta do servidor contendo mensagem e status da operação
   * 
   * @example
   * ```typescript
   * // ao receber parâmetros da URL (ex: /confirm-email?userId=123&token=abc)
   * const response = await this.auth.confirmEmail(userId, token);
   * if (response.status === 'success') {
   *   // redirecionar para página de login
   * }
   * ```
   */
  async confirmEmail(userId: string, token: string): Promise<RegisterResponse> {
    this._isLoading.set(true);
    try {
      const params = new HttpParams().set('userId', userId).set('token', token);
      return await firstValueFrom(
        this.http.get<RegisterResponse>(`${this.baseUrl}/confirm-email`, { params })
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * método privado para extrair o user do JWT
   */
  private extractUserFromToken(token: string): User | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload.name || '';
      return {
        id: payload.sub,
        email: payload.email,
        initials: this.getInitials(name),
        color: this.generateColorFromName(name)
      };
    } catch (err) {
      console.log(`Erro a extrair o user do JWT: ${err}`);
      return null;
    }
  }

  /**
   * Helper para gerar as iniciais do user
   */
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .splice(0, 2)
      .join('')
      .toLocaleUpperCase();
  }

  /**
   * Helper para gerar cor consistente baseada no nome do user
   */
  private generateColorFromName(name: string): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Helper para guardar o user após obter o JWT
   */
  private setAuthenticatedState(accessToken: string): void {
    this._accessToken.set(accessToken);
    const user = this.extractUserFromToken(accessToken);
    this._currentUser.set(user);
    this._status.set("authenticated");
  }

  /**
   * inicia o processo de recuperação de palavra-passe para um utilizador.
   * este método é chamado quando o utilizador esquece a sua palavra-passe e solicita
   * um link de redefinição por email.
   * 
   * atualmente, este método implementa uma simulação com delay de 1.5 segundos.
   * em produção, deve realizar uma requisição ao backend que envia um email com
   * instruções e um token de redefinição de palavra-passe.
   * 
   * por questões de segurança, o método sempre retorna true, mesmo que o email
   * não exista na base de dados, para evitar que atacantes descubram quais emails
   * estão registados no sistema.
   * 
   * @param email - endereço de email do utilizador que deseja recuperar a palavra-passe
   * @returns Promise que resolve com true (sempre, por questões de segurança)
   * 
   * @example
   * ```typescript
   * const sent = await this.auth.forgotPassword('user@example.com');
   * if (sent) {
   *   // mostrar mensagem: "verifique o seu email"
   * }
   * ```
   */
  async forgotPassword(email: string): Promise<boolean> {
    this._isLoading.set(true);

    return new Promise((resolve) => {
      setTimeout(() => {
        this._isLoading.set(false);
        resolve(true);
      }, 1500);
    });
  }

  /**
   * termina a sessão do utilizador atual e limpa todos os dados de autenticação.
   * este método remove o access token da memória, limpa os dados do utilizador armazenados
   * localmente, e define o estado de autenticação como 'unauthenticated'.
   * 
   * o refresh token armazenado em cookie HttpOnly deve ser invalidado através de uma
   * chamada ao endpoint /logout no backend, se esse endpoint existir. caso contrário,
   * o cookie expirará naturalmente ou será limpo pelo browser.
   * 
   * após o logout, o utilizador é redirecionado para a página de login. este método
   * não realiza requisições assíncronas ao backend, sendo uma operação síncrona que
   * apenas limpa o estado local.
   * 
   * @example
   * ```typescript
   * // em um componente ou serviço
   * this.auth.logout();
   * // utilizador será redirecionado para /login automaticamente
   * ```
   */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/logout-all`, {}, { withCredentials: true })
      );
    } catch (err) {
      console.log("Logout error: ", err);
    }
    this._accessToken.set(null);
    this._currentUser.set(null);
    this._status.set('unauthenticated');
    this.router.navigate(['/login']);
  }

  /**
   * obtém o token de acesso atual armazenado em memória.
   * este método retorna o access token JWT que está atualmente armazenado no signal
   * _accessToken, após verificar se o token existe e não está expirado.
   * 
   * o token é utilizado pelo AuthInterceptor para adicionar o header Authorization
   * em requisições HTTP que requerem autenticação. se o token não existir ou estiver
   * expirado, retorna null, indicando que uma nova autenticação ou refresh é necessária.
   * 
   * @returns o token de acesso JWT se válido, ou null se não existir ou estiver expirado
   * 
   * @example
   * ```typescript
   * const token = this.auth.getAccessToken();
   * if (token) {
   *   // token válido disponível
   * } else {
   *   // necessário fazer login ou refresh
   * }
   * ```
   */
  getAccessToken(): string | null {
    const token = this._accessToken();
    if (!token || this.isJwtExpired(token)) {
      return null;
    }
    return token;
  }

  /**
   * verifica se existe um token de acesso válido atualmente em memória.
   * este método é uma conveniência que verifica se getAccessToken() retorna um valor
   * não-nulo, indicando que o utilizador possui uma sessão ativa com um token válido.
   * 
   * diferentemente de isAuthenticated (que é um computed signal reativo), este método
   * retorna um valor booleano simples baseado no estado atual. é útil para verificações
   * pontuais sem necessidade de reatividade.
   * 
   * @returns true se existe um token válido, false caso contrário
   * 
   * @example
   * ```typescript
   * if (this.auth.isLoggedIn()) {
   *   // utilizador tem sessão ativa
   * }
   * ```
   */
  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }
}
