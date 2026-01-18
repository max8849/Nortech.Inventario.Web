import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BranchesApi, BranchRow } from '../../core/api/branches.api';

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './branches-list.component.html',
  styleUrls: ['./branches-list.component.scss']
})
export class BranchesListComponent implements OnInit {
  loading = false;
  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  q = new FormControl<string>('', { nonNullable: true });
  showActiveOnly = new FormControl<boolean>(true, { nonNullable: true });

  rows: BranchRow[] = [];
  filtered: BranchRow[] = [];

  displayedColumns: string[] = ['name', 'isActive', 'actions'];

  constructor(
    private api: BranchesApi,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.router.navigateByUrl('/home');
      return;
    }

    this.q.valueChanges.subscribe(() => this.applyFilter());
    this.showActiveOnly.valueChanges.subscribe(() => this.load());

    this.load();
  }

  load(): void {
    this.loading = true;

    const active = this.showActiveOnly.value;

    this.api.list(active)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.rows = data ?? [];
          this.applyFilter();
        },
        error: (err) => {
          console.error(err);
          this.rows = [];
          this.filtered = [];
          this.snack.open('No se pudieron cargar sucursales', 'Cerrar', { duration: 2500 });
        }
      });
  }

  applyFilter(): void {
    const term = (this.q.value || '').trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.rows];
      return;
    }

    this.filtered = this.rows.filter(b =>
      (b.name || '').toLowerCase().includes(term)
    );
  }

  goNew(): void {
    this.router.navigateByUrl('/branches/new');
  }

  edit(b: BranchRow): void {
    this.router.navigateByUrl(`/branches/${b.id}/edit`);
  }

  toggleActive(b: BranchRow): void {
    this.loading = true;
    this.api.setActive(b.id, !b.isActive)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snack.open('Sucursal actualizada', 'OK', { duration: 1200 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudo actualizar', 'Cerrar', { duration: 2500 });
        }
      });
  }
}
