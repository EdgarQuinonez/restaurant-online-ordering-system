import { Routes } from '@angular/router';
import { MenuPage } from '@pages/menu/menu.page';
import { CheckoutPage } from '@pages/checkout/checkout.page';
import { OrderPage } from '@pages/order/order.page';
import { AdminPage } from '@pages/admin/admin.page';
import { Login } from '@pages/admin/login/login';

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
  {
    path: 'admin',
    component: AdminPage,
    title: 'Panel de Administrador',
  },
  { path: 'admin/login', component: Login },
];
