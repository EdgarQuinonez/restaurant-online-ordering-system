import { Order as FullOrder } from '@core/checkout/checkout.interface';

export interface Order {
  id: number;
  order_number: string;
  status: string;
  status_display: string;
  total_amount: string;
  created_at: string;
  customer_name: string;
}

export interface CustomerInfo {
  device_id: string;
  created_at: string;
}

export interface OrdersResponse {
  count: number;
  results: Order[];
  next?: string;
  previous?: string;
}

export interface AllOrdersResponse {
  count: number;
  results: FullOrder[];
  next?: string;
  previous?: string;
}

// Response for getting order by ID
export interface OrderByIdResponse {
  success: true;
  order: FullOrder;
}

// Response for updating response success
export interface UpdateOrderStatusResponse {
  success: true;
  order: FullOrder;
}
