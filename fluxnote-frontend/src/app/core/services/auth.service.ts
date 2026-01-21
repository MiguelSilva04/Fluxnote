import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor(private router: Router) {
    // Check for stored user on init
    const storedUser = localStorage.getItem('fluxnote_user');
    if (storedUser) {
      this._currentUser.set(JSON.parse(storedUser));
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    this._isLoading.set(true);

    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const user: User = {
          id: '1',
          name: 'Alex Morgan',
          email: email,
          initials: 'AM',
          color: '#3B82F6',
          role: 'Team Owner'
        };

        this._currentUser.set(user);
        localStorage.setItem('fluxnote_user', JSON.stringify(user));
        this._isLoading.set(false);
        resolve(true);
      }, 1500);
    });
  }

  async register(fullName: string, email: string, password: string): Promise<boolean> {
    this._isLoading.set(true);

    return new Promise((resolve) => {
      setTimeout(() => {
        const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const user: User = {
          id: '1',
          name: fullName,
          email: email,
          initials: initials,
          color: '#3B82F6',
          role: 'Member'
        };

        this._currentUser.set(user);
        localStorage.setItem('fluxnote_user', JSON.stringify(user));
        this._isLoading.set(false);
        resolve(true);
      }, 1500);
    });
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

  logout(): void {
    this._currentUser.set(null);
    localStorage.removeItem('fluxnote_user');
    this.router.navigate(['/login']);
  }
}
