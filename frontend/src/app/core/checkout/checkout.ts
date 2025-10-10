import { Component, signal, computed, inject } from '@angular/core';

import { CheckoutStep } from './checkout.interface';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DeliveryInfo } from './delivery-info/delivery-info';
import { OrderSummary } from './order-summary/order-summary';
import { Payment } from './payment/payment';
import { FinalReview } from './final-review/final-review';
import { CurrencyPipe, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    DeliveryInfo,
    OrderSummary,
    Payment,
    FinalReview,
    CurrencyPipe,
    JsonPipe,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  // Form groups for each step
  deliveryInfoForm!: FormGroup;
  orderSummaryForm!: FormGroup;
  paymentForm!: FormGroup;
  finalReviewForm!: FormGroup;

  // State management using signals
  readonly currentStep = signal<CheckoutStep>('deliveryInfo');
  readonly completedSteps = signal<CheckoutStep[]>([]);

  // Reactive form state
  readonly formState = computed(() => ({
    currentStep: this.currentStep(),
    completedSteps: this.completedSteps(),
    data: {
      deliveryInfo: this.deliveryInfoForm?.value,
      orderSummary: this.orderSummaryForm?.value,
      payment: this.paymentForm?.value,
      finalReview: this.finalReviewForm?.value,
    },
  }));

  // Step configuration
  readonly steps: CheckoutStep[] = [
    'deliveryInfo',
    'orderSummary',
    'payment',
    'finalReview',
  ];

  private fb = inject(FormBuilder);

  ngOnInit(): void {
    // Initialize forms
    this.deliveryInfoForm = this.createDeliveryInfoForm();
    this.orderSummaryForm = this.createOrderSummaryForm();
    this.paymentForm = this.createPaymentForm();
    this.finalReviewForm = this.createFinalReviewForm();
    // Subscribe to form value changes for reactive updates
    this.deliveryInfoForm.valueChanges.subscribe((value) => {
      console.log('Delivery info updated:', value);
    });

    this.orderSummaryForm.valueChanges.subscribe((value) => {
      console.log('Order summary updated:', value);
    });

    this.paymentForm.valueChanges.subscribe((value) => {
      console.log('Payment info updated:', value);
    });

    this.finalReviewForm.valueChanges.subscribe((value) => {
      console.log('Final review updated:', value);
    });
  }

  // Form creation methods
  private createDeliveryInfoForm(): FormGroup {
    return this.fb.group({
      deliveryAddress: ['', [Validators.required]],
      deliveryTime: ['asap', [Validators.required]],
      scheduledTime: [null],
      specialInstructions: [''],
    });
  }

  private createOrderSummaryForm(): FormGroup {
    return this.fb.group({
      items: this.fb.array([]),
      // promoCode: [''],
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

  // Step navigation methods
  nextStep(): void {
    const currentIndex = this.steps.indexOf(this.currentStep());
    if (currentIndex < this.steps.length - 1) {
      const nextStep = this.steps[currentIndex + 1];
      this.currentStep.set(nextStep);

      // Add current step to completed steps if not already there
      if (!this.completedSteps().includes(this.currentStep())) {
        this.completedSteps.update((steps) => [...steps, this.currentStep()]);
      }
    }
  }

  previousStep(): void {
    const currentIndex = this.steps.indexOf(this.currentStep());
    if (currentIndex > 0) {
      const previousStep = this.steps[currentIndex - 1];
      this.currentStep.set(previousStep);
    }
  }

  goToStep(step: CheckoutStep): void {
    // Only allow navigation to completed steps or the immediate next step
    const stepIndex = this.steps.indexOf(step);
    const currentIndex = this.steps.indexOf(this.currentStep());

    if (
      this.completedSteps().includes(step) ||
      stepIndex === currentIndex + 1
    ) {
      this.currentStep.set(step);
    }
  }

  // Form validation methods
  isStepValid(step: CheckoutStep): boolean {
    switch (step) {
      case 'deliveryInfo':
        return this.deliveryInfoForm.valid;
      case 'orderSummary':
        return this.orderSummaryForm.valid;
      case 'payment':
        return this.paymentForm.valid;
      case 'finalReview':
        return this.finalReviewForm.valid;
      default:
        return false;
    }
  }

  // Form submission
  submitOrder(): void {
    if (this.isStepValid('finalReview')) {
      const orderData = this.formState().data;
      console.log('Submitting order:', orderData);

      // Here you would typically call your order service
      // this.orderService.submitOrder(orderData).subscribe(...);

      // Mark all steps as completed
      this.completedSteps.set([...this.steps]);
    }
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

  // Check if we can proceed to next step
  canProceedToNextStep(): boolean {
    return this.isStepValid(this.currentStep());
  }

  // Get current form group for the active step
  getCurrentFormGroup(): FormGroup {
    switch (this.currentStep()) {
      case 'deliveryInfo':
        return this.deliveryInfoForm;
      case 'orderSummary':
        return this.orderSummaryForm;
      case 'payment':
        return this.paymentForm;
      case 'finalReview':
        return this.finalReviewForm;
      default:
        return this.deliveryInfoForm;
    }
  }
  getStepLabel(step: CheckoutStep): string {
    const labels: Record<CheckoutStep, string> = {
      deliveryInfo: 'Delivery',
      orderSummary: 'Order',
      payment: 'Payment',
      finalReview: 'Review',
      postSubmission: 'Confirmación',
    };
    return labels[step];
  }

  getNextStepLabel(): string {
    const currentIndex = this.steps.indexOf(this.currentStep());
    if (currentIndex < this.steps.length - 1) {
      return this.getStepLabel(this.steps[currentIndex + 1]);
    }
    return 'Complete';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      credit_card: 'Credit/Debit Card',
      digital_wallet: 'Digital Wallet',
      cash: 'Cash on Delivery',
    };
    return labels[method] || method;
  }
}
