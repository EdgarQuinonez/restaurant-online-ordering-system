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
  name = input.required<MenuItemInterface['name']>();
  src = input.required<MenuItemInterface['imgSrc']>();
  alt = input.required<MenuItemInterface['imgAlt']>();
  category = input.required<MenuItemInterface['category']>();
  sizes = input.required<MenuItemInterface['sizes']>();
  type = input.required<MenuItemInterface['type']>();
}
