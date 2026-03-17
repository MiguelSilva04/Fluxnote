import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Interceptor HTTP que adiciona o token de autenticação a todas as requisições
 * e implementa retry automático com refresh em caso de erro 401.
 *
 * Comportamento:
 * - Adiciona o header Authorization com o access token a requisições autenticadas
 * - Ignora endpoints de autenticação (/api/auth) para evitar loops
 * - Em caso de 401, tenta fazer refresh do token e repetir a requisição
 * - Se o refresh falhar, propaga o erro original
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Não interceptar endpoints de auth para evitar loops
    if (req.url.includes('/api/auth')) {
      return next.handle(req);
    }

    // Adicionar token se disponível
    const token = this.auth.getAccessToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Se 401, tentar refresh e repetir a requisição
        if (error.status === 401 && !req.url.includes('/api/auth')) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Adiciona o token de autenticação ao request.
   */
  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true
    });
  }

  /**
   * Trata erros 401 tentando fazer refresh do token e repetindo a requisição.
   * Usa o padrão single-flight do AuthService para evitar múltiplos refreshes.
   */
  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.auth.refresh()).pipe(
      switchMap((refreshed: boolean) => {
        if (refreshed) {
          // Refresh bem-sucedido, repetir requisição com novo token
          const token = this.auth.getAccessToken();
          if (token) {
            return next.handle(this.addToken(req, token));
          }
        }
        // Refresh falhou, propagar erro 401
        return throwError(() => new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
          error: { message: 'Session expired. Please login again.' }
        }));
      }),
      catchError((refreshError) => {
        return throwError(() => refreshError);
      })
    );
  }
}
