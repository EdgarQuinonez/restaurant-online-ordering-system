import { Component, input, signal, computed, inject } from '@angular/core';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { MenuItem as MenuItemInterface } from '@core/menu/menu.service.interface';
import { CartItem } from '@core/shopping-cart/shopping-cart.interface';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.html',
})
export class MenuItem {
  private shoppingCartService = inject(ShoppingCartService);

  // Input signals - updated to use MenuItem interface
  menuItem = input.required<MenuItemInterface>();

  // Computed properties from menuItem input
  productId = computed(() => this.menuItem().id);
  name = computed(() => this.menuItem().name);
  src = computed(() => this.menuItem().imgSrc);
  alt = computed(() => this.menuItem().imgAlt);
  category = computed(() => this.menuItem().category);
  type = computed(() => this.menuItem().type);
  sizes = computed(() => this.menuItem().sizes);

  // Internal state
  selectedSizeId = signal<number | null>(null);
  itemQuantity = signal<number>(0);

  // Computed properties
  sortedSizes = computed(() => {
    const sizes = this.sizes();
    return sizes.slice().sort((a, b) => a.order - b.order);
  });

  selectedSize = computed(() => {
    const sortedSizes = this.sortedSizes();
    const selectedId = this.selectedSizeId();
    return (
      sortedSizes.find((size) => size.id === selectedId) ||
      sortedSizes[0] ||
      null
    );
  });

  selectedSizeDescription = computed(() => {
    return this.selectedSize()?.description || '';
  });

  formattedPrice = computed(() => {
    const price = this.selectedSize()?.price;
    if (price !== undefined) {
      return `$${price}`;
    }
    return '';
  });

  ngOnInit() {
    // Auto-select first size by default (after sorting)
    const sortedSizes = this.sortedSizes();
    if (sortedSizes && sortedSizes.length > 0) {
      this.selectedSizeId.set(sortedSizes[0].id);
    }
  }

  selectSize(sizeId: number): void {
    this.selectedSizeId.set(sizeId);
  }

  // 1. Add menu item to cart based on productId and size
  addToCart(): void {
    const selectedSize = this.selectedSize();
    if (!selectedSize) return;

    const cartItem: CartItem = {
      productId: this.productId(),
      size: selectedSize.name,
      name: this.name(),
      price: parseFloat(selectedSize.price), // Convert string price to number
      quantity: 1,
      imageUrl: this.src(),
    };

    this.shoppingCartService.addItem(cartItem);
    this.itemQuantity.set(1);
  }

  // 3. Update menu item quantity in cart based on productId and size
  updateQuantity(quantity: number): void {
    const selectedSize = this.selectedSize();
    if (!selectedSize) return;

    if (
      this.shoppingCartService.getItem(this.productId(), this.selectedSize.name)
    ) {
      this.shoppingCartService.updateItemQuantity(
        this.productId(),
        selectedSize.name,
        quantity,
      );

      this.itemQuantity.set(quantity);
    } else {
      this.addToCart();
    }
  }

  // Convenience methods for common operations
  incrementQuantity(): void {
    const cartItem = this.shoppingCartService.getItem(
      this.productId(),
      this.selectedSize.name,
    );

    if (cartItem) {
      const newQuantity = cartItem.quantity + 1;
      this.updateQuantity(newQuantity);
    } else {
      this.addToCart();
    }
  }

  decrementQuantity(): void {
    const cartItem = this.shoppingCartService.getItem(
      this.productId(),
      this.selectedSize.name,
    );

    if (cartItem) {
      const newQuantity = cartItem.quantity - 1;
      this.updateQuantity(newQuantity);
    } else {
      this.addToCart();
    }
  }
}
