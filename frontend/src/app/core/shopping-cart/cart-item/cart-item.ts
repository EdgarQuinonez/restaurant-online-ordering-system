import { Component, inject, input } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { CartItem as CartItemInterface } from '../shopping-cart.interface';
import { DecimalPipe } from '@angular/common';
import { InputNumberInputEvent, InputNumberModule } from 'primeng/inputnumber';
import { ShoppingCartService } from '../shopping-cart.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-cart-item',
  imports: [DecimalPipe, InputNumberModule, FormsModule, ButtonModule],
  templateUrl: './cart-item.html',
  styleUrl: './cart-item.css',
})
export class CartItem {
  private shoppingCartService = inject(ShoppingCartService);
  item = input.required<CartItemInterface>();

  itemQuantity = 0;

  ngOnInit() {
    // Initialize with current quantity
    this.itemQuantity = this.item().quantity;

    // Subscribe to cart updates to keep local quantity in sync
    this.shoppingCartService.cart$.subscribe(() => {
      const currentItem = this.shoppingCartService.getItem(
        this.item().menuItemId,
        this.item().sizeId,
      );
      if (currentItem) {
        this.itemQuantity = currentItem.quantity;
      }
    });
  }

  public updateQuantity(e: InputNumberInputEvent) {
    const newQuantity = e.value;
    if (typeof newQuantity === 'number') {
      this.shoppingCartService.updateItemQuantity(
        this.item().menuItemId,
        this.item().sizeId,
        newQuantity,
      );
    }
  }

  public removeItem() {
    this.shoppingCartService.removeItem(
      this.item().menuItemId,
      this.item().sizeId,
    );
  }

  public getTotal() {
    return this.item().price * this.item().quantity;
  }
}
