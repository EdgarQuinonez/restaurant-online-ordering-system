import {
  Component,
  input,
  output,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import {
  CartItem,
  ShoppingCart,
} from '@core/shopping-cart/shopping-cart.interface';
import { OrderSummaryFormData } from '../checkout.interface';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.css',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    ButtonModule,
    TextareaModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummary implements OnInit, OnDestroy {
  // Inputs and Outputs
  readonly orderSummaryForm = input.required<FormGroup>();
  readonly initialData = input<Partial<OrderSummary>>();
  readonly formSubmitted = output<OrderSummaryFormData>();
  readonly continueClicked = output<void>();
  readonly goBackClicked = output<void>();

  isFormValid!: boolean;
  shoppingCart!: ShoppingCart;
  private readonly DELIVERY_FEE = 10;
  private readonly TAX_RATE = 0.16; // 16% IVA

  private shoppingCartService = inject(ShoppingCartService);

  // Lifecycle hooks
  ngOnInit(): void {
    this.loadShoppingCart();
    this.populateFormWithInitialData();

    this.isFormValid = this.orderSummaryForm().valid;
    this.orderSummaryForm().valueChanges.subscribe(
      () => (this.isFormValid = this.orderSummaryForm().valid),
    );
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private loadShoppingCart(): void {
    this.shoppingCart = this.shoppingCartService.getShoppingCart();
  }

  private populateFormWithInitialData(): void {
    const initialData = this.initialData();
    if (initialData && Object.keys(initialData).length > 0) {
      this.orderSummaryForm().patchValue(initialData);
    }
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

  getItemTotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  goBack(): void {
    this.goBackClicked.emit();
  }

  // Form submission
  onContinue(): void {
    const form = this.orderSummaryForm();

    if (form.valid && this.shoppingCart?.items?.length > 0) {
      const orderSummaryData: OrderSummaryFormData = {
        specialInstructions: form.value.specialInstructions,
      };

      this.formSubmitted.emit(orderSummaryData);
      this.continueClicked.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(form.controls).forEach((key) => {
        const control = form.get(key);
        control?.markAsTouched();
      });
    }
  }

  // Helper methods for template
  hasItems(): boolean {
    return this.shoppingCart?.items?.length > 0;
  }

  getCartItemCount(): number {
    return this.shoppingCart?.itemCount || 0;
  }
}
