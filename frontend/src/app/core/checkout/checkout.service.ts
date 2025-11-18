import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import {
  Observable,
  of,
  throwError,
  BehaviorSubject,
  shareReplay,
  tap,
} from 'rxjs';
import {
  map,
  catchError,
  startWith,
  switchMap,
  scan,
  take,
} from 'rxjs/operators';
import {
  switchMapWithLoading,
  LoadingState,
} from '@utils/switchMapWithLoading';
import {
  OrderData,
  OrderResponse,
  PaymentIntentResponse,
} from './checkout.interface';
import { environment } from '@environment';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { CartItem } from '@core/shopping-cart/shopping-cart.interface';
import { DeviceIdService } from '@services/device-id.service';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);
  private shoppingCartService = inject(ShoppingCartService);
  private deviceIdService = inject(DeviceIdService);
  private ordersEndpoint = `${environment.apiUrl}/orders/`;
  private paymentIntentEndpoint = `${environment.apiUrl}/orders/create-payment-intent/`;

  // Store for payment intent to ensure only one is created per session
  private paymentIntentSubject = new BehaviorSubject<{
    clientSecret: string | null;
    paymentIntentId: string | null;
  }>({ clientSecret: null, paymentIntentId: null });

  private paymentIntent$ = this.paymentIntentSubject
    .asObservable()
    .pipe(shareReplay(1));

  /**
   * Get the current payment intent
   */
  public getPaymentIntent$(): Observable<{
    clientSecret: string | null;
    paymentIntentId: string | null;
  }> {
    return this.paymentIntent$;
  }

  /**
   * Set the payment intent in the store
   */
  public setPaymentIntent(clientSecret: string, paymentIntentId: string): void {
    this.paymentIntentSubject.next({ clientSecret, paymentIntentId });
  }

  /**
   * Clear the payment intent (e.g., after order completion or cancellation)
   */
  public clearPaymentIntent(): void {
    this.paymentIntentSubject.next({
      clientSecret: null,
      paymentIntentId: null,
    });
  }

  /**
   * Create a payment intent when checkout component loads
   * Uses shareReplay to provide the same payment intent if already created
   */
  public createPaymentIntent$(
    cartItems: CartItem[],
  ): Observable<PaymentIntentResponse> {
    // Check if we already have a payment intent
    const currentIntent = this.paymentIntentSubject.value;
    if (currentIntent.clientSecret && currentIntent.paymentIntentId) {
      return of({
        success: true,
        payment_intent_id: currentIntent.paymentIntentId,
        client_secret: currentIntent.clientSecret,
        amount: 0, // We don't have the amount cached, but it's not critical for the component
        currency: 'mxn',
        detail: 'Using existing payment intent',
      });
    }

    const deviceId = this.deviceIdService.getDeviceId();
    const headers = deviceId
      ? new HttpHeaders({ 'X-Device-ID': deviceId })
      : undefined;
    const transformedItems = this.transformCartItems(cartItems);

    return this.http
      .post<PaymentIntentResponse>(
        this.paymentIntentEndpoint,
        { menu_items: transformedItems },
        { headers },
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            // Store the payment intent for future use
            this.setPaymentIntent(
              response.client_secret,
              response.payment_intent_id,
            );
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error creating payment intent:', error);
          return throwError(() => error);
        }),
        shareReplay(1), // Ensure multiple subscribers get the same result
      );
  }

  /**
   * Place order with existing payment intent
   */
  public placeOrder$(
    orderData: OrderData,
    paymentIntentId: string,
  ): Observable<LoadingState<OrderResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        // Transform the form data to match backend API format
        const transformedData = this.transformOrderData(
          orderData,
          paymentIntentId,
        );
        const deviceId = this.deviceIdService.getDeviceId();
        const headers = deviceId
          ? new HttpHeaders({ 'X-Device-ID': deviceId })
          : undefined;

        return this.http.post<OrderResponse>(
          this.ordersEndpoint,
          transformedData,
          { headers },
        );
      }),
      tap(() => {
        // Clear payment intent after successful order placement
        // This ensures a new payment intent will be created for the next order
        this.clearPaymentIntent();
      }),
    );
  }

  private transformOrderData(
    orderData: OrderData,
    paymentIntentId: string,
  ): any {
    const cartItems = this.shoppingCartService.getShoppingCart().items;

    return {
      customer_info: {
        name: orderData.deliveryInfo.customerName,
        phone: orderData.deliveryInfo.customerPhone,
        email: orderData.deliveryInfo.customerEmail,
      },
      address_info: {
        address_line_1: orderData.deliveryInfo.addressLine1,
        address_line_2: orderData.deliveryInfo.addressLine2,
        no_interior: orderData.deliveryInfo.noInterior,
        no_exterior: orderData.deliveryInfo.noExterior,
        special_instructions: orderData.deliveryInfo.specialInstructions,
      },
      order_instructions: {
        special_instructions: orderData.orderSummary.specialInstructions,
      },
      payment_info: {
        card_holder: orderData.payment.cardHolder,
        expiry_date: this.transformExpiryDate(orderData.payment.expiryDate),
        transaction_id: this.generateTransactionId(),
      },
      menu_items: this.transformCartItems(cartItems),
      payment_intent_id: paymentIntentId,
    };
  }

  private transformExpiryDate(expiryDate: string): string {
    if (!expiryDate) return '';

    // Convert from MM/YY to MM/YYYY
    const [month, year] = expiryDate.split('/');
    if (month && year) {
      const fullYear = `20${year}`;
      return `${month}/${fullYear}`;
    }
    return expiryDate;
  }

  private transformCartItems(cartItems: CartItem[]): any[] {
    return cartItems.map((item) => ({
      menu_item_id: item.menuItemId,
      size_id: item.sizeId,
      quantity: item.quantity,
    }));
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
