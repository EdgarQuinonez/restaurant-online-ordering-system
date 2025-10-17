import { Routes } from '@angular/router';
import { MenuPage } from '@pages/menu/menu.page';
import { CheckoutPage } from '@pages/checkout/checkout.page';
import { OrderPage } from '@pages/order/order.page';

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
  {
    path: 'order',
    component: OrderPage,
    title: 'Tus Pedidos',
  },
];
