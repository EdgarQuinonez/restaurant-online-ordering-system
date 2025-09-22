import { signal, computed, inject, Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MenuService } from './menu.service';
import {
  MenuItem as MenuItemInterface,
  Category,
} from './menu.service.interface';
import { Observable, tap, pipe, map, filter, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MenuItem } from './menu-item/menu-item';
@Component({
  selector: 'app-menu',
  imports: [AsyncPipe, MenuItem],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private menuService = inject(MenuService);

  menuItems$!: Observable<MenuItemInterface[]>;
  menuItems: MenuItemInterface[] = [];

  ngOnInit() {
    this.menuItems$ = this.menuService.getMenuItems();
    this.menuItems$.subscribe((items) => (this.menuItems = items));
  }

  types = ['drink', 'food'];
  type = signal<string>('drink');
  category = signal<string>('all');

  // menuItems = toSignal(this.menuItems$, { initialValue: [] });

  filteredMenuItems = computed(() => {
    return this.menuItems.filter((item) => {
      const matchesCategory =
        item.category === 'all' || item.category === this.category();
      const matchesType = item.type === this.type();

      return matchesCategory && matchesType;
    });
  });

  categories = computed(() => {
    const typeItems = this.menuItems.filter(
      (item) => item.type === this.type(),
    );
    const uniqueCategories = [
      ...new Set(typeItems.map((item) => item.category)),
    ];

    // Return with 'all' option first
    return ['all', ...uniqueCategories];
  });

  setType(newType: string): void {
    this.type.set(newType);
    this.category.set('all');
  }
}
