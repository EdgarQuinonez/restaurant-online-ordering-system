export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface ShoppingCart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface CheckoutRequest {
  items: {
    productId: number;
    quantity: number;
    price: number;
  }[];
  total: number;
}
