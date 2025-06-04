// guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';

export const AuthGuard = () => {
  const authService = inject(AuthService);
  const configService = inject(ConfigService);
  const router = inject(Router);

  if (!configService.isConfigured()) {
    router.navigate(['/config']);
    return false;
  }

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
