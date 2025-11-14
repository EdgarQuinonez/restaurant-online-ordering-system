import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TokenService } from './token.service';
import { Router } from '@angular/router';

export interface AuthResponse {
  token: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  authenticate(credentials: AuthRequest): Observable<string> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/api-token-auth/`, credentials)
      .pipe(
        map((response) => {
          if (!response?.token) {
            throw new Error('Invalid response from authentication server');
          }
          return response.token;
        }),
        catchError((error) => this.handleAuthError(error)),
      );
  }

  logout() {
    // Clear token from token service
    this.tokenService.clearToken();
    // Navigate to login page
    this.router.navigate(['/admin/login']);
  }

  private handleAuthError(error: any): Observable<never> {
    if (error.status === 401) {
      return throwError(() => new Error('Contraseña y/o usuario inválido(s)'));
    } else if (error.status === 400) {
      return throwError(
        () => new Error('Solicitud inválida. Verifique los datos ingresados.'),
      );
    } else if (error.status === 0 || error.status === 503) {
      return throwError(
        () =>
          new Error('Servicio no disponible. Intente nuevamente más tarde.'),
      );
    } else if (error.status >= 500) {
      return throwError(
        () => new Error('Error interno del servidor. Intente nuevamente.'),
      );
    } else {
      return throwError(
        () => new Error('Error de conexión. Verifique su conexión a internet.'),
      );
    }
  }
}
