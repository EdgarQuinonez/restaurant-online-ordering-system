export interface CartItem {
  productId: number;
  size: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface ShoppingCart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface CheckoutRequest {
  items: {
    productId: number;
    size: string;
    quantity: number;
    price: number;
  }[];
  total: number;
}
