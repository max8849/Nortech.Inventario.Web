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

type BranchOpt = { id: number; name: string; isActive: boolean };

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

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');
  selectedBranchId = 0;

  branches: BranchOpt[] = [];

  displayedColumns: string[] = ['sku', 'name', 'unit', 'stock', 'minStock', 'status'];

  dataSource = new MatTableDataSource<StockRow>([]);

  @ViewChild(MatSort) sort?: MatSort;

  constructor(
    private reports: ReportsApi,
    private branchesApi: BranchesApi
  ) {}

  ngOnInit(): void {
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

    // ✅ sorting: números como números, texto como texto
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'stock':
          return Number(item.stock ?? 0);
        case 'minStock':
          return Number(item.minStock ?? 0);
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

    // ✅ cargar sucursales solo admin (controller es Admin-only)
    if (this.isAdmin) {
      this.branchesApi.list().subscribe({
        next: (bs: any[]) => {
          this.branches = bs
            .map(x => ({
              id: x.id ?? x.Id,
              name: x.name ?? x.Name,
              isActive: x.isActive ?? x.IsActive
            }))
            .filter(b => b.isActive);
        },
        error: (e) => console.error('No se pudieron cargar sucursales', e)
      });
    }

    this.load();
  }

  ngAfterViewInit(): void {
    // si la tabla está detrás de *ngIf, a veces el sort aún no existe
    // lo conectamos aquí y también lo re-conectamos en load() con setTimeout
    if (this.sort) this.dataSource.sort = this.sort;
  }

  private setColumns(): void {
    // Admin + Todas => muestra columna Sucursal
    this.displayedColumns = (this.isAdmin && this.selectedBranchId === 0)
      ? ['branch', 'name', 'stock', 'minStock', 'status']
      : ['name', 'stock', 'minStock', 'status'];
  }

  load(): void {
    this.loading = true;

    const branchId = this.isAdmin ? this.selectedBranchId : undefined;

    this.reports.stock(false, branchId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: StockRow[]) => {
          this.dataSource.data = data;

          // 🔥 importante: si hay *ngIf, el MatSort puede “re-crearse”
          setTimeout(() => {
            if (this.sort) this.dataSource.sort = this.sort;
          });

          this.applyFilter();
          this.setColumns();
        },
        error: (err) => console.error(err)
      });
  }

  onBranchChange(): void {
    this.setColumns();
    this.load();
  }

  applyFilter(): void {
    this.dataSource.filter = (this.q || '').trim().toLowerCase();
  }

  get filtered(): StockRow[] {
    return this.dataSource.filteredData;
  }

  exportExcel(): void {
    const data = this.filtered.map((r: any) => ({
      ...(this.isAdmin ? { Sucursal: r.branchName ?? '' } : {}),
      SKU: r.sku,
      Producto: r.name,
      Unidad: r.unit,
      Stock: r.stock,
      'Stock mínimo': r.minStock,
      Estado: r.isLow ? 'BAJO' : 'OK'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');

    const branchLabel =
      !this.isAdmin
        ? (localStorage.getItem('branchName') || 'Sucursal')
        : this.selectedBranchId === 0
          ? 'Todas'
          : (this.branches.find(b => b.id === this.selectedBranchId)?.name || 'Sucursal');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Stock_${branchLabel}_${date}.xlsx`);
  }
}
