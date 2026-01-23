import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../models';

type ApiResponse = { message: string; status?: string; errors?: string[]}

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'fluxnote_access_token';
  
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  private readonly baseUrl = '/api/auth';

  constructor(private router: Router, private http: HttpClient) {
    // Check for stored user on init
    const storedUser = localStorage.getItem('fluxnote_user');
    if (storedUser) {
      this._currentUser.set(JSON.parse(storedUser));
    }
  }

  async login(email: string, password: string, rememberMe: boolean): Promise<boolean> {
    this._isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(
          `${this.baseUrl}/login`,
          { email, password, rememberMe },
          { withCredentials: true }
        )
      );
      localStorage.setItem(this.tokenKey, res.accessToken);
      return true;
    } catch (error) {
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async register(fullName: string, email: string, password: string): Promise<ApiResponse> {
    this._isLoading.set(true);
    try {
      return await firstValueFrom(
        this.http.post<ApiResponse>(`${this.baseUrl}/register`, { fullName, email, password })
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  async confirmEmail(userId: string, token: string): Promise<ApiResponse> {
    this._isLoading.set(true);
    try {
      const params = new HttpParams().set('userId', userId).set('token', token);
      return await firstValueFrom(
        this.http.get<ApiResponse>(`${this.baseUrl}/confirm-email`, { params })
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  async forgotPassword(email: string): Promise<boolean> {
    this._isLoading.set(true);

    return new Promise((resolve) => {
      setTimeout(() => {
        this._isLoading.set(false);
        resolve(true);
      }, 1500);
    });
  }

  logout() {
    this._currentUser.set(null);
    localStorage.removeItem('fluxnote_user');
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }
}
