import { Component, inject, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ShoppingCartService } from './shopping-cart.service';
import { CartItem } from './shopping-cart.interface';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DrawerModule } from 'primeng/drawer';
import { Drawer } from 'primeng/drawer';
import { CartItem as CartItemComponent } from '@core/shopping-cart/cart-item/cart-item';

@Component({
  selector: 'app-shopping-cart',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ButtonModule,
    BadgeModule,
    DrawerModule,
    CartItemComponent,
    RouterLink,
  ],
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

  showCart() {
    this.cartVisible = true;
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}
