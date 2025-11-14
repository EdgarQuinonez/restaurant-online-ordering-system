import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { OrderService } from '@core/order/order.service';
import { AllOrdersResponse } from '@core/order/order.interface';
import { Order } from '@core/checkout/checkout.interface';
import { LoadingState } from '@utils/switchMapWithLoading';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    SkeletonModule,
    ButtonModule,
    BadgeModule,
    ProgressSpinnerModule,
    AsyncPipe,
    DatePipe,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private destroy$ = new Subject<void>();

  orders: Observable<LoadingState<AllOrdersResponse>> | null = null;
  private currentOrdersData: AllOrdersResponse | null = null;
  private currentPageUrl: string | null = null;

  readonly updatingOrderId = signal<number | null>(null);

  readonly statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Ready', value: 'ready' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load orders - either initial load or specific page
   */
  private loadOrders(pageUrl?: string): void {
    this.orders = this.orderService.getAllOrders$({}, pageUrl).pipe(
      tap((state) => {
        if (state.data) {
          this.currentOrdersData = state.data;
          // Store the current page URL based on the response
          if (pageUrl) {
            this.currentPageUrl = pageUrl;
          } else {
            // For initial load, we're on the first page
            this.currentPageUrl = null;
          }
        }
      }),
    );
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
      case 'confirmed':
        return 'info';
      case 'processing':
        return 'secondary';
      case 'ready':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /**
   * Get status display text
   */
  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      ready: 'Ready',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    return statusMap[status?.toLowerCase()] || status;
  }

  onStatusChange(order: Order, newStatus: string): void {
    if (!order.id) return;

    this.updatingOrderId.set(order.id);

    this.orderService
      .updateOrderStatus$(order.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.updatingOrderId.set(null);
          if (state.data?.success) {
            // Status updated successfully - refresh current page to get updated data
            this.refreshOrders();
            console.log(`Order ${order.id} status updated to ${newStatus}`);
          }
        },
        error: (error) => {
          this.updatingOrderId.set(null);
          // Revert the status change in the UI if the update failed
          console.error('Failed to update order status:', error);
          // Refresh to get the correct data from server
          this.refreshOrders();
        },
      });
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
      return 'No orders';
    }

    return `Page ${currentPage} of ${totalPages} (${totalOrders} total orders)`;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: string): string {
    return parseFloat(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Get customer name from order
   */
  getCustomerName(order: Order): string {
    return order.customer_info?.name || 'N/A';
  }

  /**
   * Get customer phone from order
   */
  getCustomerPhone(order: Order): string {
    return order.customer_info?.phone || 'N/A';
  }

  /**
   * Get customer email from order
   */
  getCustomerEmail(order: Order): string {
    return order.customer_info?.email || 'N/A';
  }

  /**
   * Get address info from order
   */
  getAddressInfo(order: Order): string {
    const address = order.address_info;
    if (!address) return 'N/A';

    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.no_exterior,
      address.no_interior,
    ].filter((part) => part && part.trim() !== '');

    return parts.join(', ') || 'N/A';
  }

  /**
   * Get special instructions from order
   */
  getSpecialInstructions(order: Order): string {
    return (
      order.order_instructions?.special_instructions ||
      order.address_info?.special_instructions ||
      'None'
    );
  }
}
