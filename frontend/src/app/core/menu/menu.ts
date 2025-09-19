import { signal, computed, inject, Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MenuService } from './menu.service';
import { MenuItem as MenuItemInterface, Category } from './menu.service.interface';
import { Observable, tap, pipe } from 'rxjs';
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
  categories!: Category[];
  filteredMenuItems$!: Observable<MenuItemInterface[]>;

  ngOnInit() {
    this.menuItems$ = this.menuService.getMenuItems().pipe(
      tap(menuItems => {
    const categoryMap = new Map<string, Category>();

    menuItems.forEach(item => {
      const key = `${item.type}-${item.category}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          name: item.category,
          type: item.type
        });
      }
      })
    );
  }


  types = ['drink', 'food'];
  type = signal<string>('drink');
  category = signal<string>('all');

  filteredCategories = computed(() => {
    return this.categories.filter((cat) => cat.type === this.type());
  });

  filteredMenuItems = computed(() => {
    return this.menuItems().filter((item) => {
      const matchesType = item.type === this.type();
      const matchesCategory =
        this.category() === 'all' || item.category === this.category();
      return matchesType && matchesCategory;
    });
  });

  setType(newType: string): void {
    this.type.set(newType);
    this.category.set('all');
  }
}
