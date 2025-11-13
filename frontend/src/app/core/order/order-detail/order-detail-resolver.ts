// order-detail.resolver.ts
import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { OrderService } from '@core/order/order.service';
import type { OrderByIdResponse } from '@core/order/order.interface';

export const orderDetailResolver: ResolveFn<OrderByIdResponse> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const orderService = inject(OrderService);
  const orderId = Number(route.paramMap.get('id'));

  if (isNaN(orderId)) {
    throw new Error('Invalid order ID');
  }

  return orderService.getOrderById$(orderId);
};
