import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, shareReplay } from 'rxjs';
import { environment } from '@environment';
import { MenuItem } from './menu.service.interface';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private http = inject(HttpClient);
  private menuItemsCache$: Observable<MenuItem[]> | null = null;

  getMenuItems(): Observable<MenuItem[]> {
    if (this.menuItemsCache$) {
      return this.menuItemsCache$;
    }

    const endpoint = `${environment.apiUrl}/menu`;
    this.menuItemsCache$ = this.http.get<MenuItem[]>(endpoint).pipe(
      shareReplay(1), // Cache the result and share it with multiple subscribers
    );

    return this.menuItemsCache$;
  }

  getFilteredMenuItems(type: string, category: string): Observable<MenuItem[]> {
    return this.getMenuItems().pipe(
      map((menuItems) =>
        menuItems.filter(
          (item) =>
            item.type === type &&
            (item.category === category || category === 'all'),
        ),
      ),
    );
  }

  getCategories(type: string): Observable<string[]> {
    return this.getMenuItems().pipe(
      map((menuItems) => {
        // First get all items with type and category 'all'
        const allCategoryItems = menuItems.filter((item) => item.type === type);

        // Extract unique categories from these items
        const categories = allCategoryItems
          .map((item) => item.category)
          .filter((category, index, self) => self.indexOf(category) === index);

        return categories;
      }),
    );
  }
}
