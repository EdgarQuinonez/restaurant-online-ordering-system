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

// Request Body to /delivery/orders/
export interface OrderRequestBody {
  customer_info: {
    name: string;
    phone: string;
    email?: string;
  };
  address_info: {
    address_line_1: string;
    address_line_2?: string;
    no_interior?: string;
    no_exterior: string;
    special_instructions?: string;
  };
  order_instructions: {
    special_instructions?: string;
  };
  payment_info: {
    card_number: string;
    card_holder: string;
    expiry_date: string;
    cvv: string;
    transaction_id?: string;
  };
  menu_items: Array<{
    menu_item_id: number;
    size_id: number;
    quantity: number;
  }>;
}

// Order Item Interface
export interface OrderItem {
  id: number;
  menu_item: number; // This might be the ID or a nested object, adjust based on your API
  menu_item_id: number;
  size: number; // This might be the ID or a nested object, adjust based on your API
  size_id: number;
  quantity: number;
  price: string; // Usually string for Decimal fields from Django
  item_name: string;
  size_name: string;
  subtotal: string; // Usually string for Decimal fields
}

// Order Interface for Response
export interface Order {
  // Order Identification
  id: number;
  order_number: string;
  transaction_id?: string;

  // Order Items
  order_items: OrderItem[];

  // Order Status & Tracking
  status: string;
  status_display: string;
  scheduled_time: string | null;
  total_amount: string; // Usually string for Decimal fields

  // Timestamps
  created_at: string;
  last_updated: string;

  // Nested information (from your updated serializer)
  customer_info: {
    name: string;
    phone: string;
    email: string;
  };
  address_info: {
    address_line_1: string;
    address_line_2: string;
    no_interior: string;
    no_exterior: string;
    special_instructions: string;
  };
  order_instructions: {
    special_instructions: string;
  };
  payment_info: {
    card_holder: string;
    expiry_date: string;
    transaction_id: string;
  };
}

// Frontend Form Data Structure
export interface OrderData {
  deliveryInfo: DeliveryInfoFormData;
  orderSummary: OrderSummaryFormData;
  payment: PaymentFormData;
}

// Response Interfaces
export interface OrderResponseSuccess {
  success: true;
  detail: string;
  payment_status: 'success';
  transaction_id: string;
  order: Order;
}

export interface OrderResponseBadRequest {
  success: false;
  detail: string;
  errors?: {
    [key: string]: string[] | { [key: string]: string } | string;
  };
}

export interface OrderResponseError {
  success: false;
  detail: string;
  error?: string;
  code?: string;
}

// Union type for all possible order responses
export type OrderResponse =
  | OrderResponseSuccess
  | OrderResponseBadRequest
  | OrderResponseError;

export type OrderStatus = 'pending' | 'assigned' | 'picked' | 'delivered';

// Helper type guards for response discrimination
export function isOrderResponseSuccess(
  response: OrderResponse,
): response is OrderResponseSuccess {
  return response.success === true;
}

export function isOrderResponseBadRequest(
  response: OrderResponse,
): response is OrderResponseBadRequest {
  return response.success === false && 'errors' in response;
}

export function isOrderResponseError(
  response: OrderResponse,
): response is OrderResponseError {
  return response.success === false && !('errors' in response);
}
