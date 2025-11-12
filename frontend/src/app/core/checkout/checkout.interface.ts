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

interface OrderItem {
  id: number;
  menu_item: string;
  menu_item_id: number;
  size: string;
  size_id: number;
  quantity: number;
  price: number;
  item_name: string;
  size_name: string;
  subtotal: number;
}

// Request Body to /delivery/orders/
interface Order {
  // Order Identification
  id: number;
  order_number: string;

  // Customer Information
  customer_name: string;
  customer_phone: string;
  customer_email: string;

  // Address Information
  address_line_1: string;
  address_line_2?: string;
  no_interior?: string;
  no_exterior: string;
  address_special_instructions?: string;

  // Order Instructions
  order_special_instructions?: string;

  // Payment Information (write-only for security)
  card_number: string;
  card_holder: string;
  expiry_date: string;
  cvv: string;
  transaction_id: string;

  // Order Items
  order_items: OrderItem[];

  // Order Status & Tracking
  status: string;
  status_display: string;
  scheduled_time: string;
  total_amount: number;

  // Timestamps
  created_at: string;
  last_updated: string;
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
