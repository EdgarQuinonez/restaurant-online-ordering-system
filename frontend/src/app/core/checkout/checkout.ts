import { Component, signal, computed, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { CurrencyPipe, JsonPipe, NgClass, AsyncPipe } from '@angular/common';

import { Observable, switchMap, tap } from 'rxjs';
import { OrderResponse } from './checkout.interface';
import { LoadingState } from '@utils/switchMapWithLoading';
// PrimeNG imports
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';

import { CheckoutStep } from './checkout.interface';
import { CheckoutService } from './checkout.service';
import { DeliveryInfo } from './delivery-info/delivery-info';
import { OrderSummary } from './order-summary/order-summary';
import { Payment } from './payment/payment';
import { FinalReview } from './final-review/final-review';
import { Router } from '@angular/router';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';

@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    StepperModule,
    ButtonModule,
    DeliveryInfo,
    OrderSummary,
    Payment,
    FinalReview,
    CurrencyPipe,
    JsonPipe,
    NgClass,
    AsyncPipe,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  // Master form group
  orderForm!: FormGroup;
  // Form groups for each step
  deliveryInfoForm!: FormGroup;
  orderSummaryForm!: FormGroup;
  paymentForm!: FormGroup;
  finalReviewForm!: FormGroup;

  orderResult$: Observable<LoadingState<OrderResponse>> | null = null;

  // Stepper state - using 0-based index for PrimeNG stepper
  readonly currentStepIndex = signal<number>(0);

  // Step configuration
  readonly steps: CheckoutStep[] = [
    'deliveryInfo',
    'orderSummary',
    'payment',
    'finalReview',
  ];

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);
  private shoppingCartService = inject(ShoppingCartService);

  ngOnInit(): void {
    // Initialize forms
    this.deliveryInfoForm = this.createDeliveryInfoForm();
    this.orderSummaryForm = this.createOrderSummaryForm();
    this.paymentForm = this.createPaymentForm();

    // Create master form

    // This exists as the final validation should be performed on every step to allow submit to backend
    this.orderForm = new FormGroup({
      deliveryInfo: this.deliveryInfoForm,
      orderSummary: this.orderSummaryForm,
      payment: this.paymentForm,
    });
  }

  // Form creation methods
  private createDeliveryInfoForm(): FormGroup {
    return this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      customerPhone: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
          ),
        ],
      ],
      customerEmail: ['', [Validators.email]],
      addressLine1: ['', [Validators.required, Validators.minLength(5)]],
      addressLine2: [''],
      noExterior: ['', [Validators.required]],
      noInterior: [''],
      specialInstructions: [''],
    });
  }

  private createOrderSummaryForm(): FormGroup {
    return this.fb.group({
      specialInstructions: [''],
    });
  }

  private createPaymentForm(): FormGroup {
    return new FormGroup({
      cardNumber: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/), // Matches the masked format: 1234 5678 9012 3456
      ]),
      cardHolder: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/), // Only letters and spaces
      ]),
      expiryDate: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/), // MM/YY format
      ]),
      cvv: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d{3,4}$/), // 3 or 4 digits
      ]),
    });
  }

  // Navigation helper methods
  canNavigateToStep(stepIndex: number): boolean {
    // Allow navigation to current step or any completed step
    if (stepIndex <= this.currentStepIndex()) {
      return true;
    }

    // For future steps, check if all previous steps are valid
    for (let i = 0; i < stepIndex; i++) {
      if (!this.isStepValid(this.steps[i])) {
        return false;
      }
    }
    return true;
  }

  // Form validation methods
  isStepValid(step: CheckoutStep): boolean {
    switch (step) {
      case 'deliveryInfo':
        return this.deliveryInfoForm?.valid ?? false;
      case 'orderSummary':
        return this.orderSummaryForm?.valid ?? false;
      case 'payment':
        return this.paymentForm?.valid ?? false;
      case 'finalReview':
        return true;
      default:
        return false;
    }
  }

  // Event handlers for child components
  onDeliveryInfoSubmit(deliveryData: any): void {
    // console.log('Delivery info submitted:', deliveryData);
  }

  onOrderSummarySubmit(orderSummaryData: any): void {
    // console.log('Order Summary submitted:', orderSummaryData);
  }

  onPaymentSubmit(paymentData: any): void {
    // console.log('Payment submitted:', paymentData);
  }

  onPaymentComplete(paymentData: any): void {
    // console.log('Payment completed:', paymentData);
    // You can process the payment data here if needed
  }

  // Order submission
  submitOrder(): void {
    if (this.orderForm.valid) {
      const orderData = this.orderForm.value;

      this.orderResult$ = this.checkoutService.placeOrder$(orderData).pipe(
        tap((response: any) => {
          console.log(response);
          if (response.data) {
            this.shoppingCartService.clearCart();
          }
        }),
      );

      // Reset forms or navigate to confirmation page
      this.resetForms();
    }
  }

  navigateHome(): void {
    this.router.navigateByUrl('/');
  }

  retryOrder(): void {
    this.orderResult$ = null;
  }

  canSubmitOrder(): boolean {
    return (
      this.deliveryInfoForm?.valid &&
      this.orderSummaryForm?.valid &&
      this.paymentForm?.valid
    );
  }

  private resetForms(): void {
    this.deliveryInfoForm.reset();
    this.orderSummaryForm.reset();
    this.paymentForm.reset();
    this.currentStepIndex.set(0);
  }

  // Getters for template convenience
  get deliveryInfoFormData() {
    return this.deliveryInfoForm.value;
  }

  get orderSummaryFormData() {
    return this.orderSummaryForm.value;
  }

  get paymentFormData() {
    return this.paymentForm.value;
  }

  get orderFormData() {
    return this.orderForm.value;
  }
  // Add this method to your Checkout component class
  getErrorMessages(errors: any): string[] {
    const messages: string[] = [];

    if (typeof errors === 'string') {
      messages.push(errors);
    } else if (Array.isArray(errors)) {
      messages.push(...errors);
    } else if (typeof errors === 'object') {
      for (const [key, value] of Object.entries(errors)) {
        if (Array.isArray(value)) {
          messages.push(...value.map((v) => `${key}: ${v}`));
        } else if (typeof value === 'string') {
          messages.push(`${key}: ${value}`);
        } else if (typeof value === 'object') {
          messages.push(...this.getErrorMessages(value));
        }
      }
    }

    return messages;
  }
}
