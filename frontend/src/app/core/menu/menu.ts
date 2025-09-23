import { signal, computed, inject, Component, Signal } from '@angular/core';
import { input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MenuService } from './menu.service';
import { MenuItem as MenuItemInterface } from './menu.service.interface';
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
  categories$!: Observable<string[]>;
  type = signal<string>('drink');
  category = signal<string>('all');

  ngOnInit() {
    this.menuItems$ = this.menuService.getFilteredMenuItems(
      this.type(),
      this.category(),
    );

    this.categories$ = this.menuService.getCategories(this.type());
  }

  setType(newType: string): void {
    this.type.set(newType);
    this.category.set('all');

    this.menuItems$ = this.menuService.getFilteredMenuItems(
      this.type(),
      this.category(),
    );
    // Update categories when type changes
    this.categories$ = this.menuService.getCategories(this.type());
  }

  setCategory(newCategory: string): void {
    this.category.set(newCategory);

    this.menuItems$ = this.menuService.getFilteredMenuItems(
      this.type(),
      this.category(),
    );
  }
}
