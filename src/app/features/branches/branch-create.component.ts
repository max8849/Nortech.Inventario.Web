import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BranchesApi, BranchCreateDto } from '../../core/api/branches.api';

@Component({
  selector: 'app-branch-create',
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
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './branch-create.component.html',
  styleUrls: ['./branch-create.component.scss']
})
export class BranchCreateComponent implements OnInit {
  saving = false;
  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: BranchesApi,
    private snack: MatSnackBar,
    private router: Router
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
  }

  save(): void {
    if (this.form.invalid) {
      this.snack.open('Revisa el nombre', 'Cerrar', { duration: 2000 });
      return;
    }

    const v = this.form.value as any;

    const dto: BranchCreateDto = {
      name: (v.name || '').trim(),
    };

    if (dto.name.length < 2) {
      this.snack.open('Nombre mínimo 2 caracteres', 'Cerrar', { duration: 2000 });
      return;
    }

    this.saving = true;
    this.api.create(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Sucursal creada', 'OK', { duration: 1500 });
          this.router.navigateByUrl('/branches');
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al crear sucursal', 'Cerrar', { duration: 2500 });
        }
      });
  }

  cancel(): void {
    this.router.navigateByUrl('/branches');
  }
}
