import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin.page.html',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
})
export class AdminPage {
  private authService = inject(AuthService);

  /**
   * Logout user by clearing token and redirecting to login
   */
  logout(): void {
    this.authService.logout();
    // Optional: Show logout success message
    console.log('Sesión cerrada exitosamente');
  }
}
