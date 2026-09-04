// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  person_id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  roles: string[];
  role: string;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
    refreshToken?: string;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api/v1';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if we have a token on startup
    const token = this.getToken();
    if (token) {
      console.log('🔑 Token found in localStorage, validating...');
      this.getCurrentUser().subscribe({
        next: (user) => {
          console.log('✅ User validated:', user);
          this.currentUserSubject.next(user);
        },
        error: (err) => {
          console.log('⚠️ Token invalid, clearing...');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('refresh_token');
        }
      });
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    console.log('🔑 Attempting login...');
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          console.log('📥 Login response:', response);
          if (response.success && response.data) {
            // Store token in localStorage
            localStorage.setItem('jwt_token', response.data.token);
            if (response.data.refreshToken) {
              localStorage.setItem('refresh_token', response.data.refreshToken);
            }
            this.currentUserSubject.next(response.data.user);
            console.log('✅ Login successful, token stored');
          }
        })
      );
  }

  logout(): Observable<any> {
    console.log('🚪 Logging out...');
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers })
      .pipe(
        tap(() => {
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('refresh_token');
          this.currentUserSubject.next(null);
          console.log('✅ Logged out');
        })
      );
  }

  getCurrentUser(): Observable<User> {
    console.log('👤 Fetching current user...');
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<{ success: boolean; data: User }>(`${this.apiUrl}/auth/me`, { headers })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentUserSubject.next(response.data);
          }
        }),
        map(response => response.data)
      );
  }

  refreshToken(): Observable<{ success: boolean; data: { token: string; refreshToken: string } }> {
    const refreshToken = localStorage.getItem('refresh_token');
    console.log('🔄 Refreshing token...');
    return this.http.post<{ success: boolean; data: { token: string; refreshToken: string } }>(
      `${this.apiUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('jwt_token', response.data.token);
          if (response.data.refreshToken) {
            localStorage.setItem('refresh_token', response.data.refreshToken);
          }
          console.log('✅ Token refreshed');
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.getValue();
    return user?.roles?.includes(role) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.getValue();
    return roles.some(role => user?.roles?.includes(role));
  }

  getUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  getUserInitials(): string {
    const user = this.getUser();
    if (user) {
      const first = user.firstName?.charAt(0) || '';
      const last = user.lastName?.charAt(0) || '';
      return (first + last).toUpperCase() || 'U';
    }
    return 'U';
  }

  getFullName(): string {
    const user = this.getUser();
    if (user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    }
    return 'User';
  }

  getUserRoleDisplay(): string {
    const user = this.getUser();
    if (user) {
      return user.role || user.roles?.[0] || 'User';
    }
    return 'User';
  }
}