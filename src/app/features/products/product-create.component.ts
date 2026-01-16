import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize } from 'rxjs/operators';

import { ProductsApi, ProductCreateDto } from '../../core/api/products.api';
import { BranchesApi } from '../../core/api/branches.api';

type BranchOpt = { id: number; name: string; isActive: boolean };

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './product-create.component.html',
  styleUrls: ['./product-create.component.scss']
})
export class ProductCreateComponent implements OnInit {
  saving = false;

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');
  myBranchId = Number(localStorage.getItem('branchId') || 0);

  branches: BranchOpt[] = [];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private productsApi: ProductsApi,
    private branchesApi: BranchesApi,
    private snack: MatSnackBar,
    private router: Router
  ) {
this.form = this.fb.group({
  sku: ['' , [Validators.required, Validators.minLength(2)]],
  name: ['', [Validators.required, Validators.minLength(2)]],
  unit: ['pz', [Validators.required]],
  minStock: [5, [Validators.required, Validators.min(0)]], 
  cost: [0, [Validators.required, Validators.min(0)]],     
  price: [0, [Validators.required, Validators.min(0)]],   
  branchId: [0, [Validators.required, Validators.min(1)]],
  initialQty: [0, [Validators.required, Validators.min(0)]], 

  
});

  }

  ngOnInit(): void {
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
          const defaultId = matriz?.id ?? (this.branches[0]?.id ?? 0);
            if (!this.form.value.sku) {
            this.form.patchValue({ sku: this.generateSku() });
            }

          this.form.patchValue({ branchId: defaultId });
        },
        error: (e) => {
          console.error(e);
          this.snack.open('No se pudieron cargar sucursales', 'Cerrar', { duration: 2500 });
        }
      });
    } else {
      // Staff: su sucursal
      this.form.patchValue({ branchId: this.myBranchId });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.snack.open('Revisa los campos', 'Cerrar', { duration: 2000 });
      return;
    }

    const v = this.form.value as any;

    const dto: ProductCreateDto = {
      sku: (v.sku || '').trim(),
      name: (v.name || '').trim(),
      unit: (v.unit || 'pz').trim(),
      minStock: Number(v.minStock ?? 0),
      cost: Number(v.cost ?? 0),
      price: Number(v.price ?? 0),
      initialQty: Number(v.initialQty ?? 0),

    };

    // Admin manda branchId; Staff puedes mandarlo o no (backend debe ignorarlo en Staff)
    if (this.isAdmin) dto.branchId = Number(v.branchId || 0);

    this.saving = true;
    this.productsApi.create(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Producto creado', 'OK', { duration: 1800 });
          this.router.navigateByUrl('/stock');
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al crear producto', 'Cerrar', { duration: 2500 });
        }
      });
  }

  cancel(): void {
    this.router.navigateByUrl('/stock');
  }
generateSkuPublic(): string {
  return this.generateSku();
}

  private generateSku(): string {
  // 8 dígitos para que se vea “real”
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

}


