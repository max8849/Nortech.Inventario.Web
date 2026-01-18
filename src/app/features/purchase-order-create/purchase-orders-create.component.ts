import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { finalize } from 'rxjs/operators';

import {
  PurchaseOrdersApi,
  PurchaseOrderCreateItemDto,
  PurchaseOrderCreateDto
} from '../../core/api/purchase-orders.api';

import { BranchesApi } from '../../core/api/branches.api';
import { SessionService, BranchLite } from '../../core/session/session.service';

import { ProductsApi, ProductRowDto } from '../../core/api/products.api';

type BranchOpt = { id: number; name: string; isActive?: boolean };

// ViewModel local (UI)
type ItemVm = {
  productId: number;
  name: string;
  unit: string;
  sectionName?: string | null;
  quantityRequested: number;
};

@Component({
  selector: 'app-purchase-orders-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './purchase-orders-create.component.html',
  styleUrls: ['./purchase-orders-create.component.scss']
})
export class PurchaseOrderCreateComponent implements OnInit {
  saving = false;
  loadingProducts = false;
  loadingBranches = false;

  isAdmin = false;

  branches: BranchOpt[] = [];
  branchId = 0;

  note = '';
  filtered: ProductRowDto[] = [];
  products: ProductRowDto[] = [];
  filteredProducts: ProductRowDto[] = [];
  activeTab: 'products' | 'cart' = 'products';

  // mobile helpers
  q = '';
  quickQty = 1;

  items: ItemVm[] = [];

  constructor(
    private api: PurchaseOrdersApi,
    private branchesApi: BranchesApi,
    private productsApi: ProductsApi,
    private session: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.session.isAdmin();
    this.loadBranches();
    this.loadProducts();
  }

  // ======================
  // Branches
  // ======================
  private loadBranches(): void {
    this.loadingBranches = true;

    if (this.isAdmin) {
      this.branchesApi
        .list()
        .pipe(finalize(() => (this.loadingBranches = false)))
        .subscribe({
          next: (bs: any[]) => {
            this.branches = (bs || [])
              .map((x: any) => ({
                id: x.id ?? x.Id,
                name: x.name ?? x.Name,
                isActive: x.isActive ?? x.IsActive
              }))
              .filter((b: BranchOpt) => !!b.isActive);

            if (!this.branches.some(b => b.id === this.branchId)) {
              this.branchId = this.branches[0]?.id ?? 0;
            }
          },
          error: (e: any) => {
            console.error('Error cargando sucursales', e);
            this.branches = [];
            this.branchId = 0;
          }
        });

      return;
    }

    // Staff: desde session
    const staffBranches: BranchLite[] = this.session.branches();
    this.branches = staffBranches.map(b => ({ id: b.id, name: b.name, isActive: true }));

    const active = this.session.activeBranchId();
    const fallback = this.branches[0]?.id ?? 0;
    this.branchId = (active && this.branches.some(b => b.id === active)) ? active : fallback;

    if (this.branchId > 0) this.session.setActiveBranchId(this.branchId);
    this.loadingBranches = false;
  }

  onBranchChange(): void {
    if (!this.isAdmin && this.branchId > 0) {
      this.session.setActiveBranchId(this.branchId);
    }
  }

  // ======================
  // Products
  // ======================
  private loadProducts(): void {
    this.loadingProducts = true;

    this.productsApi
      .list()
      .pipe(finalize(() => (this.loadingProducts = false)))
      .subscribe({
        next: (ps: any[]) => {
          const rows = (ps || []) as any[];

          this.products = rows
            .filter(p => p?.isActive !== false)
            .map((p: any) => ({
              ...p,
              id: p.id ?? p.Id,
              sku: p.sku ?? p.Sku,
              name: p.name ?? p.Name,
              unit: p.unit ?? p.Unit,
              sectionName: p.sectionName ?? p.SectionName,
              isActive: p.isActive ?? p.IsActive
            })) as any;

          this.applyFilter();
        },
        error: (e: any) => {
          console.error('Error cargando productos', e);
          this.products = [];
          this.filteredProducts = [];
        }
      });
  }

applyFilter(): void {
  const term = (this.q || '').trim().toLowerCase();
  this.filtered = !term
    ? this.products
    : this.products.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term)
      );
}

  // ======================
  // Items (fast add)
  // ======================
addQuick(productId: number): void {
  const pid = Number(productId) || 0;
  if (pid <= 0) return;

  const p = this.products.find(x => Number((x as any).id) === pid) as any;
  if (!p) return;

  const existing = this.items.find(x => x.productId === pid);
  if (existing) {
    existing.quantityRequested = Number(existing.quantityRequested || 0) + 1;
    return;
  }

  this.items.unshift({
    productId: pid,
    name: String(p.name ?? ''),
    unit: String(p.unit ?? ''),
    sectionName: (p.sectionName ?? null),
    quantityRequested: 1
  });
}



  inc(productId: number, step = 1): void {
    const it = this.items.find(x => x.productId === productId);
    if (!it) return;
    it.quantityRequested = this.clamp((it.quantityRequested || 1) + step, 1, 999999);
  }

  dec(productId: number, step = 1): void {
    const it = this.items.find(x => x.productId === productId);
    if (!it) return;
    it.quantityRequested = this.clamp((it.quantityRequested || 1) - step, 1, 999999);
  }

  setQty(productId: number, value: any): void {
    const it = this.items.find(x => x.productId === productId);
    if (!it) return;
    const n = Number(value);
    it.quantityRequested = this.clamp(isNaN(n) ? 1 : n, 1, 999999);
  }

  removeItem(productId: number): void {
    this.items = this.items.filter(x => x.productId !== productId);
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  // ======================
  // Save
  // ======================
  save(): void {
    if (this.branchId <= 0) return;
    if (this.items.length === 0) return;

    const cleanItems: PurchaseOrderCreateItemDto[] = this.items
      .map(x => ({
        productId: x.productId,
        quantityOrdered: Number(x.quantityRequested) || 0,
        unitCost: 0
      }))
      .filter(x => x.productId > 0 && x.quantityOrdered > 0);

    if (cleanItems.length === 0) return;

    const dto: PurchaseOrderCreateDto = {
      branchId: this.branchId,
      note: (this.note || '').trim() || null,
      items: cleanItems
    };

    this.saving = true;

    this.api
      .create(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (resp: any) => this.router.navigateByUrl(`/purchase-orders/${resp.id}`),
        error: (e: any) => console.error(e)
      });
  }

  back(): void {
    this.router.navigateByUrl('/purchase-orders');
  }

  
// badge: cantidad ya agregada del producto en el pedido
itemQty(productId: number): number {
  const it = this.items.find(x => x.productId === productId);
  return Number(it?.quantityRequested || 0);
}

// mostrar unidad en el lado derecho (si el item solo guarda name/sku)
productUnit(productId: number): string {
  const p: any = this.products.find(x => Number((x as any).id) === Number(productId));
  return String(p?.unit ?? '');
}

clearAll(): void {
  this.items = [];
}
}
