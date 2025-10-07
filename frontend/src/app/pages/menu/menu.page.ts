import { Component } from '@angular/core';
import { Menu } from '@core/menu/menu';
import { ShoppingCart } from '@core/shopping-cart/shopping-cart';

@Component({
  selector: 'app-menu-page',
  imports: [Menu, ShoppingCart],
  templateUrl: './menu.page.html',
  styleUrl: './menu.page.css',
})
export class MenuPage {}
