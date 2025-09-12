import { Component, inject } from '@angular/core';
import { MenuService } from '@core/menu/menu.service';
import { MenuItem } from '@core/menu/menu.service.interface';
import { Observable, map } from 'rxjs';
import { LucideAngularModule, HamburgerIcon, CoffeeIcon } from 'lucide-angular';

@Component({
  selector: 'app-menu',
  imports: [LucideAngularModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  readonly HamburgerIcon = HamburgerIcon;
  readonly CoffeeIcon = CoffeeIcon;
  readonly types = ['food', 'beverage'];

  private menuService = inject(MenuService);
  private menuItems!: Observable<MenuItem[]>;

  private filteredMenuItems: any;

  ngOnInit() {}

  toggleType(type: 'food' | 'beverage') {}
}
