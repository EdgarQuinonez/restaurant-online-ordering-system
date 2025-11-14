import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '@services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.hasValidToken()) {
    return true;
  }

  // Redirect to login page with return url
  return router.createUrlTree(['admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
