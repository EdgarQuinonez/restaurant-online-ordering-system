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
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { OrderService } from '@core/order/order.service';
import { AllOrdersResponse } from '@core/order/order.interface';
import { Order } from '@core/checkout/checkout.interface';
import { LoadingState } from '@utils/switchMapWithLoading';
import {
  Observable,
  Subject,
  tap,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderStatus } from '@types';

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
    InputTextModule,
    IconFieldModule,
    InputIconModule,
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
  readonly searchQuery = signal<string>('');
  readonly searchSubject = new Subject<string>();

  readonly statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Asignado', value: 'assigned' },
    { label: 'Recogido', value: 'picked' },
    { label: 'Entregado', value: 'delivered' },
  ];

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }

  /**
   * Configurar funcionalidad de búsqueda con debounce
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300), // Esperar 300ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Solo emitir si el valor cambió
        takeUntil(this.destroy$),
      )
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.loadOrdersWithFilters();
      });
  }

  /**
   * Manejar cambios en la entrada de búsqueda
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  /**
   * Limpiar búsqueda y restablecer filtros
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  /**
   * Cargar pedidos con los filtros actuales aplicados
   */
  private loadOrdersWithFilters(pageUrl?: string): void {
    const query = this.searchQuery();

    // Construir parámetros de filtro basados en la consulta de búsqueda
    const filters = this.parseSearchQuery(query);

    this.orders = this.orderService.getAllOrders$(filters, pageUrl).pipe(
      tap((state) => {
        if (state.data) {
          this.currentOrdersData = state.data;
          // Almacenar la URL de la página actual basada en la respuesta
          if (pageUrl) {
            this.currentPageUrl = pageUrl;
          } else {
            // Para carga inicial o carga filtrada, reiniciar a la primera página
            this.currentPageUrl = null;
          }
        }
      }),
    );
  }

  /**
   * Analizar consulta de búsqueda para determinar el tipo de filtro
   */
  private parseSearchQuery(query: string): {
    status?: string;
    date?: string;
    order_number?: string;
    customer_phone?: string;
  } {
    if (!query.trim()) {
      return {};
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Verificar si la consulta coincide con un estado
    const statusMatch = this.statusOptions.find(
      (option) =>
        option.label.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        option.value.toLowerCase() === trimmedQuery.toLowerCase(),
    );
    if (statusMatch) {
      return { status: statusMatch.value };
    }

    // Verificar si la consulta coincide con una fecha (formato AAAA-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(trimmedQuery)) {
      return { date: trimmedQuery };
    }

    // Verificar si la consulta coincide con un número de pedido (comienza con ORD-)
    if (trimmedQuery.startsWith('ord-')) {
      return { order_number: trimmedQuery };
    }

    // Verificar si la consulta coincide con un número de teléfono (dígitos, puede incluir +, -, espacios, paréntesis)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
    if (phoneRegex.test(trimmedQuery.replace(/\s/g, ''))) {
      return { customer_phone: trimmedQuery };
    }

    // Si no coincide ningún patrón específico, buscar en múltiples campos
    // El backend manejará la búsqueda en múltiples campos
    return {
      order_number: trimmedQuery,
      customer_phone: trimmedQuery,
    };
  }

  /**
   * Obtener descripción del filtro actual para mostrar
   */
  getFilterDescription(): string {
    const query = this.searchQuery();
    if (!query.trim()) {
      return 'Mostrando todos los pedidos';
    }

    const filters = this.parseSearchQuery(query);

    if (filters.status) {
      const statusOption = this.statusOptions.find(
        (opt) => opt.value === filters.status,
      );
      return `Filtrado por estado: ${statusOption?.label || filters.status}`;
    }

    if (filters.date) {
      return `Filtrado por fecha: ${filters.date}`;
    }

    if (filters.order_number && !filters.customer_phone) {
      return `Buscando número de pedido: ${filters.order_number}`;
    }

    if (filters.customer_phone && !filters.order_number) {
      return `Buscando teléfono: ${filters.customer_phone}`;
    }

    return `Buscando: ${query}`;
  }

  /**
   * Verificar si actualmente se está filtrando
   */
  isFiltering(): boolean {
    return this.searchQuery().trim().length > 0;
  }

  /**
   * Cargar pedidos - ya sea carga inicial o página específica
   */
  private loadOrders(pageUrl?: string): void {
    this.loadOrdersWithFilters(pageUrl);
  }

  /**
   * Obtener severidad del estado para la insignia de PrimeNG
   */
  getStatusSeverity(
    status: OrderStatus,
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
   * Obtener texto de visualización del estado
   */
  getStatusDisplay(status: OrderStatus): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendiente',
      assigned: 'Asignado',
      picked: 'Recogido',
      delivered: 'Entregado',
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
            // Estado actualizado exitosamente - refrescar página actual para obtener datos actualizados
            this.refreshOrders();
            console.log(
              `Estado del pedido ${order.id} actualizado a ${newStatus}`,
            );
          }
        },
        error: (error) => {
          this.updatingOrderId.set(null);
          console.error('Error al actualizar el estado del pedido:', error);
          // Refrescar para obtener los datos correctos del servidor
          this.refreshOrders();
        },
      });
  }

  /**
   * Cargar página siguiente o anterior usando las URLs orderState.data.next/previous
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
      this.loadOrdersWithFilters(targetUrl);
    }
  }

  /**
   * Calcular página actual basada en las URLs next/previous y el conteo
   */
  getCurrentPage(): number {
    if (!this.currentOrdersData || !this.currentOrdersData.count) {
      return 1;
    }

    // Si tenemos una URL next, intentar extraer el número de página
    if (this.currentOrdersData.next) {
      const pageMatch = this.currentOrdersData.next.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        // Número de página siguiente menos 1 da la página actual
        return parseInt(pageMatch[1], 10) - 1;
      }
    }

    // Si tenemos una URL previous, intentar extraer el número de página
    if (this.currentOrdersData.previous) {
      const pageMatch = this.currentOrdersData.previous.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        // Número de página anterior más 1 da la página actual
        return parseInt(pageMatch[1], 10) + 1;
      }
    }

    // Si no hay URL next pero tenemos datos, estamos en la última página
    if (
      !this.currentOrdersData.next &&
      this.currentOrdersData.results.length > 0
    ) {
      const pageSize = 25; // Tamaño de página predeterminado del servicio
      const totalPages = Math.ceil(this.currentOrdersData.count / pageSize);
      return totalPages;
    }

    // Por defecto, página 1
    return 1;
  }

  /**
   * Obtener número total de páginas
   */
  getTotalPages(): number {
    if (!this.currentOrdersData || !this.currentOrdersData.count) {
      return 1;
    }

    const pageSize = 25; // Tamaño de página predeterminado del servicio
    return Math.ceil(this.currentOrdersData.count / pageSize);
  }

  /**
   * Verificar si se puede cargar la página siguiente
   */
  canLoadNext(): boolean {
    return !!this.currentOrdersData?.next;
  }

  /**
   * Verificar si se puede cargar la página anterior
   */
  canLoadPrevious(): boolean {
    return !!this.currentOrdersData?.previous;
  }

  /**
   * Refrescar pedidos (recargar página actual)
   */
  refreshOrders(): void {
    this.loadOrdersWithFilters(this.currentPageUrl || undefined);
  }

  /**
   * Manejar reintento cuando hay un error
   */
  onRetry(): void {
    this.loadOrdersWithFilters(this.currentPageUrl || undefined);
  }

  /**
   * Obtener información de página para mostrar
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

  /**
   * Formatear moneda para mostrar
   */
  formatCurrency(amount: string): string {
    return parseFloat(amount).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  /**
   * Formatear fecha para mostrar
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
   * Obtener nombre del cliente desde el pedido
   */
  getCustomerName(order: Order): string {
    return order.customer_info?.name || 'N/A';
  }

  /**
   * Obtener teléfono del cliente desde el pedido
   */
  getCustomerPhone(order: Order): string {
    return order.customer_info?.phone || 'N/A';
  }

  /**
   * Obtener email del cliente desde el pedido
   */
  getCustomerEmail(order: Order): string {
    return order.customer_info?.email || 'N/A';
  }

  /**
   * Obtener información de dirección desde el pedido
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
   * Obtener instrucciones especiales desde el pedido
   */
  getSpecialInstructions(order: Order): string {
    return (
      order.order_instructions?.special_instructions ||
      order.address_info?.special_instructions ||
      'Ninguna'
    );
  }
}
