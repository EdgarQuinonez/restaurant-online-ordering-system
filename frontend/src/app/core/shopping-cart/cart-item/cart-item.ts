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
    // this.itemQuantity = this.item().quantity;

    this.shoppingCartService.cart$.subscribe(() => {
      this.itemQuantity = this.item().quantity; // the idea is to update itemQuantity (local banana binding to display on input number) with updates made on service so it syncs in both menu-item and cart-item
    });
  }

  public updateQuantity(e: InputNumberInputEvent) {
    const newQuantity = e.value;
    if (typeof newQuantity === 'number') {
      this.shoppingCartService.updateItemQuantity(
        this.item().productId,
        this.item().size,
        newQuantity,
      );
    }
  }

  public removeItem() {
    this.shoppingCartService.removeItem(
      this.item().productId,
      this.item().size,
    );
  }

  public getTotal() {
    return this.item().price * this.item().quantity;
  }
}
