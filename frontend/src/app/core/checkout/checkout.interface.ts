import { CartItem } from '@core/shopping-cart/shopping-cart.interface';

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

export interface OrderSummaryFormData {
  specialInstructions: string;
}
export interface PaymentFormData {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
}

export interface OrderData {
  deliveryInfo: DeliveryInfoFormData;
  orderSummary: OrderSummaryFormData;
  payment: PaymentFormData;
}

// TODO: Replace with real backend implementation with order tracking url probably idk websockets
export interface OrderResponse {
  orderId: string;
  status: 'success' | 'failed';
  message: string;
  transactionId?: string;
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
