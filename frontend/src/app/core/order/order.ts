// order.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DrawerModule } from 'primeng/drawer';
import { OrderService } from '../services/order.service';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: Date;
  totalAmount: number;
  items: OrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

@Component({
  selector: 'app-order',
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Mis Pedidos</h1>
          <p class="text-gray-600">
            Revisa el estado y detalles de tus pedidos
          </p>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
            ></div>
          </div>
        }

        <!-- Empty State -->
        @else if (orders().length === 0 && !isLoading()) {
          <div class="text-center py-12">
            <i class="pi pi-inbox text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">
              No hay pedidos
            </h3>
            <p class="text-gray-500 mb-6">Aún no has realizado ningún pedido</p>
            <button
              type="button"
              routerLink="/products"
              pButton
              class="p-button-primary"
            >
              <i class="pi pi-shopping-bag mr-2"></i>
              Comenzar a Comprar
            </button>
          </div>
        }

        <!-- Orders List -->
        @else {
          <div class="space-y-6">
            @for (order of orders(); track order.id) {
              <div
                class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <!-- Order Header -->
                <div class="p-6 border-b border-gray-200">
                  <div
                    class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900">
                        Pedido #{{ order.orderNumber }}
                      </h3>
                      <p class="text-gray-600 text-sm mt-1">
                        Realizado el {{ order.orderDate | date: 'mediumDate' }}
                      </p>
                    </div>
                    <div class="flex items-center gap-4">
                      <span
                        class="px-3 py-1 rounded-full text-sm font-medium"
                        [class]="getStatusClass(order.status)"
                      >
                        {{ getStatusText(order.status) }}
                      </span>
                      <span class="text-lg font-bold text-gray-900">
                        {{ order.totalAmount | currency: 'MXN' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Order Items -->
                <div class="p-6">
                  <div class="space-y-4">
                    @for (item of order.items; track item.id) {
                      <div class="flex items-center gap-4">
                        <img
                          [src]="item.imageUrl"
                          [alt]="item.name"
                          class="w-16 h-16 object-cover rounded-lg"
                        />
                        <div class="flex-1 min-w-0">
                          <h4
                            class="text-sm font-medium text-gray-900 truncate"
                          >
                            {{ item.name }}
                          </h4>
                          <p class="text-gray-600 text-sm">
                            Cantidad: {{ item.quantity }}
                          </p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm font-medium text-gray-900">
                            {{ item.price * item.quantity | currency: 'MXN' }}
                          </p>
                          <p class="text-gray-600 text-sm">
                            {{ item.price | currency: 'MXN' }} c/u
                          </p>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Order Footer -->
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div
                    class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div class="text-sm text-gray-600">
                      <p class="font-medium">Dirección de envío:</p>
                      <p>
                        {{ order.shippingAddress.street }},
                        {{ order.shippingAddress.city }}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        (click)="viewOrderDetails(order.id)"
                        pButton
                        class="p-button-outlined p-button-secondary"
                      >
                        <i class="pi pi-eye mr-2"></i>
                        Ver Detalles
                      </button>
                      @if (order.status === 'delivered') {
                        <button type="button" pButton class="p-button-outlined">
                          <i class="pi pi-star mr-2"></i>
                          Calificar
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Load More Button -->
        @if (hasMoreOrders() && orders().length > 0) {
          <div class="flex justify-center mt-8">
            <button
              type="button"
              (click)="loadMoreOrders()"
              [disabled]="isLoadingMore()"
              pButton
              class="p-button-outlined"
            >
              @if (isLoadingMore()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
              }
              Cargar Más Pedidos
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: ``,
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
  private orderService = inject(OrderService);

  // State signals
  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly hasMoreOrders = signal(true);

  // Computed values
  readonly totalOrdersCount = computed(() => this.orders().length);

  ngOnInit(): void {
    this.loadOrders();
  }

  private async loadOrders(): Promise<void> {
    try {
      this.isLoading.set(true);
      const newOrders = await this.orderService.getUserOrders();
      this.orders.set(newOrders);
      this.hasMoreOrders.set(newOrders.length === 10); // Assuming pagination
    } catch (error) {
      console.error('Error loading orders:', error);
      // Handle error state appropriately
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMoreOrders(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMoreOrders()) return;

    try {
      this.isLoadingMore.set(true);
      const moreOrders = await this.orderService.getUserOrders(
        this.orders().length,
      );
      this.orders.update((current) => [...current, ...moreOrders]);
      this.hasMoreOrders.set(moreOrders.length === 10); // Assuming pagination
    } catch (error) {
      console.error('Error loading more orders:', error);
      // Handle error state appropriately
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  viewOrderDetails(orderId: string): void {
    // Navigate to order details page or show modal
    console.log('View order details:', orderId);
  }

  getStatusClass(status: Order['status']): string {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusClasses[status];
  }

  getStatusText(status: Order['status']): string {
    const statusText = {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return statusText[status];
  }
}
