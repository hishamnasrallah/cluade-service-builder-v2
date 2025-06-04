// interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const configService = inject(ConfigService);

  // Get the token
  const token = authService.getToken();
  const baseUrl = configService.getBaseUrl();

  // Only add auth header if:
  // 1. We have a token
  // 2. The request is to our API (matches base URL)
  // 3. Request doesn't have 'No-Auth' header
  if (token &&
    baseUrl &&
    req.url.startsWith(baseUrl) &&
    !req.headers.has('No-Auth')) {

    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return next(authReq);
  }

  return next(req);
};
