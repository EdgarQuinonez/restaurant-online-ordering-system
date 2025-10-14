import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { map, catchError, startWith, switchMap, scan } from 'rxjs/operators';
import {
  switchMapWithLoading,
  LoadingState,
} from '@utils/switchMapWithLoading';
import { OrderData } from './checkout.interface';
import { OrderResponse } from './checkout.interface';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);

  // Simulation control - manually change this to test different responses
  private simulationMode: 'success' | '404' | '500' = 'success';

  placeOrder$(orderData: OrderData): Observable<LoadingState<OrderResponse>> {
    return of(orderData).pipe(
      switchMapWithLoading((data) => this.simulateOrderRequest(data)),
    );
  }

  private simulateOrderRequest(
    orderData: OrderData,
  ): Observable<OrderResponse> {
    // Simulate API delay
    const baseDelay = 2000;

    switch (this.simulationMode) {
      case '404':
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              statusText: 'Not Found',
              error: { message: 'Order endpoint not found' },
            }),
        ).pipe(delay(baseDelay));

      case '500':
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              statusText: 'Internal Server Error',
              error: { message: 'Server error processing order' },
            }),
        ).pipe(delay(baseDelay));

      case 'success':
      default:
        const successResponse: OrderResponse = {
          orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'success',
          message: 'La orden ha sido recibida.',
          transactionId: `TXN-${Date.now()}`,
        };
        return of(successResponse).pipe(delay(baseDelay));
    }
  }

  // Helper methods to change simulation mode for testing
  setSimulationMode(mode: 'success' | '404' | '500'): void {
    this.simulationMode = mode;
  }

  getSimulationMode(): string {
    return this.simulationMode;
  }

  // Real implementation (commented out for now)
  private realPlaceOrder(orderData: OrderData): Observable<OrderResponse> {
    return this.http.post<OrderResponse>('/api/orders', orderData);
  }
}
