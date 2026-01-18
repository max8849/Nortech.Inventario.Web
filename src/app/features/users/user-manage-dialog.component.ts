import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize } from 'rxjs/operators';

import { UsersApi, UserRow } from '../../core/api/users.api';
import { BranchesApi } from '../../core/api/branches.api';

type BranchOpt = { id: number; name: string; isActive?: boolean };

@Component({
  selector: 'app-user-manage-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatDialogModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-manage-dialog.component.html',
  styleUrls: ['./user-manage-dialog.component.scss'],
})
export class UserManageDialogComponent implements OnInit {
  user: UserRow;

  branches: BranchOpt[] = [];
  loadingBranches = false;

  selected = new Set<number>();
  savingBranches = false;

  newPass = '';
  savingPassword = false;

  // ✅ para que la pantalla de lista recargue solo si hubo cambios
  changed = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: { user: UserRow },
    private ref: MatDialogRef<UserManageDialogComponent>,
    private usersApi: UsersApi,
    private branchesApi: BranchesApi,
    private snack: MatSnackBar
  ) {
    this.user = data.user;
  }

  ngOnInit(): void {
    // inicializa selección con lo que trae el backend
    (this.user.branchIds || []).forEach(id => this.selected.add(Number(id)));
    // siempre incluir principal
    if (this.user.branchId > 0) this.selected.add(Number(this.user.branchId));

    this.loadBranches();
  }

  private loadBranches(): void {
    this.loadingBranches = true;

    this.branchesApi.list()
      .pipe(finalize(() => (this.loadingBranches = false)))
      .subscribe({
        next: (bs: any[]) => {
          this.branches = (bs || [])
            .map((x: any) => ({
              id: Number(x.id ?? x.Id ?? 0),
              name: String(x.name ?? x.Name ?? ''),
              isActive: (x.isActive ?? x.IsActive) !== false
            }))
            .filter((b: BranchOpt) => b.id > 0 && !!b.isActive);
        },
        error: (e: any) => {
          console.error(e);
          this.branches = [];
          this.snack.open(this.errText(e) || 'No se pudieron cargar sucursales', 'Cerrar', { duration: 3000 });
        }
      });
  }

  isPrimary(branchId: number): boolean {
    return Number(branchId) === Number(this.user.branchId);
  }

  isChecked(branchId: number): boolean {
    return this.selected.has(Number(branchId));
  }

  toggleBranch(branchId: number, checked: boolean): void {
    const id = Number(branchId);
    if (this.isPrimary(id)) return;

    if (checked) this.selected.add(id);
    else this.selected.delete(id);
  }

  saveBranches(): void {
    // uniq + >0
    const unique = Array.from(new Set(Array.from(this.selected.values()).filter(x => Number(x) > 0)));

    // siempre incluir principal
    if (this.user.branchId > 0 && !unique.includes(this.user.branchId)) {
      unique.unshift(this.user.branchId);
    }

    if (unique.length === 0) {
      this.snack.open('Debes dejar al menos 1 sucursal', 'Cerrar', { duration: 2000 });
      return;
    }

    this.savingBranches = true;

    this.usersApi.setBranches(this.user.id, unique)
      .pipe(finalize(() => (this.savingBranches = false)))
      .subscribe({
        next: () => {
          this.user.branchIds = unique;
          this.changed = true;
          this.snack.open('Sucursales actualizadas', 'OK', { duration: 1600 });
        },
        error: (e: any) => {
          console.error(e);
          this.snack.open(this.errText(e), 'Cerrar', { duration: 3000 });
        }
      });
  }

  resetPassword(): void {
    const p = (this.newPass || '').trim();
    if (p.length < 6) {
      this.snack.open('Password mínimo 6 caracteres', 'Cerrar', { duration: 2000 });
      return;
    }

    this.savingPassword = true;

    this.usersApi.resetPassword(this.user.id, p)
      .pipe(finalize(() => (this.savingPassword = false)))
      .subscribe({
        next: () => {
          this.newPass = '';
          this.changed = true;
          this.snack.open('Contraseña actualizada', 'OK', { duration: 1600 });
        },
        error: (e: any) => {
          console.error(e);
          // ✅ usa el mismo formato de error que branches
          this.snack.open(this.errText(e), 'Cerrar', { duration: 3000 });
        }
      });
  }

  close(): void {
    // ✅ regresa si hubo cambios reales
    this.ref.close(this.changed);
  }

  private errText(e: any): string {
    const x = e?.error ?? e;

    if (!x) return 'Error';

    if (typeof x === 'string') return x;

    if (typeof x === 'object') {
      if (x.message) return String(x.message);
      if (x.title) return String(x.title);

      // ASP.NET a veces manda { errors: { Field: ["msg"] } }
      const errs = (x as any).errors;
      if (errs && typeof errs === 'object') {
        try {
          const firstKey = Object.keys(errs)[0];
          const firstVal = errs[firstKey];
          if (Array.isArray(firstVal) && firstVal.length) return String(firstVal[0]);
          return `${firstKey}: ${JSON.stringify(firstVal)}`;
        } catch {}
      }

      try { return JSON.stringify(x); } catch {}
    }

    return String(x);
  }
}
