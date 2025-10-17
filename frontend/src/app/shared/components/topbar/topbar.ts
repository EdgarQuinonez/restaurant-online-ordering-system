import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private shoppingCartService = inject(ShoppingCartService);

  cartItemCount!: number;

  ngOnInit() {
    this.shoppingCartService.cart$.subscribe(() => {
      this.cartItemCount = this.shoppingCartService.getCartItemCount();
    });
  }

  onShowCart() {
    this.shoppingCartService.showCart();
  }
}
