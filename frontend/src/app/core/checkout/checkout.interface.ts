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
