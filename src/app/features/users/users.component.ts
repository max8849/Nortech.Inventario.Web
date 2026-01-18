import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize } from 'rxjs/operators';
import { UsersApi, UserRow } from '../../core/api/users.api';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { UserManageDialogComponent } from './user-manage-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatSnackBarModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  loading = false;

  rows: UserRow[] = [];
  filtered: UserRow[] = [];

  q = '';
  displayedColumns = ['user', 'role', 'branches', 'status', 'actions'];

  constructor(
    private api: UsersApi,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    this.api.list()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.rows = data ?? [];
          this.applyFilter();
        },
        error: (err: any) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudieron cargar usuarios', 'Cerrar', { duration: 2500 });
        }
      });
  }

  applyFilter(): void {
    const term = this.q.trim().toLowerCase();

    this.filtered = !term
      ? this.rows
      : this.rows.filter(u => {
          const branchesText =
            (u.branchName || '') + ' ' + (u.branchIds || []).join(',');
          return (
            (u.username || '').toLowerCase().includes(term) ||
            (u.fullName || '').toLowerCase().includes(term) ||
            branchesText.toLowerCase().includes(term) ||
            String(u.id).includes(term)
          );
        });
  }

  openCreate(): void {
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true
    });

    ref.afterClosed().subscribe((created: boolean) => {
      if (created) this.load();
    });
  }

  openManage(u: UserRow): void {
    const ref = this.dialog.open(UserManageDialogComponent, {
      width: '720px',
      maxWidth: '96vw',
      disableClose: false,
      data: { user: { ...u } } // copia para no mutar la tabla
    });

    ref.afterClosed().subscribe((changed: boolean) => {
      if (changed) this.load();
    });
  }

  toggleActive(u: UserRow, isActive: boolean): void {
    const prev = u.isActive;
    u.isActive = isActive;

    this.api.setStatus(u.id, isActive).subscribe({
      next: () => {
        this.snack.open(isActive ? 'Usuario activado' : 'Usuario desactivado', 'OK', { duration: 1400 });
      },
      error: (err: any) => {
        console.error(err);
        u.isActive = prev; // rollback
        this.snack.open(err?.error || 'No se pudo actualizar', 'Cerrar', { duration: 2500 });
      }
    });
  }

  // helpers UI
  roleLabel(u: UserRow): string {
    return u.role === 'Admin' ? 'Admin' : 'Operador';
  }

  branchesLabel(u: UserRow): string {
    const ids = (u.branchIds || []).filter(x => x > 0);
    // muestra solo primeros 3 para no saturar en móvil
    const shown = ids.slice(0, 3).join(', ');
    const more = ids.length > 3 ? ` +${ids.length - 3}` : '';
    return ids.length ? `${shown}${more}` : '';
  }
}
