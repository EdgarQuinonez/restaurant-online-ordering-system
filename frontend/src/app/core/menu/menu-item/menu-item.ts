import { Component } from '@angular/core';
import { input } from '@angular/core';
import { MenuItem as MenuItemInterface } from '@core/menu/menu.service.interface';
@Component({
  selector: 'app-menu-item',
  imports: [],
  templateUrl: './menu-item.html',
  styleUrl: './menu-item.css',
})
export class MenuItem {
  category = input.required<MenuItemInterface['category']>();
  sizes = input.required();
  name = input.required();
}
