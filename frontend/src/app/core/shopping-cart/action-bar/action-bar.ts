import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { Subscription } from 'rxjs';
import { Tray } from '../tray/tray';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [CommonModule, ButtonModule, BadgeModule, Tray],
  templateUrl: './action-bar.html',
  styleUrls: ['./action-bar.css'],
})
export class ActionBar {
  private shoppingCart = inject(ShoppingCartService);

  cartVisible = false;
  cartTotal = 0;
  cartItemCount = 0;

  private cartSubscription?: Subscription;

  ngOnInit() {
    // Subscribe to cart changes
    this.cartSubscription = this.shoppingCart.cart$.subscribe((cart) => {
      this.cartTotal = this.cartTotal;
      this.cartItemCount = this.cartItemCount;
    });
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  toggleCart() {
    this.cartVisible = !this.cartVisible;
  }

  closeCart() {
    this.cartVisible = false;
  }
}
