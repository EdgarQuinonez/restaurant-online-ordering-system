import { Component } from '@angular/core';
import { AdminDashboardComponent } from '@core/admin-dashboard/admin-dashboard';

@Component({
  selector: 'app-admin.page',
  imports: [AdminDashboardComponent],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css',
})
export class AdminPage {}
