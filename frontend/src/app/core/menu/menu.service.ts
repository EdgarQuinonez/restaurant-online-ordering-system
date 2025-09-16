import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MenuItem } from '@core/menu/menu.service.interface';
import { environment } from '@environment';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private http = inject(HttpClient);

  getMenuItems(): Observable<MenuItem[]> {
    const endpoint = `${environment.apiUrl}/menu`;
    return this.http.get<MenuItem[]>(endpoint);
  }
}
