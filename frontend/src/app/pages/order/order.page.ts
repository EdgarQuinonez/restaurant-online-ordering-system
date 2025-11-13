import { Component } from '@angular/core';
import { OrderComponent } from '@core/order/order';

@Component({
  selector: 'app-order.page',
  imports: [OrderComponent],
  templateUrl: './order.page.html',
  styleUrl: './order.page.css',
})
export class OrderPage {}
