import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '@services/token.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Check if the request URL includes '/order/'
  if (req.url.includes('/orders/')) {
    const tokenService = inject(TokenService);

    // Check if user has a valid token
    if (tokenService.hasValidToken()) {
      const token = tokenService.getToken();

      // If token is available, append Authorization header
      if (token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Token ${token}`,
          },
        });
        return next(authReq);
      }
    }
  }

  // For non-order requests or when no token is available, proceed with original request
  return next(req);
};
