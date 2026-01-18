import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ExcelReportsApi, ExcelReportCatalogItem, ExcelRange } from '../../core/api/excel-reports.api';
import { BranchesApi } from '../../core/api/branches.api';
import { SessionService, BranchLite } from '../../core/session/session.service';

type BranchOpt = { id: number; name: string; isActive?: boolean };

@Component({
  selector: 'app-excel-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatSnackBarModule,
  ],
  templateUrl: './excel-reports.component.html',
  styleUrls: ['./excel-reports.component.scss']
})
export class ExcelReportsComponent implements OnInit {
  loading = false;
  downloadingKey: string | null = null;

  // branch selector
  isAdmin = false;
  branches: BranchOpt[] = [];
  selectedBranchId = 0; // admin: 0=todas, staff: >0

  // range
  range: ExcelRange = 'month';
  from = ''; // YYYY-MM-DD
  to = '';   // YYYY-MM-DD

  catalog: ExcelReportCatalogItem[] = [];

  constructor(
    private api: ExcelReportsApi,
    private branchesApi: BranchesApi,
    private session: SessionService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.session.isAdmin();
    this.loadBranches();
    this.loadCatalog();
  }

  private loadBranches(): void {
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

          // default admin: todas
          this.selectedBranchId = 0;
        },
        error: (e) => {
          console.error(e);
          this.branches = [];
          this.selectedBranchId = 0;
        }
      });

      return;
    }

    // staff: solo permitidas
    const staffBranches: BranchLite[] = this.session.branches();
    this.branches = staffBranches.map(b => ({ id: b.id, name: b.name, isActive: true }));

    const active = this.session.activeBranchId();
    const fallback = this.branches[0]?.id ?? 0;
    this.selectedBranchId = (active && this.branches.some(b => b.id === active)) ? active : fallback;

    if (this.selectedBranchId > 0) this.session.setActiveBranchId(this.selectedBranchId);
  }

  onBranchChange(): void {
    if (!this.isAdmin && this.selectedBranchId > 0) {
      this.session.setActiveBranchId(this.selectedBranchId);
    }
  }

  setRange(v: ExcelRange): void {
    this.range = v;
  }

  private loadCatalog(): void {
    this.loading = true;
    this.api.catalog()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => this.catalog = rows ?? [],
        error: (e) => {
          console.error(e);
          this.catalog = [];
        }
      });
  }

  download(item: ExcelReportCatalogItem): void {
    if (!item?.key) return;

    if (this.range === 'custom') {
      if (!this.from || !this.to) {
        this.snack.open('Selecciona "Desde" y "Hasta".', 'Cerrar', { duration: 2200 });
        return;
      }
    }

    const branchIdParam =
      this.isAdmin
        ? (this.selectedBranchId > 0 ? this.selectedBranchId : null) // admin: 0 = todas
        : (this.selectedBranchId > 0 ? this.selectedBranchId : this.session.activeBranchId());

    this.downloadingKey = item.key;

    this.api.download(item.key, {
      branchId: branchIdParam,
      range: this.range,
      from: this.range === 'custom' ? this.from : null,
      to: this.range === 'custom' ? this.to : null,
      includeInactive: false
    })
    .pipe(finalize(() => (this.downloadingKey = null)))
    .subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // nombre sugerido
        const safeTitle = (item.title || item.key).replace(/[^\w\-]+/g, '_');
        const branchLabel = this.branchLabel().replace(/[^\w\-]+/g, '_');
        const suffix =
          this.range === 'custom'
            ? `${this.from}_to_${this.to}`
            : this.range;

        a.download = `${safeTitle}_${branchLabel}_${suffix}.csv`;
        a.click();

        window.URL.revokeObjectURL(url);
      },
      error: (e) => {
        console.error(e);
        this.snack.open(this.errText(e), 'Cerrar', { duration: 2800 });
      }
    });
  }

  branchLabel(): string {
    if (this.isAdmin) {
      if (this.selectedBranchId === 0) return 'Todas';
      return this.branches.find(b => b.id === this.selectedBranchId)?.name || 'Sucursal';
    }
    return this.branches.find(b => b.id === this.selectedBranchId)?.name
      || this.session.primaryBranchName()
      || 'Sucursal';
  }

  private errText(e: any): string {
    const x = e?.error;
    if (!x) return 'Error';

    if (typeof x === 'string') return x;
    if (typeof x === 'object') {
      if (x.message) return String(x.message);
      if (x.title) return String(x.title);
      return JSON.stringify(x);
    }
    return String(x);
  }
  rangeLabel(): string {
  switch (this.range) {
    case 'month': return 'Mes actual';
    case 'prev-month': return 'Mes anterior';
    case 'quin1': return 'Quincena 1';
    case 'quin2': return 'Quincena 2';
    case 'custom': return 'Personalizado';
  }
}

}
