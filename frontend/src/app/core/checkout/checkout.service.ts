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
import { environment } from '@environment';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { CartItem } from '@core/shopping-cart/shopping-cart.interface';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);
  private shoppingCartService = inject(ShoppingCartService);
  private endpoint = `${environment.apiUrl}/delivery/orders/`;

  public placeOrder$(
    orderData: OrderData,
  ): Observable<LoadingState<OrderResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        // Transform the form data to match backend API format
        const transformedData = this.transformOrderData(orderData);
        console.log('Transformed order data:', transformedData);
        return this.http.post<OrderResponse>(this.endpoint, transformedData);
      }),
    );
  }

  private transformOrderData(orderData: OrderData): any {
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
        card_number: orderData.payment.cardNumber?.replace(/\s/g, ''), // Remove spaces from card number
        card_holder: orderData.payment.cardHolder,
        expiry_date: this.transformExpiryDate(orderData.payment.expiryDate), // Transform MM/YY to MM/YYYY
        cvv: orderData.payment.cvv,
        transaction_id: this.generateTransactionId(), // You might want to generate this differently
      },
      menu_items: this.transformCartItems(cartItems),
    };
  }

  private transformExpiryDate(expiryDate: string): string {
    if (!expiryDate) return '';

    // Convert from MM/YY to MM/YYYY
    const [month, year] = expiryDate.split('/');
    if (month && year) {
      const fullYear = `20${year}`; // Assuming 21st century
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
    // Generate a simple transaction ID - you might want to use a more robust method
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
