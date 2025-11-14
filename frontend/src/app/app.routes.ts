import { Routes } from '@angular/router';
import { MenuPage } from '@pages/menu/menu.page';
import { CheckoutPage } from '@pages/checkout/checkout.page';
import { OrderPage } from '@pages/order/order.page';
import { AdminPage } from '@pages/admin/admin.page';
import { LoginPage } from '@pages/admin/login/login';
import { OrderDetail } from '@core/order/order-detail/order-detail';
import { orderDetailResolver } from '@core/order/order-detail/order-detail-resolver';
import { authGuard } from '@guards/auth-guard';

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
    path: 'order/:id',
    component: OrderDetail,
    resolve: {
      order: orderDetailResolver,
    },
  },
  {
    path: 'admin',
    component: AdminPage,
    title: 'Panel de Administrador',
    canActivate: [authGuard],
  },
  { path: 'admin/login', component: LoginPage },
];
