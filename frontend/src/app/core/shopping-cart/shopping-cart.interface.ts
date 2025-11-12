export interface CartItem {
  menuItemId: number;
  sizeId: number;
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
    menuItemId: number;
    sizeId: number;
    size: string;
    quantity: number;
    price: number;
  }[];
  total: number;
}
