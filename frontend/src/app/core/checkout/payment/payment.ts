import {
  Component,
  input,
  output,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Stripe imports
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { environment } from '@environment';

import { PaymentFormData } from '../checkout.interface';
import { CheckoutService } from '../checkout.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.html',
  styleUrl: './payment.css',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Payment implements OnInit, AfterViewInit, OnDestroy {
  // Inputs and Outputs
  readonly paymentForm = input.required<FormGroup>();
  readonly initialData = input<Partial<PaymentFormData>>();
  readonly formSubmitted = output<PaymentFormData>();
  readonly continueClicked = output<void>();
  readonly goBackClicked = output<void>();
  readonly paymentElementReady = output<boolean>();

  // Services
  private checkoutService = inject(CheckoutService);

  // Stripe elements
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  // Template references
  readonly paymentElementRef = viewChild.required<ElementRef>('paymentElement');

  // Component state
  private isFormValid = signal(false);
  private isLoading = signal(true);
  private stripeError = signal<string | null>(null);
  private clientSecret: string | null = null;

  // Computed signals
  readonly formValid = computed(() => this.isFormValid());
  readonly loading = computed(() => this.isLoading());
  readonly error = computed(() => this.stripeError());

  // Lifecycle hooks
  async ngOnInit(): Promise<void> {
    await this.initializeStripe();
    this.setupFormValidation();
    this.retrieveClientSecret();
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.stripe && this.clientSecret) {
      await this.initializePaymentElement();
    }
  }

  ngOnDestroy(): void {
    this.cleanupStripe();
  }

  private retrieveClientSecret(): void {
    this.checkoutService.getPaymentIntent$().subscribe({
      next: (paymentIntent) => {
        if (paymentIntent.clientSecret) {
          this.clientSecret = paymentIntent.clientSecret;
          console.log('Retrieved client secret from service');

          // If Stripe is already initialized, initialize the payment element
          if (this.stripe) {
            this.initializePaymentElement();
          }
        } else {
          this.stripeError.set(
            'No payment intent available. Please return to cart and try again.',
          );
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('Error retrieving payment intent:', error);
        this.stripeError.set('Failed to retrieve payment information.');
        this.isLoading.set(false);
      },
    });
  }

  private async initializeStripe(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.stripeError.set(null);

      // Load Stripe.js
      this.stripe = await loadStripe(environment.stripePublishableKey);

      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.stripeError.set(
        'Failed to initialize payment system. Please refresh the page.',
      );
      this.isLoading.set(false);
    }
  }

  private async initializePaymentElement(): Promise<void> {
    if (!this.stripe || !this.clientSecret) {
      this.stripeError.set('Missing payment configuration');
      this.isLoading.set(false);
      return;
    }

    try {
      // Initialize Stripe Elements
      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#6366f1',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      });

      // Create and mount the Payment Element
      this.paymentElement = this.elements.create('payment', {
        layout: {
          type: 'tabs',
          defaultCollapsed: false,
        },
      });

      await this.paymentElement.mount(this.paymentElementRef().nativeElement);

      // Listen for changes in the Payment Element
      this.paymentElement.on('change', (event) => {
        this.handlePaymentElementChange(event);
      });

      this.paymentElement.on('ready', () => {
        this.handlePaymentElementReady();
      });

      this.paymentElement.on('loaderror', (event) => {
        this.handlePaymentElementError(
          event.error?.message || 'Failed to load payment form',
        );
      });
    } catch (error) {
      console.error('Error initializing payment element:', error);
      this.stripeError.set('Failed to load payment form. Please try again.');
      this.isLoading.set(false);
    }
  }

  private handlePaymentElementChange(event: any): void {
    this.isFormValid.set(event.complete && !event.error);

    if (event.error) {
      this.stripeError.set(event.error.message);
    } else {
      this.stripeError.set(null);
    }
  }

  private handlePaymentElementReady(): void {
    console.log('Stripe Payment Element is ready');
    this.isLoading.set(false);
    this.paymentElementReady.emit(true);
  }

  private handlePaymentElementError(errorMessage: string): void {
    console.error('Stripe Payment Element error:', errorMessage);
    this.stripeError.set(errorMessage);
    this.isLoading.set(false);
  }

  private setupFormValidation(): void {
    this.isFormValid.set(false);
  }

  // Navigation methods
  goBack(): void {
    this.goBackClicked.emit();
  }

  // Form submission
  async onContinue(): Promise<void> {
    if (!this.stripe || !this.elements || !this.clientSecret) {
      this.stripeError.set('Payment system not ready');
      return;
    }

    this.isLoading.set(true);
    this.stripeError.set(null);

    try {
      // Confirm payment with Stripe
      const { error } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        this.handlePaymentError(error);
        return;
      }

      // Emit the form data
      const paymentData: PaymentFormData = {
        cardNumber: '',
        cardHolder: this.paymentForm().value.cardHolder?.trim() || '',
        expiryDate: '',
        cvv: '',
      };

      this.formSubmitted.emit(paymentData);
      this.continueClicked.emit();
    } catch (error) {
      console.error('Error confirming payment:', error);
      this.stripeError.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private handlePaymentError(error: any): void {
    console.error('Stripe payment error:', error);

    switch (error.type) {
      case 'card_error':
        this.stripeError.set(`Card error: ${error.message}`);
        break;
      case 'validation_error':
        this.stripeError.set(`Validation error: ${error.message}`);
        break;
      case 'invalid_request_error':
        this.stripeError.set('Invalid request. Please check your information.');
        break;
      case 'api_connection_error':
        this.stripeError.set('Network error. Please check your connection.');
        break;
      case 'api_error':
        this.stripeError.set('Payment service error. Please try again.');
        break;
      case 'authentication_error':
        this.stripeError.set('Authentication failed. Please refresh the page.');
        break;
      default:
        this.stripeError.set(error.message || 'An unexpected error occurred.');
    }
  }

  // Retry initialization
  async retryInitialization(): Promise<void> {
    this.stripeError.set(null);
    await this.initializeStripe();
    this.retrieveClientSecret();
  }

  private cleanupStripe(): void {
    if (this.paymentElement) {
      this.paymentElement.destroy();
      this.paymentElement = null;
    }

    if (this.elements) {
      this.elements = null;
    }
  }

  // Helper methods for template
  hasError(): boolean {
    return !!this.stripeError();
  }

  getErrorMessage(): string {
    return this.stripeError() || '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm().get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.paymentForm().get(fieldName);

    if (!field || !field.errors || !field.touched) {
      return '';
    }

    const errors = field.errors;

    if (errors['required']) {
      return 'Este campo es requerido';
    }

    if (errors['pattern']) {
      if (fieldName === 'cardHolder') {
        return 'Solo se permiten letras y espacios';
      }
    }

    if (errors['minlength'] || errors['maxlength']) {
      if (fieldName === 'cardHolder') {
        return 'Nombre debe tener entre 2 y 50 caracteres';
      }
    }

    return 'Campo inválido';
  }
}
