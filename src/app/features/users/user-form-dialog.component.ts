import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { finalize } from 'rxjs/operators';
import { UsersApi, UserCreateDto, UserRole } from '../../core/api/users.api';
import { BranchesApi, BranchRow } from '../../core/api/branches.api';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.scss']
})
export class UserFormDialogComponent implements OnInit {
  saving = false;
  loadingBranches = false;

  branches: BranchRow[] = [];

  model: UserCreateDto = {
    username: '',
    fullName: '',
    role: 'Staff',
    password: '',
    branchId: 0 ,
    branchIds: [] 

  };

  constructor(
    private api: UsersApi,
    private branchesApi: BranchesApi,
    private ref: MatDialogRef<UserFormDialogComponent>
  ) {}

  ngOnInit(): void {
    this.loadBranches();
  }

private loadBranches(): void {
  this.loadingBranches = true;

  this.branchesApi.list()
    .pipe(finalize(() => (this.loadingBranches = false)))
    .subscribe({
      next: (rows) => {
        this.branches = (rows || []).filter(x => x.isActive);

        const matriz = this.branches.find(b => b.name.toLowerCase() === 'matriz');
        this.model.branchId = matriz?.id ?? (this.branches[0]?.id ?? 0);

        // ✅ por defecto: acceso incluye principal
        this.model.branchIds = this.model.branchId ? [this.model.branchId] : [];
      },
      error: (err) => {
        console.error('Error cargando sucursales', err);
        this.branches = [];
        this.model.branchId = 0;
        this.model.branchIds = [];
      }
    });
}

  cancel(): void {
    this.ref.close(false);
  }

save(): void {
  if (!this.model.username.trim() || !this.model.fullName.trim() || !this.model.password.trim()) return;
  if (!this.model.branchId || this.model.branchId <= 0) return;

  // ✅ regla: siempre incluir principal
  this.syncBranchIdsFromMain();

  if (!this.model.branchIds || this.model.branchIds.length === 0)
    this.model.branchIds = [this.model.branchId];

  this.saving = true;
  this.api.create(this.model)
    .pipe(finalize(() => (this.saving = false)))
    .subscribe({
      next: () => this.ref.close(true),
      error: (err) => console.error(err)
    });
}

  roleLabel(r: UserRole): string {
    return r === 'Admin' ? 'Admin' : 'Operador';
  }

  // ✅ asegura que branchIds siempre incluya la principal
syncBranchIdsFromMain(): void {
  const main = this.model.branchId;
  if (!main || main <= 0) return;

  const set = new Set<number>(this.model.branchIds || []);
  set.add(main);
  this.model.branchIds = Array.from(set);
}
}
