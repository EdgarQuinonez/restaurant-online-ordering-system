import { Injectable } from '@angular/core';
import { MenuItem } from '@core/menu/menu.service.interface';
import mockUpMenuItems from './mockup-menu-items.json';
@Injectable({
  providedIn: 'root',
})
export class MenuService {
  getMenuItems(): MenuItem[] {
    return mockUpMenuItems.menuItems as MenuItem[];
  }
}
