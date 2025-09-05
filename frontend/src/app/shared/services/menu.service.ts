import { Injectable } from '@angular/core';
import mockUpMenuItems from './mockup-menu-items.json';
@Injectable({
  providedIn: 'root',
})
export class MenuService {
  getMenuItems() {
    return mockUpMenuItems;
  }
}
