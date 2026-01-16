import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = (auth.getToken() || '').trim();

  if (!token || token === 'undefined' || token === 'null') {
    return next(req);
  }

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
