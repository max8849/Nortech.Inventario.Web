import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ProductsApi, ProductUpdateDto } from '../../core/api/products.api';
import { SectionsApi, SectionRow } from '../../core/api/sections.api';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './product-edit.component.html',
  styleUrls: ['./product-edit.component.scss']
})
export class ProductEditComponent implements OnInit {
  saving = false;
  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  id = 0;
  form: FormGroup;

  sections: SectionRow[] = [];
  loadingSections = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: ProductsApi,
    private sectionsApi: SectionsApi,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      sku: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      unit: ['pz', [Validators.required]],
      sectionId: [0, [Validators.required, Validators.min(1)]],
      cost: [0, [Validators.required, Validators.min(0)]],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.router.navigateByUrl('/stock');
      return;
    }

    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (this.id <= 0) {
      this.router.navigateByUrl('/products');
      return;
    }

    this.loadSections();
    this.loadProduct();
  }

  private loadSections(): void {
    this.loadingSections = true;

    // list(false) según tu api: false = incluir inactivos? (ajústalo si es al revés)
    this.sectionsApi.list(false)
      .pipe(finalize(() => (this.loadingSections = false)))
      .subscribe({
        next: (rows) => {
          this.sections = (rows || []).filter(s => s.isActive);
        },
        error: (e) => {
          console.error(e);
          this.sections = [];
          this.snack.open('No se pudieron cargar secciones', 'Cerrar', { duration: 2500 });
        }
      });
  }

  private loadProduct(): void {
    this.api.get(this.id).subscribe({
      next: (p: any) => {
        this.form.patchValue({
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          cost: p.cost ?? 0,
          price: p.price ?? 0,
          sectionId: p.sectionId ?? 0,
        });
      },
      error: () => {
        this.snack.open('No se pudo cargar producto', 'Cerrar', { duration: 2500 });
        this.router.navigateByUrl('/products');
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.snack.open('Revisa los campos', 'Cerrar', { duration: 2000 });
      return;
    }

    const v = this.form.value as any;

    const dto: ProductUpdateDto = {
      sku: (v.sku || '').trim(),
      name: (v.name || '').trim(),
      unit: (v.unit || 'pz').trim(),
      cost: Number(v.cost ?? 0),
      price: Number(v.price ?? 0),
      sectionId: Number(v.sectionId || 0),
    };

    this.saving = true;
    this.api.update(this.id, dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Producto actualizado', 'OK', { duration: 1500 });
          this.router.navigateByUrl('/products');
        },
        error: (e) => {
          console.error(e);
          this.snack.open(e?.error || 'Error al actualizar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  cancel(): void {
    this.router.navigateByUrl('/products');
  }
}
