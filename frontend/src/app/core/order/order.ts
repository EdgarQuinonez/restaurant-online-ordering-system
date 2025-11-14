// order.component.ts
import {
  Component,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DrawerModule } from 'primeng/drawer';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OrderService } from './order.service';
import { LoadingState } from '@utils/switchMapWithLoading';
import { OrdersResponse } from './order.interface';

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
export class OrderComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private destroy$ = new Subject<void>();

  orders: Observable<LoadingState<OrdersResponse>> | null = null;
  private currentOrdersData: OrdersResponse | null = null;
  private currentPageUrl: string | null = null;

  ngOnInit() {
    this.loadOrders();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load orders - either initial load or specific page
   */
  private loadOrders(pageUrl?: string): void {
    this.orders = this.orderService.getMyOrders$(pageUrl);

    // Subscribe to store the current data for pagination calculations
    // this.orders.pipe(takeUntil(this.destroy$)).subscribe({
    //   next: (state) => {
    //     if (state.data) {
    //       this.currentOrdersData = state.data;
    //       // Store the current page URL based on the response
    //       if (pageUrl) {
    //         this.currentPageUrl = pageUrl;
    //       } else {
    //         // For initial load, we're on the first page
    //         this.currentPageUrl = null;
    //       }
    //     }
    //   },
    // });
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

  /**
   * Load next or previous page using orderState.data.next/previous URLs
   */
  loadPage(direction: 'next' | 'previous'): void {
    if (!this.currentOrdersData) {
      return;
    }

    const targetUrl =
      direction === 'next'
        ? this.currentOrdersData.next
        : this.currentOrdersData.previous;

    if (targetUrl) {
      this.loadOrders(targetUrl);
    }
  }

  /**
   * Calculate current page based on next/previous URLs and count
   */
  getCurrentPage(): number {
    if (!this.currentOrdersData || !this.currentOrdersData.count) {
      return 1;
    }

    // If we have a next URL, try to extract page number from it
    if (this.currentOrdersData.next) {
      const pageMatch = this.currentOrdersData.next.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        // Next page number minus 1 gives current page
        return parseInt(pageMatch[1], 10) - 1;
      }
    }

    // If we have a previous URL, try to extract page number from it
    if (this.currentOrdersData.previous) {
      const pageMatch = this.currentOrdersData.previous.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        // Previous page number plus 1 gives current page
        return parseInt(pageMatch[1], 10) + 1;
      }
    }

    // If no next URL but we have data, we're on the last page
    if (
      !this.currentOrdersData.next &&
      this.currentOrdersData.results.length > 0
    ) {
      const pageSize = 25; // Default page size from service
      const totalPages = Math.ceil(this.currentOrdersData.count / pageSize);
      return totalPages;
    }

    // Default to page 1
    return 1;
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    if (!this.currentOrdersData || !this.currentOrdersData.count) {
      return 1;
    }

    const pageSize = 25; // Default page size from service
    return Math.ceil(this.currentOrdersData.count / pageSize);
  }

  /**
   * Check if we can load next page
   */
  canLoadNext(): boolean {
    return !!this.currentOrdersData?.next;
  }

  /**
   * Check if we can load previous page
   */
  canLoadPrevious(): boolean {
    return !!this.currentOrdersData?.previous;
  }

  /**
   * Refresh orders (reload current page)
   */
  refreshOrders(): void {
    this.loadOrders(this.currentPageUrl || undefined);
  }

  /**
   * Handle retry when there's an error
   */
  onRetry(): void {
    this.loadOrders(this.currentPageUrl || undefined);
  }

  /**
   * Get page info for display
   */
  getPageInfo(): string {
    const currentPage = this.getCurrentPage();
    const totalPages = this.getTotalPages();
    const totalOrders = this.currentOrdersData?.count || 0;

    if (totalOrders === 0) {
      return 'Sin pedidos';
    }

    return `Página ${currentPage} de ${totalPages} (${totalOrders} pedidos en total)`;
  }
}
