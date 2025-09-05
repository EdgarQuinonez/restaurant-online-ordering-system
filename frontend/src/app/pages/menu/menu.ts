import { Component, inject } from '@angular/core';
import { MenuService } from '@services/menu.service';
@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private menuService = inject(MenuService);
  ngOnInit() {
    console.log(this.menuService.getMenuItems());
  }
}
