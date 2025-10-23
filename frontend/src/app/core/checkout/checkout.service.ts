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

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);
  private endpoint = `${environment.apiUrl}/delivery/orders/`;

  public placeOrder$(
    orderData: OrderData,
  ): Observable<LoadingState<OrderResponse>> {
    return of(null).pipe(
      switchMapWithLoading(() => {
        return this.http.post<OrderResponse>(this.endpoint, orderData);
      }),
    );
  }
}
