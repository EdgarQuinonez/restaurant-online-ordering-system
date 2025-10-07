import { Routes } from '@angular/router';
import { MenuPage } from '@pages/menu/menu.page';
import { CheckoutPage } from '@pages/checkout/checkout.page';

export const routes: Routes = [
  {
    path: '',
    component: MenuPage,
    title: 'Café Parralito | Menú',
  },
  {
    path: 'checkout',
    component: CheckoutPage,
    title: 'Completar Pedido',
  },
];
