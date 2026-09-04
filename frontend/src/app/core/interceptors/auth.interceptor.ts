// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {
    console.log('✅ AuthInterceptor initialized!');
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    console.log('🔑 AuthInterceptor - Token:', token ? token.substring(0, 20) + '...' : 'null');

    let authReq = request;
    if (token && request.url.includes('/api/')) {
      authReq = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('📤 AuthInterceptor - Adding Authorization header to:', request.url);
    }

    return next.handle(authReq);
  }
}