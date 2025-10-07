import { Component, input, signal, computed, inject } from '@angular/core';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { MenuItem as MenuItemInterface } from '@core/menu/menu.service.interface';
import { CartItem } from '@core/shopping-cart/shopping-cart.interface';
import { InputNumberModule, InputNumberInputEvent } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-menu-item',
  imports: [InputNumberModule, FormsModule],
  templateUrl: './menu-item.html',
})
export class MenuItem {
  private shoppingCartService = inject(ShoppingCartService);

  cartItem: CartItem | undefined;
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
  itemQuantity = 0;

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

    // this.cartItem = this.shoppingCartService.getItem(
    //   this.productId(),
    //   this.selectedSize().name,
    // );

    // this.itemQuantity = this.cartItem ? this.cartItem.quantity : 0;
    this.shoppingCartService.cart$.subscribe(() => {
      this.cartItem = this.shoppingCartService.getItem(
        this.productId(),
        this.selectedSize().name,
      );
      this.itemQuantity = this.cartItem ? this.cartItem.quantity : 0; // the idea is to update itemQuantity (local banana binding to display on input number) with updates made on service so it syncs in both menu-item and cart-item
    });
  }

  selectSize(sizeId: number): void {
    this.selectedSizeId.set(sizeId);

    this.cartItem = this.shoppingCartService.getItem(
      this.productId(),
      this.selectedSize().name,
    );

    this.itemQuantity = this.cartItem ? this.cartItem.quantity : 0;
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
  }

  // 3. Update menu item quantity in cart based on productId and size
  public updateQuantity(e: InputNumberInputEvent) {
    this.cartItem = this.shoppingCartService.getItem(
      this.productId(),
      this.selectedSize().name,
    );
    const newQuantity = e.value;

    if (typeof newQuantity === 'number') {
      if (this.cartItem) {
        this.shoppingCartService.updateItemQuantity(
          this.cartItem.productId,
          this.cartItem.size,
          newQuantity,
        );
      } else {
        this.addToCart();
      }
    }
  }
}
