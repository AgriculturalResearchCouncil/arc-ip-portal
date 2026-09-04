// src/app/core/interceptors/auth.interceptor.fn.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  console.log('🔑 Functional Interceptor - Token:', token ? token.substring(0, 25) + '...' : 'NO TOKEN');
  
  if (token && req.url.includes('/api/')) {
    const cloned = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Functional Interceptor - Added Bearer token to:', req.url);
    return next(cloned);
  }
  
  console.log('⚠️ Functional Interceptor - No token for:', req.url);
  return next(req);
};