import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { StockComponent } from './features/reports/stock.component';
import { MovementQuickComponent } from './features/movements/movement-quick.component';
import { ReportsDashboardComponent } from './features/reports/dashboard/reports-dashboard.component';
import { UsersComponent } from './features/users/users.component';
import { ProductCreateComponent } from './features/products/product-create.component';
import { PurchaseOrdersComponent } from './features/purchase-orders/purchase-orders.component';
import { PurchaseOrderCreateComponent } from './features/purchase-order-create/purchase-order-create.component';
import { PurchaseOrderDetailsComponent } from './features/purchase-order-details/purchase-order-details.component';
import { PurchaseOrderPrintComponent } from './features/purchase-order-print/purchase-order-print.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: '', pathMatch: 'full', redirectTo: 'login' },

  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'stock', component: StockComponent, canActivate: [authGuard] },

  { path: 'movements/movement-quick', component: MovementQuickComponent, canActivate: [authGuard] },

  { path: 'reports', component: ReportsDashboardComponent, canActivate: [authGuard] },
  { path: 'users', component: UsersComponent, canActivate: [authGuard] },
  { path: 'products/new', component: ProductCreateComponent, canActivate: [authGuard] },

  { path: 'purchase-orders', component: PurchaseOrdersComponent, canActivate: [authGuard] },
  { path: 'purchase-orders/create', component: PurchaseOrderCreateComponent, canActivate: [authGuard] },
{ path: 'purchase-orders/:id', component: PurchaseOrderDetailsComponent, canActivate: [authGuard] },

{ path: 'purchase-orders/:id/print', component: PurchaseOrderPrintComponent },

];
