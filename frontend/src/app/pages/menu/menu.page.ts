import { Component, ViewChild } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { Topbar } from '@components/topbar/topbar';
import { Menu } from '@core/menu/menu';
import { ShoppingCart } from '@core/shopping-cart/shopping-cart';

@Component({
  selector: 'app-menu-page',
  imports: [Menu, ShoppingCart, Topbar],
  templateUrl: './menu.page.html',
  styleUrl: './menu.page.css',
})
export class MenuPage {}
