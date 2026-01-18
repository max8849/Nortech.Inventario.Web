import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { finalize } from 'rxjs/operators';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import * as XLSX from 'xlsx';

import { BranchesApi } from '../../core/api/branches.api';
import { ReportsApi, StockRow } from '../../core/api/reports.api';
import { SessionService, BranchLite } from '../../core/session/session.service'; // ajusta ruta si difiere

type BranchOpt = { id: number; name: string; isActive?: boolean };

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent implements OnInit, AfterViewInit {
  loading = false;
  q = '';

  isAdmin = false;

  // para Admin: 0 = todas
  selectedBranchId = 0;

  branches: BranchOpt[] = [];

displayedColumns: string[] = ['name', 'unit', 'stock', 'status'];
  dataSource = new MatTableDataSource<StockRow>([]);

  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private reports: ReportsApi,
    private branchesApi: BranchesApi,
    private session: SessionService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.session.isAdmin(); // ✅ aquí se llama

    this.setColumns();

    // ✅ filtro: SKU / nombre / sucursal
    this.dataSource.filterPredicate = (r: any, filter: string) => {
      const term = (filter || '').trim().toLowerCase();
      if (!term) return true;

      return (
        (r.sku || '').toLowerCase().includes(term) ||
        (r.name || '').toLowerCase().includes(term) ||
        ((r.branchName || '') as string).toLowerCase().includes(term)
      );
    };

    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'stock':
          return Number(item.stock ?? 0);
        case 'branch':
          return (item.branchName ?? '').toString().toLowerCase();
        case 'sku':
          return (item.sku ?? '').toString().toLowerCase();
        case 'name':
          return (item.name ?? '').toString().toLowerCase();
        case 'unit':
          return (item.unit ?? '').toString().toLowerCase();
        default:
          return (item[property] ?? '').toString().toLowerCase();
      }
    };

    this.loadBranchesThenData();
  }

  ngAfterViewInit(): void {
    if (this.sort) this.dataSource.sort = this.sort;
  }

private setColumns(): void {
  const showBranch = this.isAdmin && this.selectedBranchId === 0;
  this.displayedColumns = showBranch
    ? ['branch', 'name', 'unit', 'stock', 'status']
    : ['name', 'unit', 'stock', 'status'];
}

  private loadBranchesThenData(): void {
    if (this.isAdmin) {
      // Admin: cargar todas (activas)
      this.branchesApi.list().subscribe({
        next: (bs: any[]) => {
          this.branches = (bs || [])
            .map((x: any) => ({
              id: x.id ?? x.Id,
              name: x.name ?? x.Name,
              isActive: x.isActive ?? x.IsActive
            }))
            .filter((b: BranchOpt) => !!b.isActive);

          // default: "Todas"
          this.selectedBranchId = 0;
          this.setColumns();
          this.load();
        },
        error: (e) => {
          console.error('No se pudieron cargar sucursales', e);
          this.branches = [];
          this.selectedBranchId = 0;
          this.setColumns();
          this.load();
        }
      });

      return;
    }

    // Staff: sucursales desde session
    const staffBranches: BranchLite[] = this.session.branches();
    this.branches = staffBranches.map((b: BranchLite) => ({ id: b.id, name: b.name, isActive: true }));

    // default: sucursal activa del session
    this.selectedBranchId = this.session.activeBranchId();
    if (!this.selectedBranchId && this.branches.length > 0) {
      this.selectedBranchId = this.branches[0].id;
      this.session.setActiveBranchId(this.selectedBranchId);
    }

    this.setColumns();
    this.load();
  }

  onBranchChange(): void {
    // Staff: persistir sucursal activa
    if (!this.isAdmin) {
      this.session.setActiveBranchId(this.selectedBranchId);
    }

    this.setColumns();
    this.load();
  }

  load(): void {
    this.loading = true;

    // branchId param para API:
    // Admin => 0 => null (todas); >0 => esa
    // Staff => siempre su branch seleccionada
    const branchIdParam: number | null =
      this.isAdmin ? (this.selectedBranchId > 0 ? this.selectedBranchId : null)
                   : (this.selectedBranchId > 0 ? this.selectedBranchId : this.session.activeBranchId());

    this.reports.stock(false, branchIdParam)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: StockRow[]) => {
          this.dataSource.data = data ?? [];

          setTimeout(() => {
            if (this.sort) this.dataSource.sort = this.sort;
          });

          this.applyFilter();
        },
        error: (err) => console.error(err)
      });
  }

  applyFilter(): void {
    this.dataSource.filter = (this.q || '').trim().toLowerCase();
  }

  get filtered(): StockRow[] {
    return this.dataSource.filteredData;
  }

exportExcel(): void {
  const showBranchCol = this.isAdmin && this.selectedBranchId === 0;

  const data = this.filtered.map((r: any) => ({

    ...(showBranchCol ? { Sucursal: r.branchName ?? '' } : {}),

    // ✅ sin SKU
    Producto: r.name,
    Unidad: r.unit,
    Stock: r.stock,
    Estado: (Number(r.stock ?? 0) <= 0) ? 'SIN STOCK' : 'OK'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock');

  const branchLabel =
    this.isAdmin
      ? (this.selectedBranchId === 0
          ? 'Todas'
          : (this.branches.find(b => b.id === this.selectedBranchId)?.name || 'Sucursal'))
      : (this.branches.find(b => b.id === this.selectedBranchId)?.name
          || this.session.primaryBranchName()
          || 'Sucursal');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Stock_${branchLabel}_${date}.xlsx`);
}
}
