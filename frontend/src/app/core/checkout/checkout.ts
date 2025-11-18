import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { CurrencyPipe, JsonPipe, NgClass, AsyncPipe } from '@angular/common';

import { Observable, switchMap, tap, Subscription } from 'rxjs';
import { OrderResponse, PaymentIntentResponse } from './checkout.interface';
import { LoadingState } from '@utils/switchMapWithLoading';
// PrimeNG imports
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';

import { CheckoutStep } from './checkout.interface';
import { CheckoutService } from './checkout.service';
import { DeviceIdService } from '@services/device-id.service';
import { DeliveryInfo } from './delivery-info/delivery-info';
import { OrderSummary } from './order-summary/order-summary';
import { Payment } from './payment/payment';
import { FinalReview } from './final-review/final-review';
import { Router } from '@angular/router';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { CartItem } from '@core/shopping-cart/shopping-cart.interface';

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
    NgClass,
    AsyncPipe,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit, OnDestroy {
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

  // Payment intent state
  paymentIntentId: string | null = null;
  clientSecret: string | null = null;
  paymentIntentLoading = false;
  paymentIntentError: string | null = null;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);
  private shoppingCartService = inject(ShoppingCartService);
  private deviceIdService = inject(DeviceIdService);
  private subscription = new Subscription();

  ngOnInit(): void {
    // Initialize forms
    this.deliveryInfoForm = this.createDeliveryInfoForm();
    this.orderSummaryForm = this.createOrderSummaryForm();
    this.paymentForm = this.createPaymentForm();

    // Create master form
    this.orderForm = new FormGroup({
      deliveryInfo: this.deliveryInfoForm,
      orderSummary: this.orderSummaryForm,
      payment: this.paymentForm,
    });

    // Check for existing payment intent first
    this.checkExistingPaymentIntent();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private checkExistingPaymentIntent(): void {
    const paymentIntentSub = this.checkoutService
      .getPaymentIntent$()
      .subscribe({
        next: (paymentIntent) => {
          if (paymentIntent.clientSecret && paymentIntent.paymentIntentId) {
            this.clientSecret = paymentIntent.clientSecret;
            this.paymentIntentId = paymentIntent.paymentIntentId;
            console.log('Using existing payment intent:', this.paymentIntentId);
          } else {
            // Create new payment intent if none exists
            this.createPaymentIntent();
          }
        },
      });

    this.subscription.add(paymentIntentSub);
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
    // Simplified payment form since Stripe handles payment details
    return new FormGroup({
      cardHolder: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
      ]),
    });
  }

  // Payment intent creation
  private createPaymentIntent(): void {
    const cartItems = this.shoppingCartService.getShoppingCart().items;

    if (cartItems.length === 0) {
      this.paymentIntentError = 'Cart is empty. Please add items to your cart.';
      return;
    }

    this.paymentIntentLoading = true;
    this.paymentIntentError = null;

    const paymentIntentSub = this.checkoutService
      .createPaymentIntent$(cartItems)
      .subscribe({
        next: (response) => {
          this.paymentIntentLoading = false;
          if (response.success) {
            this.paymentIntentId = response.payment_intent_id;
            this.clientSecret = response.client_secret;
            console.log('Payment intent created:', this.paymentIntentId);

            // The service automatically stores the payment intent
            // No need to call setPaymentIntent manually
          } else {
            this.paymentIntentError =
              response.detail || 'Failed to create payment intent';
          }
        },
        error: (error) => {
          this.paymentIntentLoading = false;
          this.paymentIntentError =
            'Failed to create payment intent. Please try again.';
          console.error('Error creating payment intent:', error);
        },
      });

    this.subscription.add(paymentIntentSub);
  }

  // Retry payment intent creation
  retryPaymentIntent(): void {
    this.createPaymentIntent();
  }

  // Navigation helper methods
  canNavigateToStep(stepIndex: number): boolean {
    if (stepIndex <= this.currentStepIndex()) {
      return true;
    }

    for (let i = 0; i < stepIndex; i++) {
      if (!this.isStepValid(this.steps[i])) {
        return false;
      }
    }
    return true;
  }

  // Check if payment step can be accessed
  canAccessPaymentStep(): boolean {
    return (
      this.isStepValid('deliveryInfo') &&
      this.isStepValid('orderSummary') &&
      !!this.clientSecret
    );
  }

  // Form validation methods
  isStepValid(step: CheckoutStep): boolean {
    switch (step) {
      case 'deliveryInfo':
        return this.deliveryInfoForm?.valid ?? false;
      case 'orderSummary':
        return this.orderSummaryForm?.valid ?? false;
      case 'payment':
        // For payment step, we only validate the card holder name
        // Stripe handles the actual payment validation
        return this.paymentForm?.valid ?? (false && !!this.clientSecret);
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
  }

  // Order submission
  submitOrder(): void {
    if (this.orderForm.valid && this.paymentIntentId) {
      const orderData = this.orderForm.value;

      this.orderResult$ = this.checkoutService
        .placeOrder$(orderData, this.paymentIntentId)
        .pipe(
          tap((response: any) => {
            console.log(response);
            if (response.data) {
              this.shoppingCartService.clearCart();

              if (response.data.device_id) {
                this.deviceIdService.setDeviceId(response.data.device_id);
                console.log('New device ID stored:', response.data.device_id);
              }
            }
          }),
        );

      this.resetForms();
    } else {
      console.error(
        'Cannot submit order: Form invalid or missing payment intent',
      );
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
      this.paymentForm?.valid &&
      !!this.paymentIntentId &&
      !!this.clientSecret
    );
  }

  private resetForms(): void {
    this.deliveryInfoForm.reset();
    this.orderSummaryForm.reset();
    this.paymentForm.reset();
    this.currentStepIndex.set(0);
    // Don't clear payment intent here - let the service handle it after order completion
    this.paymentIntentError = null;
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

  get cartItems(): CartItem[] {
    return this.shoppingCartService.getShoppingCart().items;
  }

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
