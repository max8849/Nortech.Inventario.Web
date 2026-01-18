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
import { SessionService, BranchLite } from '../../core/session/session.service';

type BranchOpt = { id: number; name: string; isActive?: boolean };

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

  isAdmin = false;

  branches: BranchOpt[] = [];
  selectedBranchId = 0;
  selectedStatus = 0;

  rows: PurchaseOrderListRow[] = [];

  displayedColumns: string[] = ['id', 'branch', 'status', 'created', 'items', 'note', 'actions'];

  constructor(
    private api: PurchaseOrdersApi,
    private branchesApi: BranchesApi,
    private session: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.session.isAdmin();

    if (this.isAdmin) {
      this.branchesApi.list().subscribe({
        next: (bs: any[]) => {
          this.branches = (bs || [])
            .map((x: any) => ({
              id: x.id ?? x.Id,
              name: x.name ?? x.Name,
              isActive: x.isActive ?? x.IsActive
            }))
            .filter((b: BranchOpt) => !!b.isActive);

          this.selectedBranchId = 0; // todas
          this.load();
        },
        error: (e) => {
          console.error('No se pudieron cargar sucursales', e);
          this.branches = [];
          this.selectedBranchId = 0;
          this.load();
        }
      });
    } else {
      // Staff: sucursales desde sesión
      const staffBranches: BranchLite[] = this.session.branches();
      this.branches = staffBranches.map(b => ({ id: b.id, name: b.name, isActive: true }));

      // default: sucursal activa
      this.selectedBranchId = this.session.activeBranchId() || (this.branches[0]?.id ?? 0);
      if (this.selectedBranchId) this.session.setActiveBranchId(this.selectedBranchId);

      this.load();
    }
  }

  onBranchChange(): void {
    if (!this.isAdmin) this.session.setActiveBranchId(this.selectedBranchId);
    this.load();
  }

  load(): void {
    this.loading = true;

    const status = this.selectedStatus > 0 ? this.selectedStatus : undefined;

    // Admin: 0 => todas => undefined
    const branchId = this.selectedBranchId > 0 ? this.selectedBranchId : undefined;

    const req$ = this.isAdmin
      ? this.api.list({ status, branchId })
      : this.api.mine({ status, branchId: this.selectedBranchId > 0 ? this.selectedBranchId : undefined });

    req$
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => (this.rows = data ?? []),
        error: (err) => console.error(err)
      });
  }

  open(id: number) {
    this.router.navigateByUrl(`/purchase-orders/${id}`);
  }

  goCreate(): void {
    this.router.navigateByUrl('/purchase-orders/create');
  }

  async markInTransit(r: PurchaseOrderListRow) {
    if (r.status !== 1) return;
    this.loading = true;
    this.api.setInTransit(r.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.load(),
        error: (e: any) => console.error(e)
      });
  }

  async confirm(r: PurchaseOrderListRow) {
    if (r.status !== 2) return;
    this.loading = true;
    this.api.confirm(r.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.load(),
        error: (e) => console.error(e)
      });
  }

  statusLabel(s: any): string {
    const n = Number(s);
    if (n === 1) return 'CREADO';
    if (n === 2) return 'EN CAMINO';
    if (n === 3) return 'CONFIRMADO';
    if (n === 4) return 'CANCELADO';
    return String(s);
  }

  statusClass(s: any): 'created' | 'transit' | 'confirmed' | 'cancelled' | 'other' {
    const n = Number(s);
    if (n === 1) return 'created';
    if (n === 2) return 'transit';
    if (n === 3) return 'confirmed';
    if (n === 4) return 'cancelled';
    return 'other';
  }

  formatDateTime(isoUtc: string): string {
    if (!isoUtc) return '';
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }
  
}
