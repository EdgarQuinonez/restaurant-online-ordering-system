import {
  Component,
  OnInit,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';

import { OrderService } from '@core/order/order.service';
import { Order, AllOrdersResponse } from '@core/order/order.interface';
import { LoadingState } from '@utils/switchMapWithLoading';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadingState = signal<LoadingState<AllOrdersResponse>>({
    loading: true,
  });
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

  loadOrders(): void {
    this.loadingState.set({ loading: true });

    this.orderService
      .getAllOrders$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.loadingState.set(state);
        },
        error: (error) => {
          this.loadingState.set({
            loading: false,
            error: error.message || 'Failed to load orders',
          });
        },
      });
  }

  onStatusChange(order: Order, newStatus: string): void {
    if (!order.id) return;

    this.updatingOrderId.set(order.id);

    this.orderService
      .updateOrderStatus$(order.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.updatingOrderId.set(null);
          if (state.data?.success) {
            // Status updated successfully - we could show a toast notification here
            console.log(`Order ${order.id} status updated to ${newStatus}`);
          }
        },
        error: (error) => {
          this.updatingOrderId.set(null);
          // Revert the status change in the UI if the update failed
          order.status = order.status; // This will revert to original value
          console.error('Failed to update order status:', error);
          // We could show an error toast notification here
        },
      });
  }

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
}
