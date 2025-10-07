import {
  Component,
  input,
  output,
  signal,
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

export interface Address {
  id: string;
  name: string;
  fullAddress: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-delivery-info',
  imports: [ReactiveFormsModule, JsonPipe],
  templateUrl: './delivery-info.html',
  styleUrl: './delivery-info.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryInfo {
  // Inputs and Outputs
  readonly initialData = input<Partial<DeliveryInfoFormData>>();
  readonly savedAddresses = input<Address[]>([]);
  readonly showDebug = input(false);

  readonly formSubmitted = output<DeliveryInfoFormData>();
  readonly continueClicked = output<void>();

  // Private dependencies
  private fb = inject(FormBuilder);

  // Form group
  readonly deliveryInfoForm: FormGroup;

  // Signals for state management
  readonly selectedAddressId = signal<string | null>(null);
  readonly minScheduledDate = signal(this.getMinScheduledDate());

  // Computed values
  readonly hasSavedAddresses = computed(() => this.savedAddresses().length > 0);
  readonly isFormValid = computed(() => this.deliveryInfoForm.valid);

  constructor() {
    this.deliveryInfoForm = this.createForm();
  }

  ngOnInit(): void {
    // Initialize form with input data if provided
    if (this.initialData()) {
      this.deliveryInfoForm.patchValue(this.initialData()!);
    }

    // Watch for delivery time changes to handle scheduled time validation
    this.deliveryInfoForm
      .get('deliveryTime')
      ?.valueChanges.subscribe((value) => {
        if (value === 'schedule') {
          this.deliveryInfoForm
            .get('scheduledTime')
            ?.setValidators([Validators.required]);
        } else {
          this.deliveryInfoForm.get('scheduledTime')?.clearValidators();
        }
        this.deliveryInfoForm.get('scheduledTime')?.updateValueAndValidity();
      });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      deliveryAddress: ['', [Validators.required, Validators.minLength(5)]],
      deliveryTime: ['asap', [Validators.required]],
      scheduledTime: [null],
      specialInstructions: [''],
    });
  }

  private getMinScheduledDate(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Minimum 1 hour from now
    return now.toISOString().slice(0, 16);
  }

  // Public methods
  useCurrentLocation(): void {
    // Implementation for geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you would reverse geocode the coordinates
          const address = `Current Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`;
          this.deliveryInfoForm.patchValue({ deliveryAddress: address });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Handle error appropriately
        },
      );
    }
  }

  addNewAddress(): void {
    // Implementation for adding new address
    // This could open a modal or navigate to address management
    console.log('Add new address clicked');
  }

  selectAddress(address: Address): void {
    this.selectedAddressId.set(address.id);
    this.deliveryInfoForm.patchValue({
      deliveryAddress: address.fullAddress,
    });
  }

  isAddressSelected(addressId: string): boolean {
    return this.selectedAddressId() === addressId;
  }

  onContinue(): void {
    if (this.deliveryInfoForm.valid) {
      this.formSubmitted.emit(this.deliveryInfoForm.value);
      this.continueClicked.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.deliveryInfoForm.controls).forEach((key) => {
        this.deliveryInfoForm.get(key)?.markAsTouched();
      });
    }
  }
}

export interface DeliveryInfoFormData {
  deliveryAddress: string;
  deliveryTime: 'asap' | 'schedule';
  scheduledTime: string | null;
  specialInstructions: string;
}
