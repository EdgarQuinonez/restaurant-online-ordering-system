import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';

interface LoginForm {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login-page',
  template: `
    <div class="login-container">
      <form
        [formGroup]="loginForm"
        (ngSubmit)="onSubmit()"
        class="login-form"
        aria-labelledby="login-heading"
      >
        <h1 id="login-heading" class="login-heading">Login</h1>

        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            id="username"
            type="text"
            formControlName="username"
            class="form-input"
            [class.error]="showUsernameError()"
            aria-describedby="username-error"
            aria-required="true"
            autocomplete="username"
          />
          @if (showUsernameError()) {
            <span id="username-error" class="error-message" role="alert">
              Username is required
            </span>
          }
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            class="form-input"
            [class.error]="showPasswordError()"
            aria-describedby="password-error"
            aria-required="true"
            autocomplete="current-password"
          />
          @if (showPasswordError()) {
            <span id="password-error" class="error-message" role="alert">
              Password is required
            </span>
          }
        </div>

        @if (errorMessage()) {
          <div class="error-message server-error" role="alert">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="login-button"
          [disabled]="isSubmitting() || loginForm.invalid"
          aria-busy="{{ isSubmitting() }}"
        >
          @if (isSubmitting()) {
            <span class="loading-spinner" aria-hidden="true"></span>
          }
          {{ isSubmitting() ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 1rem;
        background-color: #f5f5f5;
      }

      .login-form {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
      }

      .login-heading {
        margin: 0 0 1.5rem 0;
        text-align: center;
        color: #333;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
      }

      .form-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 1rem;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;

        &:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        &.error {
          border-color: #ef4444;
        }

        &:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }
      }

      .error-message {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.875rem;
        color: #ef4444;
      }

      .server-error {
        margin-bottom: 1rem;
        padding: 0.75rem;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 4px;
      }

      .login-button {
        width: 100%;
        padding: 0.75rem;
        background-color: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        position: relative;

        &:hover:not(:disabled) {
          background-color: #2563eb;
        }

        &:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        &:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
      }

      .loading-spinner {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid transparent;
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 0.5rem;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string>('');

  readonly showUsernameError = computed(() => {
    const control = this.loginForm.controls.username;
    return control.invalid && (control.dirty || control.touched);
  });

  readonly showPasswordError = computed(() => {
    const control = this.loginForm.controls.password;
    return control.invalid && (control.dirty || control.touched);
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formValue = this.loginForm.getRawValue();

    this.authService.authenticate(formValue).subscribe({
      next: (token) => {
        this.tokenService.setToken(token);
        this.router.navigate(['/admin']);
      },
      error: (error) => {
        this.handleError(error);
        this.isSubmitting.set(false);
      },
    });
  }

  private markAllAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private handleError(error: unknown): void {
    if (error instanceof Error) {
      this.errorMessage.set(error.message);
    } else {
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    }
  }
}
