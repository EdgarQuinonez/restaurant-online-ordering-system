import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { OrderService } from '@core/order/order.service';
import { AllOrdersResponse } from '@core/order/order.interface';
import { Order } from '@core/checkout/checkout.interface';
import { LoadingState } from '@utils/switchMapWithLoading';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-kitchen',
  templateUrl: './admin-kitchen.html',
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    BadgeModule,
    ProgressSpinnerModule,
    DividerModule,
    ScrollPanelModule,
    DatePipe,
    CurrencyPipe,
    ToastModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminKitchen implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly messageService = inject(MessageService);
  private destroy$ = new Subject<void>();

  // Observable for loading pending orders
  pendingOrders: Observable<LoadingState<AllOrdersResponse>> | null = null;

  // Signal for the currently selected active order
  readonly activeOrder = signal<Order | null>(null);

  // Signal to track loading state
  readonly loading = signal<boolean>(true);

  // Signal to track which orders are being updated
  readonly updatingOrderId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadPendingOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all pending orders for the kitchen
   */
  private loadPendingOrders(): void {
    this.loading.set(true);

    this.pendingOrders = this.orderService
      .getAllOrders$({
        status: 'pending',
        page_size: 25, // Load more orders for kitchen view
      })
      .pipe(
        tap((state) => {
          this.loading.set(state.loading);

          if (
            state.data &&
            state.data.results.length > 0 &&
            !this.activeOrder()
          ) {
            // Automatically select the first order if none is selected
            this.setActiveOrder(state.data.results[0]);
          }
        }),
        takeUntil(this.destroy$),
      );
  }

  /**
   * Mark order as ready/assigned (kitchen completion)
   */
  markOrderAsReady(order: Order): void {
    if (!order.id) return;

    this.updatingOrderId.set(order.id);

    this.orderService
      .updateOrderStatus$(order.id, 'assigned')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.updatingOrderId.set(null);
          if (!state.loading && state.data?.success) {
            // Status updated successfully - refresh orders to get updated data
            this.refreshOrders();

            // Show success message
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Pedido #${order.order_number} marcado como listo para entrega`,
              life: 3000,
            });

            console.log(`Estado del pedido ${order.id} actualizado a assigned`);
          } else if (!state.loading && !state.data) {
            // Handle case where backend returns success: false
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'No se pudo actualizar el estado del pedido',
              life: 3000,
            });
          }
        },
        error: (error) => {
          this.updatingOrderId.set(null);
          console.error('Error al actualizar el estado del pedido:', error);

          // Show error message
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al marcar el pedido como listo',
            life: 3000,
          });

          // Refresh to get the correct data from server
          this.refreshOrders();
        },
      });
  }

  /**
   * Check if an order is currently being updated
   */
  isOrderUpdating(order: Order): boolean {
    return this.updatingOrderId() === order.id;
  }

  /**
   * Set the active order to display in the main pane
   */
  setActiveOrder(order: Order): void {
    this.activeOrder.set(order);
  }

  /**
   * Check if an order is currently active
   */
  isActiveOrder(order: Order): boolean {
    const active = this.activeOrder();
    return active ? active.id === order.id : false;
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
  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendiente',
      assigned: 'Listo para Entrega',
      picked: 'Recogido',
      delivered: 'Entregado',
    };

    return statusMap[status?.toLowerCase()] || status;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha Inválida';
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: string): string {
    return parseFloat(amount).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  /**
   * Get total items count for an order
   */
  getTotalItems(order: Order): number {
    return (
      order.order_items?.reduce((total, item) => total + item.quantity, 0) || 0
    );
  }

  /**
   * Get preparation time estimate based on order items
   */
  getPreparationTime(order: Order): string {
    const itemCount = this.getTotalItems(order);
    // Simple estimation: 5 minutes per item with minimum 10 minutes
    const minutes = Math.max(10, itemCount * 5);
    return `${minutes} min`;
  }

  /**
   * Refresh pending orders list
   */
  refreshOrders(): void {
    this.loadPendingOrders();
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
      'Ninguna'
    );
  }

  /**
   * Check if order has special instructions
   */
  hasSpecialInstructions(order: Order): boolean {
    const instructions = this.getSpecialInstructions(order);
    return instructions !== 'Ninguna' && instructions.trim().length > 0;
  }

  /**
   * Get item display name with size
   */
  getItemDisplay(item: any): string {
    return `${item.item_name} (${item.size_name})`;
  }

  /**
   * Get item subtotal
   */
  getItemSubtotal(item: any): string {
    return this.formatCurrency(item.subtotal);
  }
}
