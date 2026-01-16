import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { finalize } from 'rxjs/operators';

import { BranchesApi } from '../../core/api/branches.api';
import { ProductsApi } from '../../core/api/products.api';
import { PurchaseOrdersApi, PurchaseOrderCreateDto } from '../../core/api/purchase-orders.api';

type BranchOpt = { id: number; name: string; isActive: boolean };
type ProductRow = { id: number; sku: string; name: string; unit: string; isActive?: boolean };

type PickedItem = {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  unitCost: number;
};

@Component({
  selector: 'app-purchase-order-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  templateUrl: './purchase-order-create.component.html',
  styleUrls: ['./purchase-order-create.component.scss']
})
export class PurchaseOrderCreateComponent implements OnInit {
  loading = false;
  saving = false;

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');
  myBranchId = Number(localStorage.getItem('branchId') || 0);

  branches: BranchOpt[] = [];
  branchId = 0;

  q = '';
  note = '';

  products: ProductRow[] = [];
  filtered: ProductRow[] = [];

  items: PickedItem[] = [];

  constructor(
    private router: Router,
    private snack: MatSnackBar,
    private branchesApi: BranchesApi,
    private productsApi: ProductsApi,
    private poApi: PurchaseOrdersApi
  ) {}

  ngOnInit(): void {
    // Branch destino
    if (this.isAdmin) {
      this.branchesApi.list().subscribe({
        next: (rows: any[]) => {
          this.branches = rows
            .map(x => ({
              id: x.id ?? x.Id,
              name: x.name ?? x.Name,
              isActive: x.isActive ?? x.IsActive
            }))
            .filter(b => b.isActive);

          const matriz = this.branches.find(b => (b.name || '').toLowerCase() === 'matriz');
          this.branchId = matriz?.id ?? (this.branches[0]?.id ?? 0);
        },
        error: (e) => console.error('No se pudieron cargar sucursales', e)
      });
    } else {
      this.branchId = this.myBranchId;
    }

    this.loadProducts();
  }

  back(): void {
    this.router.navigateByUrl('/purchase-orders');
  }

  loadProducts(): void {
    this.loading = true;

    // tu productsApi.get('', true) ya lo usas en movement-quick
    this.productsApi.get('', true)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: any[]) => {
          // normaliza nombres por si vienen PascalCase
          this.products = (data || []).map(p => ({
            id: p.id ?? p.Id,
            sku: p.sku ?? p.Sku,
            name: p.name ?? p.Name,
            unit: p.unit ?? p.Unit,
            isActive: p.isActive ?? p.IsActive
          }));
          this.applyFilter();
        },
        error: (err) => {
          console.error(err);
          this.snack.open('No se pudieron cargar productos', 'Cerrar', { duration: 2500 });
        }
      });
  }

  applyFilter(): void {
    const term = (this.q || '').trim().toLowerCase();
    this.filtered = !term
      ? this.products
      : this.products.filter(p =>
          (p.sku || '').toLowerCase().includes(term) ||
          (p.name || '').toLowerCase().includes(term)
        );
  }

  isPicked(productId: number): boolean {
    return this.items.some(x => x.productId === productId);
  }

  add(p: ProductRow): void {
    if (this.isPicked(p.id)) return;

    this.items.push({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      quantityOrdered: 1,
      unitCost: 0
    });
  }

  remove(productId: number): void {
    this.items = this.items.filter(x => x.productId !== productId);
  }

  inc(productId: number): void {
    const it = this.items.find(x => x.productId === productId);
    if (!it) return;
    it.quantityOrdered = Math.min(999999, (it.quantityOrdered || 0) + 1);
  }

  dec(productId: number): void {
    const it = this.items.find(x => x.productId === productId);
    if (!it) return;
    it.quantityOrdered = Math.max(1, (it.quantityOrdered || 1) - 1);
  }

  canSave(): boolean {
    if (this.saving) return false;
    if (!this.branchId || this.branchId <= 0) return false;
    if (this.items.length === 0) return false;
    return this.items.every(x => (x.quantityOrdered || 0) > 0);
  }

  // Por ahora: solo arma payload. En el siguiente paso lo conectamos al POST real.
  save(): void {
    if (!this.canSave()) {
      this.snack.open('Completa la sucursal y agrega productos', 'Cerrar', { duration: 2000 });
      return;
    }

    const dto: PurchaseOrderCreateDto = {
      branchId: this.branchId,
      note: (this.note || '').trim(),
      items: this.items.map(x => ({
        productId: x.productId,
        quantityOrdered: Number(x.quantityOrdered || 0),
        unitCost: Number(x.unitCost || 0)
      }))
    };

    // ✅ cuando conectemos backend, descomentas esto:
    this.saving = true;
    this.poApi.create(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          this.snack.open(`Orden creada (#${res.id})`, 'OK', { duration: 1800 });
          this.router.navigateByUrl('/purchase-orders');
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al crear orden', 'Cerrar', { duration: 2500 });
        }
      });

    // Si todavía no quieres pegarle al backend:
    // console.log('DTO OC', dto);
    // this.snack.open('DTO listo (ver consola).', 'OK', { duration: 1500 });
  }
}
