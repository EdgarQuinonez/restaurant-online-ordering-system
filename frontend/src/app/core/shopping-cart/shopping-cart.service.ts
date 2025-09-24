import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalStorageService } from '@services/local-storage.service'; // Adjust path as needed
import {
  CartItem,
  ShoppingCart,
  CheckoutRequest,
} from './shopping-cart.interface';

@Injectable({
  providedIn: 'root',
})
export class ShoppingCartService {
  private readonly CART_KEY = 'shopping_cart';
  private readonly API_URL = '/api';

  private http = inject(HttpClient);
  private localStorageService = inject(LocalStorageService);

  // Keep state of shopping cart in a variable
  private cartState: ShoppingCart = this.loadCartFromStorage();

  // 1. Get shopping cart items
  getShoppingCart(): ShoppingCart {
    return { ...this.cartState }; // Return a copy to prevent direct mutation
  }

  // 2. Keep state of items in cart (CRUD operations)

  // Create/Add item to cart
  addItem(item: Omit<CartItem, 'id'>): ShoppingCart {
    const existingItem = this.cartState.items.find(
      (cartItem) => cartItem.productId === item.productId,
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      const newItem: CartItem = {
        ...item,
        id: this.generateId(),
      };
      this.cartState.items.push(newItem);
    }

    this.updateCartState();
    return this.getShoppingCart();
  }

  // Read - Get specific item
  getItem(productId: number): CartItem | undefined {
    return this.cartState.items.find((item) => item.productId === productId);
  }

  // Update item quantity
  updateItemQuantity(productId: number, quantity: number): ShoppingCart {
    const item = this.cartState.items.find(
      (cartItem) => cartItem.productId === productId,
    );

    if (item) {
      if (quantity <= 0) {
        return this.removeItem(productId);
      }
      item.quantity = quantity;
      this.updateCartState();
    }

    return this.getShoppingCart();
  }

  // Delete item from cart
  removeItem(productId: number): ShoppingCart {
    this.cartState.items = this.cartState.items.filter(
      (item) => item.productId !== productId,
    );
    this.updateCartState();
    return this.getShoppingCart();
  }

  // Clear entire cart
  clearCart(): ShoppingCart {
    this.cartState = this.getEmptyCart();
    this.updateCartState();
    return this.getShoppingCart();
  }

  // 5. Checkout function
  checkout(): Observable<any> {
    const checkoutRequest: CheckoutRequest = {
      items: this.cartState.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      total: this.cartState.total,
    };

    return this.http.post(`${this.API_URL}/checkout/`, checkoutRequest);
  }

  // Helper methods
  private updateCartState(): void {
    // Recalculate totals
    this.cartState.itemCount = this.calculateItemCount(this.cartState.items);
    this.cartState.total = this.calculateTotal(this.cartState.items);

    // Save to localStorage for persistence across sessions
    this.localStorageService.setItem(this.CART_KEY, this.cartState);
  }

  private loadCartFromStorage(): ShoppingCart {
    const savedCart = this.localStorageService.getItem<ShoppingCart>(
      this.CART_KEY,
    );
    if (savedCart) {
      // Ensure the loaded cart has proper calculated values
      savedCart.itemCount = this.calculateItemCount(savedCart.items);
      savedCart.total = this.calculateTotal(savedCart.items);
      return savedCart;
    }
    return this.getEmptyCart();
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  private calculateItemCount(items: CartItem[]): number {
    return items.reduce((count, item) => count + item.quantity, 0);
  }

  private getEmptyCart(): ShoppingCart {
    return {
      items: [],
      total: 0,
      itemCount: 0,
    };
  }

  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  // Additional utility methods
  getCartItemCount(): number {
    return this.cartState.itemCount;
  }

  getCartTotal(): number {
    return this.cartState.total;
  }

  isCartEmpty(): boolean {
    return this.cartState.items.length === 0;
  }

  // Optional: Method to force reload from storage (useful for multi-tab scenarios)
  reloadFromStorage(): void {
    this.cartState = this.loadCartFromStorage();
  }

  // Optional: Method to sync cart across browser tabs
  initializeCartSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.CART_KEY) {
        this.cartState = this.loadCartFromStorage();
      }
    });
  }
}
