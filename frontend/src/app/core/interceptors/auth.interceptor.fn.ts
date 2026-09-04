import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  console.log('🔑 Functional Interceptor - Token:', token ? token.substring(0, 20) + '...' : 'null');
  
  if (token && req.url.includes('/api/')) {
    const cloned = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('📤 Functional Interceptor - Adding Auth header to:', req.url);
    return next(cloned);
  }
  
  return next(req);
};