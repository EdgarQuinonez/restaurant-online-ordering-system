// order-detail.component.ts
import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

import type { OrderByIdResponse } from '@core/order/order.interface';
import type { Order, OrderItem } from '@core/checkout/checkout.interface';

@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    ButtonModule,
    BadgeModule,
    ProgressSpinnerModule,
    MessageModule,
    CardModule,
    DividerModule,
  ],
  template: `
    <div class="container mx-auto p-4 max-w-6xl">
      <!-- Header with Back Button -->
      <div class="flex items-center justify-between mb-6">
        <p-button
          label="Volver a Pedidos"
          icon="pi pi-arrow-left"
          severity="secondary"
          [outlined]="true"
          [routerLink]="['/order']"
        />

        <div class="text-right">
          <h1 class="text-2xl font-bold text-gray-900">Detalles del Pedido</h1>
          <p class="text-gray-600">Revisa toda la información de tu pedido</p>
        </div>
      </div>

      <!-- Order Data -->
      @if (orderData(); as data) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Order Information -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Order Header Card -->
            <p-card>
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div class="flex items-center gap-3">
                  <h2 class="text-xl font-bold text-gray-900">
                    Pedido #{{ data.order.order_number }}
                  </h2>
                  <p-badge
                    [value]="getStatusDisplay(data.order.status_display)"
                    [severity]="getStatusSeverity(data.order.status)"
                    class="text-sm"
                  />
                </div>

                <div class="text-sm text-gray-600">
                  Creado el {{ data.order.created_at | date: 'fullDate' }}
                </div>
              </div>

              <!-- Transaction ID -->
              @if (data.order.transaction_id) {
                <p-divider />
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-gray-600 font-medium">Transacción:</span>
                  <span class="font-mono text-gray-900">{{
                    data.order.transaction_id
                  }}</span>
                </div>
              }
            </p-card>

            <!-- Order Items -->
            <p-card header="Artículos del Pedido">
              <div class="space-y-4">
                @for (item of data.order.order_items; track item.id) {
                  <div
                    class="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div class="flex-1">
                      <h4 class="font-semibold text-gray-900">
                        {{ item.item_name }}
                      </h4>
                      <div
                        class="flex items-center gap-4 mt-2 text-sm text-gray-600"
                      >
                        <span>Tamaño: {{ item.size_name }}</span>
                        <span>Cantidad: {{ item.quantity }}</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold text-gray-900">
                        {{ item.price | currency: 'MXN' : 'symbol' : '1.2-2' }}
                      </div>
                      <div class="text-sm text-gray-600 mt-1">
                        Subtotal:
                        {{
                          item.subtotal | currency: 'MXN' : 'symbol' : '1.2-2'
                        }}
                      </div>
                    </div>
                  </div>
                }

                <!-- Total Amount -->
                <p-divider />
                <div class="flex justify-between items-center pt-4">
                  <span class="text-lg font-semibold text-gray-900"
                    >Total:</span
                  >
                  <span class="text-xl font-bold text-primary">
                    {{
                      data.order.total_amount
                        | currency: 'MXN' : 'symbol' : '1.2-2'
                    }}
                  </span>
                </div>
              </div>
            </p-card>

            <!-- Special Instructions -->
            @if (data.order.order_instructions.special_instructions) {
              <p-card header="Instrucciones Especiales">
                <p class="text-gray-700">
                  {{ data.order.order_instructions.special_instructions }}
                </p>
              </p-card>
            }
          </div>

          <!-- Sidebar Information -->
          <div class="space-y-6">
            <!-- Customer Information -->
            <p-card header="Información del Cliente">
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-600"
                    >Nombre</label
                  >
                  <p class="text-gray-900">
                    {{ data.order.customer_info.name }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-600"
                    >Teléfono</label
                  >
                  <p class="text-gray-900">
                    {{ data.order.customer_info.phone }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-600"
                    >Email</label
                  >
                  <p class="text-gray-900">
                    {{ data.order.customer_info.email }}
                  </p>
                </div>
              </div>
            </p-card>

            <!-- Delivery Address -->
            <p-card header="Dirección de Entrega">
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-600"
                    >Dirección</label
                  >
                  <p class="text-gray-900">
                    {{ data.order.address_info.address_line_1 }}
                    @if (data.order.address_info.address_line_2) {
                      <br />{{ data.order.address_info.address_line_2 }}
                    }
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-600"
                      >No. Exterior</label
                    >
                    <p class="text-gray-900">
                      {{ data.order.address_info.no_exterior || 'N/A' }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-600"
                      >No. Interior</label
                    >
                    <p class="text-gray-900">
                      {{ data.order.address_info.no_interior || 'N/A' }}
                    </p>
                  </div>
                </div>

                @if (data.order.address_info.special_instructions) {
                  <div>
                    <label class="block text-sm font-medium text-gray-600"
                      >Instrucciones de Entrega</label
                    >
                    <p class="text-gray-900">
                      {{ data.order.address_info.special_instructions }}
                    </p>
                  </div>
                }
              </div>
            </p-card>

            <!-- Payment Information -->
            @if (data.order.payment_info) {
              <p-card header="Información de Pago">
                <div class="space-y-3">
                  @if (data.order.payment_info.card_holder) {
                    <div>
                      <label class="block text-sm font-medium text-gray-600"
                        >Titular de la Tarjeta</label
                      >
                      <p class="text-gray-900">
                        {{ data.order.payment_info.card_holder }}
                      </p>
                    </div>
                  }

                  @if (data.order.payment_info.expiry_date) {
                    <div>
                      <label class="block text-sm font-medium text-gray-600"
                        >Fecha de Expiración</label
                      >
                      <p class="text-gray-900">
                        {{ data.order.payment_info.expiry_date }}
                      </p>
                    </div>
                  }

                  @if (data.order.payment_info.transaction_id) {
                    <div>
                      <label class="block text-sm font-medium text-gray-600"
                        >ID de Transacción</label
                      >
                      <p class="font-mono text-gray-900">
                        {{ data.order.payment_info.transaction_id }}
                      </p>
                    </div>
                  }
                </div>
              </p-card>
            }

            <!-- Scheduled Time -->
            @if (data.order.scheduled_time) {
              <p-card header="Tiempo Programado">
                <div class="text-center">
                  <p class="text-lg font-semibold text-gray-900">
                    {{ data.order.scheduled_time | date: 'medium' }}
                  </p>
                </div>
              </p-card>
            }

            <!-- Last Updated -->
            <p-card header="Última Actualización">
              <div class="text-center">
                <p class="text-sm text-gray-600">
                  {{ data.order.last_updated | date: 'medium' }}
                </p>
              </div>
            </p-card>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-16">
          <p-progress-spinner
            strokeWidth="8"
            fill="transparent"
            animationDuration=".5s"
            [style]="{ width: '50px', height: '50px' }"
            class="mb-4"
          />
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            Cargando detalles del pedido
          </h3>
          <p class="text-gray-600">
            Estamos obteniendo la información de tu pedido...
          </p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-6">
          <div class="flex items-start gap-4">
            <i
              class="pi pi-exclamation-triangle text-2xl text-red-500 mt-1"
            ></i>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-red-800 mb-2">
                Error al cargar el pedido
              </h3>
              <p class="text-red-700 mb-4">
                {{ error() }}
              </p>
              <div class="flex gap-2">
                <p-button
                  label="Reintentar"
                  icon="pi pi-refresh"
                  severity="danger"
                  (onClick)="reload()"
                />
                <p-button
                  label="Volver a Pedidos"
                  icon="pi pi-arrow-left"
                  severity="secondary"
                  [outlined]="true"
                  [routerLink]="['/order']"
                />
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Convert the resolved data to a signal
  private routeData = toSignal(this.route.data, {
    initialValue: { order: null },
  });

  // Create computed signals for the order data and loading states
  orderData = computed(() => {
    const data = this.routeData();
    return data?.order as OrderByIdResponse | null;
  });

  isLoading = computed(() => {
    const data = this.orderData();
    return !data && !this.error();
  });

  error = computed(() => {
    const data = this.routeData();
    // Handle potential errors from the resolver
    if (data && 'error' in data) {
      return data['error'];
    }
    return null;
  });

  reload(): void {
    this.router.navigateByUrl(this.router.url);
  }

  getStatusDisplay(statusDisplay: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'En Preparación',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      in_progress: 'En Progreso',
      completed: 'Completado',
    };
    return statusMap[statusDisplay.toLowerCase()] || statusDisplay;
  }

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

  // Helper method to calculate item total
  calculateItemTotal(item: OrderItem): number {
    return parseFloat(item.price) * item.quantity;
  }
}
