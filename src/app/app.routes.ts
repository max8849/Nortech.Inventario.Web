import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { StockComponent } from './features/reports/stock.component';
import { MovementQuickComponent } from './features/movements/movement-quick.component';
import { ReportsDashboardComponent } from './features/reports/dashboard/reports-dashboard.component';
import { UsersComponent } from './features/users/users.component';

import { SectionsComponent } from './features/sections/sections.component';

import { ProductsListComponent } from './features/product-list/product-list.component';
import { ProductCreateComponent } from './features/products/product-create.component';
import { ProductEditComponent } from './features/product-edit/product-edit.component';

import { PurchaseOrdersComponent } from './features/purchase-orders/purchase-orders.component';
import { PurchaseOrderCreateComponent } from './features/purchase-order-create/purchase-orders-create.component'; 

import { ExcelReportsComponent } from './features/excel-reports/excel-reports.component';


import { PurchaseOrderDetailsComponent } from './features/purchase-order-details/purchase-order-details.component';
import { PurchaseOrderPrintComponent } from './features/purchase-order-print/purchase-order-print.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  { path: 'login', component: LoginComponent },

  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'stock', component: StockComponent, canActivate: [authGuard] },

  { path: 'movements/movement-quick', component: MovementQuickComponent, canActivate: [authGuard] },

  { path: 'sections', component: SectionsComponent, canActivate: [authGuard] },

  { path: 'reports', component: ReportsDashboardComponent, canActivate: [authGuard] },

  { path: 'users', component: UsersComponent, canActivate: [authGuard] },

  // Productos (catálogo)
  { path: 'products', component: ProductsListComponent, canActivate: [authGuard] },
  { path: 'products/new', component: ProductCreateComponent, canActivate: [authGuard] },
  { path: 'products/:id/edit', component: ProductEditComponent, canActivate: [authGuard] },

  // Órdenes de compra
  { path: 'purchase-orders', component: PurchaseOrdersComponent, canActivate: [authGuard] },
  { path: 'purchase-orders/create', component: PurchaseOrderCreateComponent, canActivate: [authGuard] },

  {path: 'excel-reports',component: ExcelReportsComponent, canActivate: [authGuard]},
  { path: 'purchase-orders/:id/print', component: PurchaseOrderPrintComponent, canActivate: [authGuard] },
  { path: 'purchase-orders/:id', component: PurchaseOrderDetailsComponent, canActivate: [authGuard] },


  {
    path: 'branches',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/branches/branches-list.component').then(m => m.BranchesListComponent)
  },
  {
    path: 'branches/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/branches/branch-create.component').then(m => m.BranchCreateComponent)
  },
  {
    path: 'branches/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/branches/branch-edit.component').then(m => m.BranchEditComponent)
  },

  // fallback
  { path: '**', redirectTo: 'home' },
];
