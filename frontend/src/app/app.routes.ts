import { Routes } from '@angular/router';

// Páginas existentes
import { MenuPage } from '@pages/menu/menu.page';
import { CheckoutPage } from '@pages/checkout/checkout.page';
import { OrderPage } from '@pages/order/order.page';
import { AdminPage } from '@pages/admin/admin.page';
import { LoginPage } from '@pages/admin/login/login';
import { OrderDetail } from '@core/order/order-detail/order-detail';
import { orderDetailResolver } from '@core/order/order-detail/order-detail-resolver';
import { authGuard } from '@guards/auth-guard';
import { AdminDashboardComponent } from '@core/admin-dashboard/admin-dashboard';
import { AdminKitchen } from '@core/admin-kitchen/admin-kitchen';

import { HomeComponent } from '@pages/home/home.component';
import { AboutComponent } from '@pages/about/about.component';
import { ContactComponent } from '@pages/contact/contact.component';
import { UbicationComponent } from '@pages/ubication/ubication.component';

export const routes: Routes = [
  // Redirect inicial
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'home',
    component: HomeComponent,
    title: 'Café Parralito | Inicio',
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'Café Parralito | Acerca de Nosotros',
  },
  {
    path: 'contact',
    component: ContactComponent,
    title: 'Café Parralito | Contáctanos',
  },
  {
    path: 'ubication',
    component: UbicationComponent,
    title: 'Café Parralito | Ubicación',
  },

  // Rutas del menú
  {
    path: 'menu',
    component: MenuPage,
    title: 'Café Parralito | Menú',
  },
  {
    path: 'menu/checkout',
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

  // Admin
  {
    path: 'admin',
    component: AdminPage,
    title: 'Panel de Administrador',
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'kitchen', component: AdminKitchen },
    ],
    canActivate: [authGuard],
  },

  {
    path: 'admin/login',
    component: LoginPage,
  },

  // Página no encontrada → Redirige al home
  // {
  //   path: '**',
  //   redirectTo: 'home',
  // }
];
