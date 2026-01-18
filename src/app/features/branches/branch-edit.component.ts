import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BranchesApi, BranchUpdateDto } from '../../core/api/branches.api';

@Component({
  selector: 'app-branch-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './branch-edit.component.html',
  styleUrls: ['./branch-edit.component.scss']
})
export class BranchEditComponent implements OnInit {
  loading = false;
  saving = false;

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  id = 0;
  isActive = true;

  form: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: BranchesApi,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.router.navigateByUrl('/home');
      return;
    }

    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (this.id <= 0) {
      this.router.navigateByUrl('/branches');
      return;
    }

    this.load();
  }

  load(): void {
    this.loading = true;

    this.api.get(this.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (b: any) => {
          const name = b.name ?? b.Name ?? '';
          const active = b.isActive ?? b.IsActive ?? true;

          this.form.patchValue({ name });
          this.isActive = !!active;
        },
        error: (err) => {
          console.error(err);
          this.snack.open('No se pudo cargar sucursal', 'Cerrar', { duration: 2500 });
          this.router.navigateByUrl('/branches');
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.snack.open('Revisa el nombre', 'Cerrar', { duration: 2000 });
      return;
    }

    const v = this.form.value as any;
    const dto: BranchUpdateDto = {
      name: (v.name || '').trim(),
    };

    if (dto.name.length < 2) {
      this.snack.open('Nombre mínimo 2 caracteres', 'Cerrar', { duration: 2000 });
      return;
    }

    this.saving = true;
    this.api.update(this.id, dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Sucursal actualizada', 'OK', { duration: 1500 });
          this.router.navigateByUrl('/branches');
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al actualizar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  toggleActive(): void {
    this.saving = true;
    this.api.setActive(this.id, !this.isActive)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.isActive = !this.isActive;
          this.snack.open('Estado actualizado', 'OK', { duration: 1200 });
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudo cambiar estado', 'Cerrar', { duration: 2500 });
        }
      });
  }

  cancel(): void {
    this.router.navigateByUrl('/branches');
  }
}
