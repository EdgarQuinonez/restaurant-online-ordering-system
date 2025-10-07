import { Component } from '@angular/core';
import { Checkout } from '@core/checkout/checkout';

@Component({
  selector: 'app-checkout.page',
  imports: [Checkout],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.css',
})
export class CheckoutPage {}
