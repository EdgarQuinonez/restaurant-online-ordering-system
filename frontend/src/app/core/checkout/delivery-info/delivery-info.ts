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
  readonly initialData = input<Partial<DeliveryInfoFormData>>();
  readonly formSubmitted = output<DeliveryInfoFormData>();
  readonly continueClicked = output<void>();

  // Private dependencies
  private fb = inject(FormBuilder);

  // Form group
  deliveryInfoForm!: FormGroup;

  readonly isFormValid = computed(() => this.deliveryInfoForm.valid);

  ngOnInit(): void {
    this.deliveryInfoForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Customer Information
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

      // Detailed Address Information
      addressLine1: ['', [Validators.required, Validators.minLength(5)]],
      addressLine2: [''],
      noExterior: ['', [Validators.required]],
      noInterior: [''],
      specialInstructions: [''],
    });
  }
  onContinue(): void {
    if (this.deliveryInfoForm.valid) {
      this.formSubmitted.emit(
        this.deliveryInfoForm.value as DeliveryInfoFormData,
      );
      this.continueClicked.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.deliveryInfoForm.controls).forEach((key) => {
        const control = this.deliveryInfoForm.get(key);
        control?.markAsTouched();
      });
    }
  }
}
