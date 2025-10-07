// Utility type for step navigation
export type CheckoutStep =
  | 'deliveryInfo'
  | 'orderSummary'
  | 'payment'
  | 'finalReview'
  | 'postSubmission';
// Types for the multi-step checkout process
export interface CheckoutFormSteps {
  deliveryInfo: DeliveryInfoStep;
  orderSummary: OrderSummaryStep;
  payment: PaymentStep;
  finalReview: FinalReviewStep;
  postSubmission: PostSubmissionSteps;
}

// Step 1: Delivery & Time Selection
export interface DeliveryInfoStep {
  title: string;
  subtitle: string;
  addressSection: {
    header: string;
    placeholder: string;
    buttons: {
      addNew: string;
      useCurrentLocation: string;
      selectAnother: string;
    };
    savedAddressesHeader: string;
  };
  deliveryTimeSection: {
    header: string;
    timeOptions: {
      asap: string;
      scheduleLater: string;
    };
    dateTimePicker: {
      label: string;
    };
  };
  actionButton: string;
}

// Step 2: Order Summary & Review
export interface OrderItem {
  name: string;
  quantity: number;
  modifiers: string[];
  price: number;
}

export interface CostBreakdown {
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  tax: string;
  promoCode: {
    applied: string;
    add: string;
    inputPlaceholder: string;
    applyButton: string;
  };
}

export interface OrderSummaryStep {
  title: string;
  subtitle: string;
  restaurantName: string;
  items: OrderItem[];
  costBreakdown: CostBreakdown;
  totalSection: {
    label: string;
    amount: number;
  };
  specialInstructions: {
    header: string;
    placeholder: string;
  };
  actionButton: string;
}

// Step 3: Payment Method
export interface PaymentMethod {
  type: 'credit_card' | 'digital_wallet' | 'cash';
  label: string;
  details?: string;
}

export interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  nameOnCard: string;
  saveCard: boolean;
}

export interface PaymentStep {
  title: string;
  subtitle: string;
  paymentMethods: PaymentMethod[];
  cardDetails?: CardDetails;
  billingAddressToggle: string;
  actionButton: string;
}

// Step 4: Final Review & Place Order
export interface FinalReviewStep {
  title: string;
  subtitle: string;
  sections: {
    deliveryTo: {
      header: string;
      name: string;
      address: string;
    };
    arrivingIn: {
      header: string;
      time: string;
    };
    payingWith: {
      header: string;
      method: string;
    };
    orderTotal: {
      header: string;
      amount: number;
    };
  };
  actionButton: string;
  legalText: string;
}

// Post-Submission Screens
export interface PostSubmissionSteps {
  orderConfirmation: OrderConfirmation;
  orderTracking: OrderTracking;
}

export interface OrderConfirmation {
  title: string;
  message: string;
  details: {
    orderNumber: string;
    estimatedDelivery: string;
  };
  statusBar: string[];
  trackButton: string;
}

export interface OrderTracking {
  title: string;
  subtitle: string;
  statuses: OrderStatus[];
  driverInfo?: {
    name: string;
    contactButton: string;
  };
  supportButton: string;
}

export interface OrderStatus {
  status:
    | 'received'
    | 'preparing'
    | 'driver_assigned'
    | 'on_the_way'
    | 'delivered';
  label: string;
  isActive: boolean;
  estimatedTime?: string;
}

// Main export type that encompasses all steps
export type CheckoutProcessStrings = {
  [K in keyof CheckoutFormSteps]: CheckoutFormSteps[K];
};

// Example usage type for form state management
export interface CheckoutFormState {
  currentStep: keyof CheckoutFormSteps;
  completedSteps: (keyof CheckoutFormSteps)[];
  data: {
    deliveryInfo?: Partial<DeliveryInfoStep>;
    orderSummary?: Partial<OrderSummaryStep>;
    payment?: Partial<PaymentStep>;
    finalReview?: Partial<FinalReviewStep>;
  };
}

// Response type after placing order
export interface OrderResponse {
  success: boolean;
  orderId: string;
  estimatedDeliveryTime: string;
  trackingUrl?: string;
}
