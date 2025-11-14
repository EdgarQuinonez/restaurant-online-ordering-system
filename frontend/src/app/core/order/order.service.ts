import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '@environment';
import {
  AllOrdersResponse,
  OrderByIdResponse,
  OrdersResponse,
  UpdateOrderStatusResponse,
} from './order.interface';
import { DeviceIdService } from '@services/device-id.service';
import {
  switchMapWithLoading,
  LoadingState,
} from '@utils/switchMapWithLoading';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private deviceIdService = inject(DeviceIdService);

  private readonly ORDERS_ENDPOINT = `${environment.apiUrl}/orders/`;

  /**
   * Get all orders for the current device (anonymous user)
   */
  getMyOrders$(): Observable<LoadingState<OrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.get<OrdersResponse>(
          `${this.ORDERS_ENDPOINT}my-orders/`,
        );
      }),
    );
  }

  /**
   * Get a specific order by ID
   */
  getOrderById$(orderId: number): Observable<OrderByIdResponse> {
    return this.http.get<OrderByIdResponse>(
      `${this.ORDERS_ENDPOINT}${orderId}`,
    );
  }

  /**
   * Get all orders (admin functionality - may require authentication)
   */
  getAllOrders$(params?: {
    status?: string;
    date?: string;
    order_number?: string;
    customer_phone?: string;
  }): Observable<LoadingState<AllOrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.get<AllOrdersResponse>(this.ORDERS_ENDPOINT, {
          params,
        });
      }),
    );
  }

  /**
   * Search orders by various criteria (admin functionality)
   */
  searchOrders$(query: string): Observable<LoadingState<OrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.get<OrdersResponse>(`${this.ORDERS_ENDPOINT}search/`, {
          params: { q: query },
        });
      }),
    );
  }

  /**
   * Update order status (admin functionality)
   */
  updateOrderStatus$(
    orderId: number,
    status: string,
  ): Observable<LoadingState<UpdateOrderStatusResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.put<UpdateOrderStatusResponse>(
          `${this.ORDERS_ENDPOINT}${orderId}/status/`,
          { status },
        );
      }),
    );
  }

  /**
   * Delete an order (admin functionality or own orders)
   */
  deleteOrder$(
    orderId: number,
  ): Observable<LoadingState<{ success: boolean; detail: string }>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.delete<{ success: boolean; detail: string }>(
          `${this.ORDERS_ENDPOINT}${orderId}/`,
        );
      }),
    );
  }

  /**
   * Get order history with device ID tracking
   * This combines device ID check and order retrieval
   */
  // getOrderHistory$(): Observable<LoadingState<OrdersResponse>> {
  //   return of(null).pipe(
  //     switchMapWithLoading(() => {
  //       if (!this.deviceIdService.hasDeviceId()) {
  //         // Return empty orders if no device ID exists
  //         return of({
  //           success: true,
  //           count: 0,
  //           orders: [],
  //           detail: 'No device ID found. Please place an order first.',
  //         });
  //       }
  //       return this.http.get<OrdersResponse>(
  //         `${this.ORDERS_ENDPOINT}my-orders/`,
  //       );
  //     }),
  //   );
  // }
  //
  /**
   * Check if user has any orders
   */
  hasOrders$(): Observable<LoadingState<boolean>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        if (!this.deviceIdService.hasDeviceId()) {
          return of(false);
        }

        return new Observable<boolean>((observer) => {
          this.http
            .get<OrdersResponse>(`${this.ORDERS_ENDPOINT}my-orders/`)
            .subscribe({
              next: (response) => {
                observer.next(response.success && response.count > 0);
                observer.complete();
              },
              error: () => {
                observer.next(false);
                observer.complete();
              },
            });
        });
      }),
    );
  }

  // Legacy methods without loading state (for backward compatibility)
  /**
   * Get all orders for the current device (anonymous user) - legacy version
   */
  getMyOrders(): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>(`${this.ORDERS_ENDPOINT}my-orders/`);
  }

  /**
   * Get a specific order by ID - legacy version
   */
  getOrderById(orderId: number): Observable<OrderByIdResponse> {
    return this.http.get<OrderByIdResponse>(
      `${this.ORDERS_ENDPOINT}${orderId}/`,
    );
  }

  /**
   * Get all orders (admin functionality) - legacy version
   */
  getAllOrders(params?: {
    status?: string;
    date?: string;
    order_number?: string;
    customer_phone?: string;
  }): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>(this.ORDERS_ENDPOINT, { params });
  }

  /**
   * Check if user has any orders - legacy version
   */
  hasOrders(): Observable<boolean> {
    return new Observable((observer) => {
      if (!this.deviceIdService.hasDeviceId()) {
        observer.next(false);
        observer.complete();
        return;
      }

      this.getMyOrders().subscribe({
        next: (response) => {
          observer.next(response.success && response.count > 0);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        },
      });
    });
  }
}
