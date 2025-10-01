import { Component, inject, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ShoppingCartService } from './shopping-cart.service';
import { CartItem } from './shopping-cart.interface';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DrawerModule } from 'primeng/drawer';
import { Drawer } from 'primeng/drawer';

@Component({
  selector: 'app-shopping-cart',
  imports: [CurrencyPipe, DecimalPipe, ButtonModule, BadgeModule, DrawerModule],
  templateUrl: './shopping-cart.html',
  styleUrl: './shopping-cart.css',
})
export class ShoppingCart {
  @ViewChild('drawerRef') drawerRef!: Drawer;

  private shoppingCartService = inject(ShoppingCartService);

  cartVisible = false;
  cartTotal = 0;
  cartItemCount = 0;
  cartItems: CartItem[] = [];

  private cartSubscription?: Subscription;

  ngOnInit() {
    // Subscribe to cart changes
    this.cartSubscription = this.shoppingCartService.cart$.subscribe((cart) => {
      this.cartTotal = cart.total;
      this.cartItemCount = cart.itemCount;
      this.cartItems = cart.items;
    });
  }
  closeCallback(e: any): void {
    this.drawerRef.close(e);
  }

  getItemTotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}
