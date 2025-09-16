import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MenuService } from './menu.service';
import { MenuItem } from './menu.service.interface';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-menu',
  imports: [AsyncPipe],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private menuService = inject(MenuService);

  menuItems$!: Observable<MenuItem[]>;

  ngOnInit() {
    this.menuItems$ = this.menuService.getMenuItems();
  }
}
