import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PurchaseOrdersApi } from '../../core/api/purchase-orders.api';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

type Role = 'Admin' | 'Staff';
type SectionKey = 'operation' | 'catalogs' | 'account';

type Tile = {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  roles: Role[];
  section: SectionKey;
  badge?: number; // ✅
};


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  private role: Role = ((localStorage.getItem('role') || 'Staff') as Role);
private sub?: Subscription;
pendingCount = 0;

constructor(private router: Router, private poApi: PurchaseOrdersApi) {}
ngOnInit(): void {
  // refresca inmediato y luego cada 30s
  this.sub = interval(30000)
    .pipe(switchMap(() => this.poApi.getPendingCount()))
    .subscribe({
      next: r => (this.pendingCount = Number(r?.count ?? 0)),
      error: e => console.error('pending-count', e)
    });

  // primera carga
  this.poApi.getPendingCount().subscribe({
    next: r => (this.pendingCount = Number(r?.count ?? 0)),
    error: e => console.error('pending-count', e)
  });
}
badgeFor(t: Tile): number | null {
  if (t.route !== '/purchase-orders') return null;
  return this.pendingCount > 0 ? this.pendingCount : null;
}

  private allTiles: Tile[] = [
    // ======================
    // OPERACION
    // ======================
    {
      title: 'Inventario',
      subtitle: 'Productos y existencias',
      icon: 'inventory_2',
      route: '/stock',
      roles: ['Admin', 'Staff'],
      section: 'operation'
    },
    {
      title: 'Entradas / Salidas',
      subtitle: 'Registrar movimiento rápido',
      icon: 'swap_horiz',
      route: '/movements/movement-quick',
      roles: ['Admin', 'Staff'],
      section: 'operation'
    },
    {
      title: 'Órdenes de compra',
      subtitle: 'Crear y recibir por sucursal',
      icon: 'assignment',
      route: '/purchase-orders',
      roles: ['Admin', 'Staff'],
      section: 'operation'
    },
    {
      title: 'Informes',
      subtitle: 'Dashboard y métricas',
      icon: 'analytics',
      route: '/reports',
      roles: ['Admin', 'Staff'],
      section: 'operation'
    },
    {
      title: 'Reportes Excel',
      subtitle: 'Descargas en Excel por rango y sucursal',
      icon: 'file_download',
      route: '/excel-reports',
      roles: ['Admin', 'Staff'],
      section: 'operation'
    },

    

    // ======================
    // CATALOGOS (ADMIN)
    // ======================
    {
      title: 'Productos',
      subtitle: 'Catálogo universal',
      icon: 'inventory',
      route: '/products',
      roles: ['Admin'],
      section: 'catalogs'
    },
    {
      title: 'Secciones',
      subtitle: 'Categorías del inventario',
      icon: 'category',
      route: '/sections',
      roles: ['Admin'],
      section: 'catalogs'
    },
    {
      title: 'Sucursales',
      subtitle: 'Alta y gestión',
      icon: 'store',
      route: '/branches',
      roles: ['Admin'],
      section: 'catalogs'
    },
    {
      title: 'Usuarios',
      subtitle: 'Accesos y roles',
      icon: 'group',
      route: '/users',
      roles: ['Admin'],
      section: 'catalogs'
    },

    // ======================
    // CUENTA
    // ======================
    {
      title: 'Cerrar sesión',
      subtitle: 'Salir del portal',
      icon: 'logout',
      route: '/login',
      roles: ['Admin', 'Staff'],
      section: 'account'
    }
  ];

  private visibleTiles(): Tile[] {
    return this.allTiles.filter(t => t.roles.includes(this.role));
  }

  get operationTiles(): Tile[] {
    return this.visibleTiles().filter(t => t.section === 'operation');
  }

  get catalogTiles(): Tile[] {
    return this.visibleTiles().filter(t => t.section === 'catalogs');
  }

  get accountTiles(): Tile[] {
    return this.visibleTiles().filter(t => t.section === 'account');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('branchId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('role');
    this.router.navigateByUrl('/login');
  }

  open(t: Tile, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (t.route === '/login') {
      this.logout();
      return;
    }

    this.router.navigateByUrl(t.route);
  }
}
