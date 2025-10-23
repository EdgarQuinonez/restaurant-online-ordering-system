import { CartItem } from '@core/shopping-cart/shopping-cart.interface';
import { MenuItem } from '@core/menu/menu.service.interface';
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

// Order interfaces
interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  no_interior: string | null;
  no_exterior: string;
  address_special_instructions: string;
  order_special_instructions: string;
  card_number: string;
  card_holder: string;
  expiry_date: string;
  cvv: string;
  transaction_id: string | null;
  status: OrderStatus;
  scheduled_time: string | null; // ISO datetime string
  total_amount: string; // Decimal as string from API
  created_at: string; // ISO datetime string
  last_updated: string; // ISO datetime string
  items?: OrderItem[]; // Optional, may not be included in all responses
}

interface OrderItem {
  id: number;
  menu_item: number | MenuItem; // Could be ID or full object depending on serializer
  quantity: number;
  special_instructions?: string;
  price: string; // Decimal as string
}

export interface OrderData {
  deliveryInfo: DeliveryInfoFormData;
  orderSummary: OrderSummaryFormData;
  payment: PaymentFormData;
}

export interface OrderSuccessResponse {
  detail: string;
  order: Order;
  payment_status: 'success';
  transaction_id: string;
}

export interface OrderErrorResponse {
  detail: string;
}

export type OrderResponse = OrderSuccessResponse | OrderErrorResponse;

export type OrderStatus = 'pending' | 'assigned' | 'picked' | 'delivered';
