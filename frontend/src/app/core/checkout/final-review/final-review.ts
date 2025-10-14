import {
  Component,
  input,
  output,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { ShoppingCart } from '@core/shopping-cart/shopping-cart.interface';
import { OrderData } from '../checkout.interface';

@Component({
  selector: 'app-final-review',
  templateUrl: './final-review.html',
  styleUrl: './final-review.css',
  imports: [DecimalPipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalReview implements OnInit {
  // Inputs and Outputs
  readonly orderData = input.required<OrderData>();
  readonly goBackClicked = output<void>();
  readonly continueClicked = output<void>(); //trigger submit order

  private shoppingCartService = inject(ShoppingCartService);
  public shoppingCart!: ShoppingCart;

  private readonly DELIVERY_FEE = 10;
  private readonly TAX_RATE = 0.16; // 16% IVA

  // Lifecycle hooks
  ngOnInit(): void {
    console.log('initialized');
    console.log('orderData', this.orderData());
    this.loadShoppingCart();
  }

  private loadShoppingCart(): void {
    this.shoppingCart = this.shoppingCartService.getShoppingCart();
  }

  // Calculation methods
  calculateSubtotal(): number {
    return this.shoppingCart?.total - this.calculateTax() || 0;
  }

  calculateTax(): number {
    return this.shoppingCart?.total * this.TAX_RATE;
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.DELIVERY_FEE + this.calculateTax();
  }

  getDeliveryFee(): number {
    return this.DELIVERY_FEE;
  }

  // Navigation methods
  goBack(): void {
    this.goBackClicked.emit();
  }

  onContinue(): void {
    this.continueClicked.emit();
  }

  // Helper methods for template
  hasItems(): boolean {
    return this.shoppingCart.items?.length > 0;
  }

  getCartItemCount(): number {
    return this.shoppingCart.itemCount || 0;
  }

  // Formatting helpers
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s+/g, '');
    return `**** ${cleaned.slice(-4)}`;
  }

  formatExpiryDate(expiryDate: string): string {
    if (!expiryDate) return '';
    return expiryDate;
  }

  getPaymentMethod(paymentData: any): string {
    if (!paymentData?.cardNumber) return 'No especificado';
    return `Tarjeta terminada en ${this.maskCardNumber(paymentData.cardNumber).slice(-4)}`;
  }
}
