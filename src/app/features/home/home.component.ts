import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

type Role = 'Admin' | 'Staff';

type Tile = {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  roles: Role[]; // ✅ quién lo puede ver
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

  constructor(private router: Router) {}

  private allTiles: Tile[] = [
    {
      title: 'Inventario',
      subtitle: 'Productos, existencias y alertas',
      icon: 'inventory_2',
      route: '/stock',
      roles: ['Admin', 'Staff']
    },
    {
      title: 'Entradas / Salidas',
      subtitle: 'Registrar movimiento rápido',
      icon: 'swap_horiz',
      route: '/movements/movement-quick',
      roles: ['Admin', 'Staff']
    },
    {
      title: 'Usuarios',
      subtitle: 'Accesos por sucursal y roles',
      icon: 'group',
      route: '/users',
      roles: ['Admin']
    },
    {
      title: 'Reportes',
      subtitle: 'Existencias, bajo stock, kardex',
      icon: 'bar_chart',
      route: '/reports',
      roles: ['Admin']
    },
    {
      title: 'Informes',
      subtitle: 'Exportar y compartir',
      icon: 'description',
      route: '/exports',
      roles: ['Admin']
    },
  {
    title: 'Cerrar sesión',
    subtitle: 'Salir del portal',
    icon: 'logout',
    route: '/login',
    roles: ['Admin', 'Staff'],
    
  },
  {
  title: 'Órdenes de compra',
  subtitle: 'Crear y recibir órdenes por sucursal',
  icon: 'assignment',
  route: '/purchase-orders',
  roles: ['Admin', 'Staff']
},

  ];

  // ✅ lo que se muestra depende del rol
  get tiles(): Tile[] {
    return this.allTiles.filter(t => t.roles.includes(this.role));
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
    this.router.navigateByUrl(t.route);
  }
}
