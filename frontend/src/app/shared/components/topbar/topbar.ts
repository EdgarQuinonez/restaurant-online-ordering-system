import { Component, computed, inject, ViewChild, input } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { ShoppingCartService } from '@core/shopping-cart/shopping-cart.service';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, ButtonModule],
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

  showCart(): void {
    this.shoppingCartService.showCart();
  }
}
