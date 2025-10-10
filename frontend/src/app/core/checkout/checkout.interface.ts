export type CheckoutStep =
  | 'deliveryInfo'
  | 'orderSummary'
  | 'payment'
  | 'finalReview'
  | 'postSubmission';

// Delivery Info Step

export interface DeliveryInfoFormData {
  // Customer Information
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Detailed Address Information
  addressLine1: string;
  addressLine2?: string;
  noInterior?: string;
  noExterior: string;
  specialInstructions: string;
}

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

export interface OrderResponse {
  success: boolean;
  orderId: string;
  estimatedDeliveryTime: string;
  trackingUrl?: string;
}
