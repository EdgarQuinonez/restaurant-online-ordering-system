import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
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

  // 1. Create cart$ BehaviorSubject to emit cart state changes
  private cartSubject = new BehaviorSubject<ShoppingCart>(this.cartState);
  public cart$ = this.cartSubject.asObservable();
  private cartDisplaySubject = new BehaviorSubject<boolean>(false);
  public cartDisplay$ = this.cartDisplaySubject.asObservable();

  // 2. Get shopping cart items
  getShoppingCart(): ShoppingCart {
    return { ...this.cartState }; // Return a copy to prevent direct mutation
  }

  // Get items array directly (useful for checkout transformation)
  getItems(): CartItem[] {
    return [...this.cartState.items];
  }

  // 3. Keep state of items in cart (CRUD operations)

  // Create/Add item to cart - UPDATED to use menuItemId and sizeId
  addItem(item: CartItem): ShoppingCart {
    const existingItem = this.cartState.items.find(
      (cartItem) =>
        cartItem.menuItemId === item.menuItemId &&
        cartItem.sizeId === item.sizeId,
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      const newItem: CartItem = {
        ...item,
      };
      this.cartState.items.push(newItem);
    }

    this.updateCartState();
    return this.getShoppingCart();
  }

  // Read - Get specific item - UPDATED to use menuItemId and sizeId
  getItem(menuItemId: number, sizeId: number): CartItem | undefined {
    return this.cartState.items.find(
      (item) => item.menuItemId === menuItemId && item.sizeId === sizeId,
    );
  }

  // Update item quantity - UPDATED to use menuItemId and sizeId
  updateItemQuantity(
    menuItemId: number,
    sizeId: number,
    quantity: number,
  ): ShoppingCart {
    const item = this.cartState.items.find(
      (cartItem) =>
        cartItem.menuItemId === menuItemId && cartItem.sizeId === sizeId,
    );

    if (item) {
      if (quantity <= 0) {
        return this.removeItem(menuItemId, sizeId);
      }

      item.quantity = quantity;
      this.updateCartState();
    }

    return this.getShoppingCart();
  }

  // Delete item from cart - UPDATED to use menuItemId and sizeId
  removeItem(menuItemId: number, sizeId: number): ShoppingCart {
    this.cartState.items = this.cartState.items.filter(
      (item) => !(item.menuItemId === menuItemId && item.sizeId === sizeId),
    );
    this.updateCartState();
    return this.getShoppingCart();
  }

  // NEW: Get all items for a specific menu item (across all sizes)
  getItemsByMenuItemId(menuItemId: number): CartItem[] {
    return this.cartState.items.filter(
      (item) => item.menuItemId === menuItemId,
    );
  }

  // NEW: Get all items for a specific size (across all menu items)
  getItemsBySizeId(sizeId: number): CartItem[] {
    return this.cartState.items.filter((item) => item.sizeId === sizeId);
  }

  // Clear entire cart
  clearCart(): ShoppingCart {
    this.cartState = this.getEmptyCart();
    this.updateCartState();
    return this.getShoppingCart();
  }

  // 4. Checkout function - UPDATED to include menuItemId and sizeId in checkout request
  checkout(): Observable<any> {
    const checkoutRequest: CheckoutRequest = {
      items: this.cartState.items.map((item) => ({
        menuItemId: item.menuItemId,
        sizeId: item.sizeId,
        size: item.size,
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

    // Emit the new cart state to all subscribers
    this.cartSubject.next({ ...this.cartState });
  }

  private loadCartFromStorage(): ShoppingCart {
    const savedCart = this.localStorageService.getItem<ShoppingCart>(
      this.CART_KEY,
    );
    if (savedCart) {
      // Ensure the loaded cart has proper calculated values
      savedCart.itemCount = this.calculateItemCount(savedCart.items);
      savedCart.total = this.calculateTotal(savedCart.items);

      // Migrate old cart items if needed (backward compatibility)
      const migratedItems = this.migrateCartItems(savedCart.items);
      savedCart.items = migratedItems;

      return savedCart;
    }
    return this.getEmptyCart();
  }

  // Helper method to migrate old cart items to new structure
  private migrateCartItems(items: any[]): CartItem[] {
    return items.map((item) => {
      // If it's an old item with productId, migrate to menuItemId
      if (item.productId && !item.menuItemId) {
        return {
          ...item,
          menuItemId: item.productId,
          sizeId: item.sizeId || 0, // Default sizeId if not present
        };
      }
      return item;
    });
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

  showCart(): void {
    this.cartDisplaySubject.next(true);
  }

  hideCart(): void {
    this.cartDisplaySubject.next(false);
  }

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
    this.cartSubject.next({ ...this.cartState });
  }

  // Optional: Method to sync cart across browser tabs
  initializeCartSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.CART_KEY) {
        this.cartState = this.loadCartFromStorage();
        this.cartSubject.next({ ...this.cartState });
      }
    });
  }
}
