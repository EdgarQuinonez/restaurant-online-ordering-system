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
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageModule } from 'primeng/message';

import { PaymentFormData } from '../checkout.interface';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.html',
  styleUrl: './payment.css',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputMaskModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Payment implements OnInit, OnDestroy {
  // Inputs and Outputs
  readonly paymentForm = input.required<FormGroup>();
  readonly initialData = input<Partial<PaymentFormData>>();
  readonly formSubmitted = output<PaymentFormData>();
  readonly continueClicked = output<void>();
  readonly goBackClicked = output<void>();

  private isFormValid = signal(false);
  readonly formValid = computed(() => this.isFormValid());

  // Lifecycle hooks
  ngOnInit(): void {
    this.populateFormWithInitialData();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private populateFormWithInitialData(): void {
    const initialData = this.initialData();
    if (initialData && Object.keys(initialData).length > 0) {
      this.paymentForm().patchValue(initialData);
    }
  }

  private setupFormValidation(): void {
    this.isFormValid.set(this.paymentForm().valid);

    this.paymentForm().valueChanges.subscribe(() =>
      this.isFormValid.set(this.paymentForm().valid),
    );
  }

  // Navigation methods
  goBack(): void {
    this.goBackClicked.emit();
  }

  // Form submission
  onContinue(): void {
    const form = this.paymentForm();

    if (form.valid) {
      const paymentData: PaymentFormData = {
        cardNumber: this.cleanCardNumber(form.value.cardNumber),
        cardHolder: form.value.cardHolder?.trim(),
        expiryDate: form.value.expiryDate,
        cvv: form.value.cvv,
      };

      this.formSubmitted.emit(paymentData);
      this.continueClicked.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(form.controls).forEach((key) => {
        const control = form.get(key);
        control?.markAsTouched();
      });
    }
  }

  // Helper methods
  private cleanCardNumber(cardNumber: string): string {
    return cardNumber?.replace(/\s+/g, '') || '';
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
      if (fieldName === 'cardNumber') {
        return 'Número de tarjeta inválido';
      }
      if (fieldName === 'expiryDate') {
        return 'Fecha de expiración inválida';
      }
      if (fieldName === 'cvv') {
        return 'CVV inválido';
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
