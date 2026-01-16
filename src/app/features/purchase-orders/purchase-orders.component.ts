import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { finalize } from 'rxjs/operators';

import { PurchaseOrdersApi, PurchaseOrderListRow } from '../../core/api/purchase-orders.api';
import { BranchesApi } from '../../core/api/branches.api';

// ✅ nuevo
import { SectionsApi, SectionRow } from '../../core/api/sections.api';

type BranchOpt = { id: number; name: string; isActive: boolean };

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.scss']
})
export class PurchaseOrdersComponent implements OnInit {
  loading = false;

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  // filtros admin
  branches: BranchOpt[] = [];
  selectedBranchId = 0;
  selectedStatus = 0;

  rows: PurchaseOrderListRow[] = [];

  // ✅ catálogo secciones (solo mostrar)
  sections: SectionRow[] = [];

  displayedColumns = this.isAdmin
    ? ['id', 'branch', 'status', 'created', 'items', 'note', 'actions']
    : ['id', 'status', 'created', 'items', 'note', 'actions'];

  constructor(
    private api: PurchaseOrdersApi,
    private branchesApi: BranchesApi,
    private sectionsApi: SectionsApi, // ✅ nuevo
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.isAdmin) {
      this.branchesApi.list().subscribe({
        next: (bs: any[]) => {
          this.branches = bs
            .map(x => ({ id: x.id ?? x.Id, name: x.name ?? x.Name, isActive: x.isActive ?? x.IsActive }))
            .filter(b => b.isActive);
        },
        error: (e) => console.error('No se pudieron cargar sucursales', e)
      });

      // ✅ cargar secciones activas (catálogo)
      this.sectionsApi.list(false).subscribe({
        next: (ss) => {
          this.sections = (ss || []).filter(s => s.isActive);
        },
        error: (e) => {
          console.error('No se pudieron cargar secciones', e);
          this.sections = [];
        }
      });
    }

    this.load();
  }

  open(id: number) {
    this.router.navigateByUrl(`/purchase-orders/${id}`);
  }

  load(): void {
    this.loading = true;

    const req$ = this.isAdmin
      ? this.api.list({
          status: this.selectedStatus || undefined,
          branchId: this.selectedBranchId || undefined
        })
      : this.api.mine();

    req$
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => (this.rows = data),
        error: (err) => console.error(err)
      });
  }

  statusLabel(s: any): string {
    if (typeof s === 'number') {
      if (s === 1) return 'PENDIENTE';
      if (s === 2) return 'RECIBIDA';
      if (s === 3) return 'CANCELADA';
      return String(s);
    }
    const v = String(s || '').toLowerCase();
    if (v.includes('pending')) return 'PENDIENTE';
    if (v.includes('received')) return 'RECIBIDA';
    if (v.includes('cancel')) return 'CANCELADA';
    return String(s);
  }

  shortDate(iso: string): string {
    if (!iso) return '';
    return iso.slice(0, 10);
  }

  goCreate(): void {
    this.router.navigateByUrl('/purchase-orders/create');
  }
  formatDateTime(isoUtc: string): string {
  if (!isoUtc) return '';

  const d = new Date(isoUtc); // "Z" => UTC, Date lo convierte a local automáticamente
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',   // ej: 16 ene 2026
    timeStyle: 'short',    // ej: 3:26 p. m.
  }).format(d);
}

}
