import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';

import { firstValueFrom } from 'rxjs';

import { ProductsApi, ProductRowDto } from '../../core/api/products.api';
import { MovementsApi } from '../../core/api/movements.api';
import { MovementCreate, MovementType } from '../../core/models/movement.model';
import { SessionService, BranchLite } from '../../core/session/session.service';

type SelectedItem = {
  checked: boolean;
  type: MovementType;
  qty: number;
};

@Component({
  selector: 'app-movement-quick',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,

    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatSelectModule
  ],
  templateUrl: './movement-quick.component.html',
  styleUrls: ['./movement-quick.component.scss']
})
export class MovementQuickComponent implements OnInit {
  loading = false;
  saving = false;

  q = '';
  note = '';

  // sucursales disponibles según sesión
  branches: BranchLite[] = [];
  branchId = 0;

  // catálogo (idealmente filtrado por sucursal)
  products: ProductRowDto[] = [];
  filtered: ProductRowDto[] = [];

  // map por productId
  selected: Record<number, SelectedItem> = {};

  constructor(
    private productsApi: ProductsApi,
    private movementsApi: MovementsApi,
    private snack: MatSnackBar,
    private router: Router,
    private session: SessionService
  ) {}

  // helpers para el HTML
  get isAdmin(): boolean {
    return this.session.isAdmin();
  }

  get canChooseBranch(): boolean {
    return this.session.canChooseBranch();
  }

  ngOnInit(): void {
    this.branches = this.session.branches();
    this.branchId = this.session.activeBranchId(); // Admin puede ser 0 ("Todas")
    this.loadProducts();
  }

  onBranchChange(id: number): void {
    this.session.setActiveBranchId(id);

    // reset selección al cambiar sucursal (evitar mezclar)
    this.selected = {};
    this.note = '';
    this.q = '';

    this.branchId = this.session.activeBranchId();
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;

    // Staff => siempre >0
    // Admin => null cuando está en "Todas", >0 cuando elige una sucursal
    const branchParam = this.session.branchIdParam();

    // ⚠️ Ajusta tu ProductsApi.list para aceptar branchId (number | null)
    // Ej: list(q: string, includeInactive: boolean, branchId: number | null)
    this.productsApi.list('', true, branchParam).subscribe({
      next: (data) => {
        this.products = (data ?? []) as ProductRowDto[];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.snack.open('No se pudieron cargar productos', 'Cerrar', { duration: 2500 });
      }
    });
  }

  applyFilter(): void {
    const term = this.q.trim().toLowerCase();
    this.filtered = !term
      ? this.products
      : this.products.filter(p =>
          (p.sku || '').toLowerCase().includes(term) ||
          (p.name || '').toLowerCase().includes(term)
        );
  }

  isChecked(id: number): boolean {
    return !!this.selected[id]?.checked;
  }

  toggleProduct(p: ProductRowDto, checked: boolean): void {
    if (!this.selected[p.id]) {
      this.selected[p.id] = { checked: false, type: 1 as MovementType, qty: 1 };
    }

    this.selected[p.id].checked = checked;

    if (!checked) {
      this.selected[p.id].qty = 1;
      this.selected[p.id].type = 1 as MovementType;
    }
  }

  setType(productId: number, type: MovementType): void {
    if (!this.selected[productId]) {
      this.selected[productId] = { checked: true, type: 1 as MovementType, qty: 1 };
    }
    this.selected[productId].type = type;
  }

  inc(productId: number): void {
    const it = this.selected[productId];
    if (!it) return;
    it.qty = Math.min(999999, (it.qty || 0) + 1);
  }

  dec(productId: number): void {
    const it = this.selected[productId];
    if (!it) return;
    it.qty = Math.max(1, (it.qty || 1) - 1);
  }

  getSelectedCount(): number {
    return Object.values(this.selected).filter(x => x.checked).length;
  }

  async save(): Promise<void> {
    // ✅ Para registrar movimiento NO permitas "Todas"
    const branchToCreate = this.session.activeBranchId();
    if (branchToCreate <= 0) {
      this.snack.open('Selecciona una sucursal para registrar el movimiento', 'Cerrar', { duration: 2300 });
      return;
    }

    const picked = this.products
      .filter(p => this.selected[p.id]?.checked)
      .map(p => ({
        productId: p.id,
        type: this.selected[p.id].type,
        qty: this.selected[p.id].qty
      }));

    if (picked.length === 0) {
      this.snack.open('Selecciona al menos un producto', 'Cerrar', { duration: 2000 });
      return;
    }

    // 1 movimiento = 1 tipo (como tu backend)
    const groupIn = picked.filter(x => x.type === 1);
    const groupOut = picked.filter(x => x.type === 2);

    this.saving = true;

    try {
      const note = this.note?.trim() || null;
      const calls: Promise<any>[] = [];

      if (groupIn.length > 0) {
        const dtoIn: MovementCreate = {
          branchId: branchToCreate,
          type: 1,
          note,
          items: groupIn.map(x => ({
            productId: x.productId,
            quantity: x.qty,
            unitCost: 0
          }))
        };
        calls.push(firstValueFrom(this.movementsApi.create(dtoIn)));
      }

      if (groupOut.length > 0) {
        const dtoOut: MovementCreate = {
          branchId: branchToCreate,
          type: 2,
          note,
          items: groupOut.map(x => ({
            productId: x.productId,
            quantity: x.qty,
            unitCost: null
          }))
        };
        calls.push(firstValueFrom(this.movementsApi.create(dtoOut)));
      }

      await Promise.all(calls);

      this.snack.open('Movimiento(s) guardado(s)', 'OK', { duration: 1800 });
      this.router.navigateByUrl('/stock');
    } catch (err) {
      console.error(err);
      this.snack.open('Error al guardar movimientos', 'Cerrar', { duration: 2500 });
    } finally {
      this.saving = false;
    }
  }
}
