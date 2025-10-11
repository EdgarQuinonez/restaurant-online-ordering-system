import {
  Component,
  input,
  output,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { JsonPipe } from '@angular/common';

// PrimeNG imports
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { IftaLabelModule } from 'primeng/iftalabel';
import { DeliveryInfoFormData } from '../checkout.interface';

@Component({
  selector: 'app-delivery-info',
  imports: [
    ReactiveFormsModule,
    JsonPipe,
    InputTextModule,
    ButtonModule,
    RadioButtonModule,
    IftaLabelModule,
  ],
  templateUrl: './delivery-info.html',
  styleUrl: './delivery-info.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryInfo {
  // Inputs and Outputs
  readonly deliveryInfoForm = input.required<FormGroup>();
  readonly initialData = input<Partial<DeliveryInfoFormData>>();
  readonly formSubmitted = output<DeliveryInfoFormData>();
  readonly continueClicked = output<void>();

  isFormValid!: boolean;

  // Lifecycle hook to populate form with initial data
  ngOnInit(): void {
    this.populateFormWithInitialData();

    this.isFormValid = this.deliveryInfoForm().valid;
    this.deliveryInfoForm().valueChanges.subscribe(
      () => (this.isFormValid = this.deliveryInfoForm().valid),
    );
  }

  private populateFormWithInitialData(): void {
    const initialData = this.initialData();
    if (initialData && Object.keys(initialData).length > 0) {
      this.deliveryInfoForm().patchValue(initialData);
    }
  }

  onContinue(): void {
    const form = this.deliveryInfoForm();

    if (form.valid) {
      this.formSubmitted.emit(form.value as DeliveryInfoFormData);
      this.continueClicked.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(form.controls).forEach((key) => {
        const control = form.get(key);
        control?.markAsTouched();
      });
    }
  }
}
