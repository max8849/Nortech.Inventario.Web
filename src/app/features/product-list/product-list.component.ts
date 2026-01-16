import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select'; // ✅ IMPORTANT

import { ProductsApi, ProductRowDto } from '../../core/api/products.api';
import { SectionsApi, SectionRow } from '../../core/api/sections.api';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,          // ✅ para mat-select / mat-option
    MatSlideToggleModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductsListComponent implements OnInit {
  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  loading = false;

  // data
  rows: ProductRowDto[] = [];
  filtered: ProductRowDto[] = [];

  // filtros
  q = new FormControl<string>('', { nonNullable: true });
  showActiveOnly = new FormControl<boolean>(true, { nonNullable: true });

  sections: SectionRow[] = [];
  sectionId = new FormControl<number>(0, { nonNullable: true }); // 0 = todas

  displayedColumns = ['sku', 'sectionName', 'name', 'unit', 'isActive', 'actions'];

  constructor(
    private api: ProductsApi,
    private sectionsApi: SectionsApi,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.router.navigateByUrl('/stock');
      return;
    }

    this.loadSections();
    this.load();

    // recarga catálogo cuando cambia búsqueda o activos
    this.q.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => this.load());

    this.showActiveOnly.valueChanges.subscribe(() => this.load());

    // ✅ sección solo filtra local (no pega al backend)
    this.sectionId.valueChanges.subscribe(() => this.applyLocalFilter());
  }

  private loadSections(): void {
    // list(false) => solo activas (según tu API de sections)
    this.sectionsApi.list(false).subscribe({
      next: (rows) => {
        // por seguridad, deja solo activas
        this.sections = (rows || []).filter(s => s.isActive);
      },
      error: (e) => {
        console.error(e);
        this.sections = [];
      }
    });
  }

  load(): void {
    this.loading = true;

    this.api.list(this.q.value, this.showActiveOnly.value)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          // data ya viene con sectionId/sectionName según tu backend
          this.rows = data ?? [];
          this.applyLocalFilter();
        },
        error: (e) => {
          console.error(e);
          this.rows = [];
          this.filtered = [];
          this.snack.open('No se pudieron cargar productos', 'Cerrar', { duration: 2500 });
        }
      });
  }

  // ✅ filtro por sección (y por si quieres futuros filtros extra)
  private applyLocalFilter(): void {
    const sid = Number(this.sectionId.value || 0);

    this.filtered = sid <= 0
      ? this.rows
      : this.rows.filter(p => Number(p.sectionId || 0) === sid);
  }

  goNew(): void {
    this.router.navigateByUrl('/products/new');
  }

  edit(row: ProductRowDto): void {
    this.router.navigate(['/products', row.id, 'edit']);
  }

  toggleActive(row: ProductRowDto): void {
    const next = !row.isActive;

    this.api.setActive(row.id, next).subscribe({
      next: () => {
        row.isActive = next;
        this.snack.open(next ? 'Producto activado' : 'Producto desactivado', 'OK', { duration: 1500 });

        // si estás filtrando activos, refresca para quitarlo si lo apagaste
        if (this.showActiveOnly.value && !next) this.load();
        else this.applyLocalFilter();
      },
      error: (e) => {
        console.error(e);
        this.snack.open('No se pudo cambiar el estado', 'Cerrar', { duration: 2500 });
      }
    });
  }
}
