// order.component.ts
import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DrawerModule } from 'primeng/drawer';
import { OrderService } from './order.service';
import { Observable } from 'rxjs';
import { LoadingState } from '@utils/switchMapWithLoading';
import { OrdersResponse } from './order.interface';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-order',
  templateUrl: './order.html',
  styleUrl: './order.css',
  imports: [
    ButtonModule,
    BadgeModule,
    DrawerModule,
    ProgressSpinnerModule,
    CurrencyPipe,

    DatePipe,
    RouterLink,
    AsyncPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderComponent {
  private orderService = inject(OrderService);
  orders: Observable<LoadingState<OrdersResponse>> | null = null;

  ngOnInit() {
    this.orders = this.orderService.getMyOrders$();
  }
  /**
   * Get status severity for PrimeNG badge
   */
  getStatusSeverity(
    status: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'assigned':
        return 'info';
      case 'picked':
        return 'secondary';
      case 'delivered':
        return 'success';
      default:
        return 'secondary';
    }
  }

  /**
   * Get status display text in Spanish
   */
  getStatusDisplay(statusDisplay: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendiente',
      assigned: 'Asignado',
      picked: 'Recogido',
      delivered: 'Entregado',
      Pendiente: 'Pendiente',
      Asignado: 'Asignado',
      Recogido: 'Recogido',
      Entregado: 'Entregado',
    };

    return statusMap[statusDisplay?.toLowerCase()] || statusDisplay;
  }
}
