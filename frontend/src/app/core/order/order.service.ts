import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  getMyOrders$(pageUrl?: string): Observable<LoadingState<OrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        const url = pageUrl || `${this.ORDERS_ENDPOINT}my-orders/`;
        return this.http.get<OrdersResponse>(url);
      }),
    );
  }

  /**
   * Get a specific order by ID
   */
  getOrderById$(orderId: number): Observable<OrderByIdResponse> {
    return this.http.get<OrderByIdResponse>(
      `${this.ORDERS_ENDPOINT}${orderId}/`,
    );
  }

  /**
   * Get all orders (admin functionality - may require authentication)
   */
  getAllOrders$(
    params?: {
      status?: string;
      date?: string;
      order_number?: string;
      customer_phone?: string;
      page?: number;
      page_size?: number;
    },
    pageUrl?: string,
  ): Observable<LoadingState<AllOrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        if (pageUrl) {
          // Use the provided page URL for pagination
          return this.http.get<AllOrdersResponse>(pageUrl);
        } else {
          // Build params for initial request
          let httpParams = new HttpParams();
          if (params?.status)
            httpParams = httpParams.set('status', params.status);
          if (params?.date) httpParams = httpParams.set('date', params.date);
          if (params?.order_number)
            httpParams = httpParams.set('order_number', params.order_number);
          if (params?.customer_phone)
            httpParams = httpParams.set(
              'customer_phone',
              params.customer_phone,
            );
          if (params?.page)
            httpParams = httpParams.set('page', params.page.toString());
          if (params?.page_size)
            httpParams = httpParams.set(
              'page_size',
              params.page_size.toString(),
            );

          return this.http.get<AllOrdersResponse>(this.ORDERS_ENDPOINT, {
            params: httpParams,
          });
        }
      }),
    );
  }

  /**
   * Search orders by various criteria (admin functionality)
   */
  searchOrders$(
    query: string,
    pageUrl?: string,
  ): Observable<LoadingState<OrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        if (pageUrl) {
          return this.http.get<OrdersResponse>(pageUrl);
        } else {
          return this.http.get<OrdersResponse>(
            `${this.ORDERS_ENDPOINT}search/`,
            {
              params: { q: query },
            },
          );
        }
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
   * Load a specific page by URL (for pagination)
   */
  loadPage$(pageUrl: string): Observable<LoadingState<OrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.get<OrdersResponse>(pageUrl);
      }),
    );
  }

  /**
   * Get orders with pagination support
   */
  getOrdersWithPagination$(
    endpoint: 'my-orders' | 'all' | 'search',
    options?: {
      query?: string;
      params?: {
        status?: string;
        date?: string;
        order_number?: string;
        customer_phone?: string;
        page?: number;
        page_size?: number;
      };
      pageUrl?: string;
    },
  ): Observable<LoadingState<OrdersResponse | AllOrdersResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        const { pageUrl, query, params } = options || {};

        if (pageUrl) {
          return this.http.get<OrdersResponse | AllOrdersResponse>(pageUrl);
        }

        switch (endpoint) {
          case 'my-orders':
            return this.http.get<OrdersResponse>(
              `${this.ORDERS_ENDPOINT}my-orders/`,
            );

          case 'search':
            if (!query) {
              throw new Error('Query parameter is required for search');
            }
            return this.http.get<OrdersResponse>(
              `${this.ORDERS_ENDPOINT}search/`,
              {
                params: { q: query },
              },
            );

          case 'all':
          default:
            let httpParams = new HttpParams();
            if (params?.status)
              httpParams = httpParams.set('status', params.status);
            if (params?.date) httpParams = httpParams.set('date', params.date);
            if (params?.order_number)
              httpParams = httpParams.set('order_number', params.order_number);
            if (params?.customer_phone)
              httpParams = httpParams.set(
                'customer_phone',
                params.customer_phone,
              );
            if (params?.page)
              httpParams = httpParams.set('page', params.page.toString());
            if (params?.page_size)
              httpParams = httpParams.set(
                'page_size',
                params.page_size.toString(),
              );

            return this.http.get<AllOrdersResponse>(this.ORDERS_ENDPOINT, {
              params: httpParams,
            });
        }
      }),
    );
  }

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
                observer.next(response.count > 0);
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
  getMyOrders(pageUrl?: string): Observable<OrdersResponse> {
    const url = pageUrl || `${this.ORDERS_ENDPOINT}my-orders/`;
    return this.http.get<OrdersResponse>(url);
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
  getAllOrders(
    params?: {
      status?: string;
      date?: string;
      order_number?: string;
      customer_phone?: string;
      page?: number;
      page_size?: number;
    },
    pageUrl?: string,
  ): Observable<OrdersResponse> {
    if (pageUrl) {
      return this.http.get<OrdersResponse>(pageUrl);
    } else {
      let httpParams = new HttpParams();
      if (params?.status) httpParams = httpParams.set('status', params.status);
      if (params?.date) httpParams = httpParams.set('date', params.date);
      if (params?.order_number)
        httpParams = httpParams.set('order_number', params.order_number);
      if (params?.customer_phone)
        httpParams = httpParams.set('customer_phone', params.customer_phone);
      if (params?.page)
        httpParams = httpParams.set('page', params.page.toString());
      if (params?.page_size)
        httpParams = httpParams.set('page_size', params.page_size.toString());

      return this.http.get<OrdersResponse>(this.ORDERS_ENDPOINT, {
        params: httpParams,
      });
    }
  }

  /**
   * Search orders by various criteria - legacy version
   */
  searchOrders(query: string, pageUrl?: string): Observable<OrdersResponse> {
    if (pageUrl) {
      return this.http.get<OrdersResponse>(pageUrl);
    } else {
      return this.http.get<OrdersResponse>(`${this.ORDERS_ENDPOINT}search/`, {
        params: { q: query },
      });
    }
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
          observer.next(response.count > 0);
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
