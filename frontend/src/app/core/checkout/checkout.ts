import { Component, signal, computed, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CurrencyPipe, JsonPipe, NgClass } from '@angular/common';

// PrimeNG imports
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';

import { CheckoutStep } from './checkout.interface';
import { DeliveryInfo } from './delivery-info/delivery-info';
import { OrderSummary } from './order-summary/order-summary';
import { Payment } from './payment/payment';
import { FinalReview } from './final-review/final-review';

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

  // Stepper state - using 0-based index for PrimeNG stepper
  readonly currentStepIndex = signal<number>(0);

  // Step configuration
  readonly steps: CheckoutStep[] = [
    'deliveryInfo',
    'orderSummary',
    'payment',
    'finalReview',
  ];

  // Computed order data for final review
  readonly orderData = computed(() => ({
    deliveryInfo: this.deliveryInfoForm?.value,
    orderSummary: this.orderSummaryForm?.value,
    payment: this.paymentForm?.value,
  }));

  private fb = inject(FormBuilder);

  ngOnInit(): void {
    // Initialize forms
    this.deliveryInfoForm = this.createDeliveryInfoForm();
    this.orderSummaryForm = this.createOrderSummaryForm();
    this.paymentForm = this.createPaymentForm();
    this.finalReviewForm = this.createFinalReviewForm();

    // Create master form

    // This exists as the final validation should be performed on every step to allow submit to backend
    this.orderForm = new FormGroup({
      deliverInfo: this.deliveryInfoForm,
      orderSummary: this.orderSummaryForm,
      payment: this.paymentForm,
      finalReview: this.finalReviewForm,
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
      items: this.fb.array([]),
      subtotal: [0, [Validators.required, Validators.min(0)]],
      deliveryFee: [0, [Validators.required, Validators.min(0)]],
      serviceFee: [0, [Validators.required, Validators.min(0)]],
      tax: [0, [Validators.required, Validators.min(0)]],
      total: [0, [Validators.required, Validators.min(0.01)]],
      restaurantNote: [''],
    });
  }

  private createPaymentForm(): FormGroup {
    return this.fb.group({
      paymentMethod: ['credit_card', [Validators.required]],
      cardNumber: [''],
      expiryDate: [''],
      cvc: [''],
      nameOnCard: [''],
      saveCard: [false],
      billingAddressSameAsDelivery: [true],
    });
  }

  private createFinalReviewForm(): FormGroup {
    return this.fb.group({
      termsAccepted: [false, [Validators.requiredTrue]],
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
        return this.finalReviewForm?.valid ?? false;
      default:
        return false;
    }
  }

  // Event handlers for child components
  onDeliveryInfoSubmit(deliveryData: any): void {
    console.log('Delivery info submitted:', deliveryData);
  }

  onPaymentComplete(paymentData: any): void {
    console.log('Payment completed:', paymentData);
    // You can process the payment data here if needed
  }

  // Order submission
  submitOrder(): void {
    if (this.finalReviewForm.valid) {
      const orderData = this.orderData();
      console.log('Submitting order:', orderData);

      // Here you would typically call your order service
      // this.orderService.submitOrder(orderData).subscribe(...);

      // Reset forms or navigate to confirmation page
      this.resetForms();
    }
  }

  canSubmitOrder(): boolean {
    return (
      this.finalReviewForm?.valid &&
      this.deliveryInfoForm?.valid &&
      this.orderSummaryForm?.valid &&
      this.paymentForm?.valid
    );
  }

  private resetForms(): void {
    this.deliveryInfoForm.reset();
    this.orderSummaryForm.reset();
    this.paymentForm.reset();
    this.finalReviewForm.reset();
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

  get finalReviewFormData() {
    return this.finalReviewForm.value;
  }
}
