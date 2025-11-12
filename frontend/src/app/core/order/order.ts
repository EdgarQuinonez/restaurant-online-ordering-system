// order.component.ts
import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DrawerModule } from 'primeng/drawer';
import { OrderService } from './order.service';

@Component({
  selector: 'app-order',
  templateUrl: './order.html',
  styleUrl: './order.css',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    ButtonModule,
    BadgeModule,
    DrawerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderComponent {
  // private orderService = inject(OrderService);
  //
  // // State signals
  // readonly orders = signal<Order[]>([]);
  // readonly isLoading = signal(true);
  // readonly isLoadingMore = signal(false);
  // readonly hasMoreOrders = signal(true);
  //
  // // Computed values
  // readonly totalOrdersCount = computed(() => this.orders().length);
  //
  // ngOnInit(): void {
  //   this.loadOrders();
  // }
  //
  // private async loadOrders(): Promise<void> {
  //   try {
  //     this.isLoading.set(true);
  //     const newOrders = await this.orderService.getUserOrders();
  //     this.orders.set(newOrders);
  //     this.hasMoreOrders.set(newOrders.length === 10); // Assuming pagination
  //   } catch (error) {
  //     console.error('Error loading orders:', error);
  //     // Handle error state appropriately
  //   } finally {
  //     this.isLoading.set(false);
  //   }
  // }
  //
  // async loadMoreOrders(): Promise<void> {
  //   if (this.isLoadingMore() || !this.hasMoreOrders()) return;
  //
  //   try {
  //     this.isLoadingMore.set(true);
  //     const moreOrders = await this.orderService.getUserOrders(
  //       this.orders().length,
  //     );
  //     this.orders.update((current) => [...current, ...moreOrders]);
  //     this.hasMoreOrders.set(moreOrders.length === 10); // Assuming pagination
  //   } catch (error) {
  //     console.error('Error loading more orders:', error);
  //     // Handle error state appropriately
  //   } finally {
  //     this.isLoadingMore.set(false);
  //   }
  // }
  //
  // viewOrderDetails(orderId: string): void {
  //   // Navigate to order details page or show modal
  //   console.log('View order details:', orderId);
  // }
  //
  // getStatusClass(status: Order['status']): string {
  //   const statusClasses = {
  //     pending: 'bg-yellow-100 text-yellow-800',
  //     processing: 'bg-blue-100 text-blue-800',
  //     shipped: 'bg-purple-100 text-purple-800',
  //     delivered: 'bg-green-100 text-green-800',
  //     cancelled: 'bg-red-100 text-red-800',
  //   };
  //   return statusClasses[status];
  // }
  //
  // getStatusText(status: Order['status']): string {
  //   const statusText = {
  //     pending: 'Pendiente',
  //     processing: 'Procesando',
  //     shipped: 'Enviado',
  //     delivered: 'Entregado',
  //     cancelled: 'Cancelado',
  //   };
  //   return statusText[status];
  // }
}
