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

import { finalize } from 'rxjs/operators';
import { UsersApi, UserRow } from '../../core/api/users.api';
import { UserFormDialogComponent } from './user-form-dialog.component';

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
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  loading = false;

  rows: UserRow[] = [];
  filtered: UserRow[] = [];

  q = '';
  displayedColumns = ['username', 'fullName', 'role', 'status', 'actions'];

  constructor(private api: UsersApi, private dialog: MatDialog) {}

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
        error: (err) => console.error(err)
      });
  }

  applyFilter(): void {
    const term = this.q.trim().toLowerCase();
    this.filtered = !term
      ? this.rows
      : this.rows.filter(u =>
          u.username.toLowerCase().includes(term) ||
          u.fullName.toLowerCase().includes(term)
        );
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

  toggleActive(u: UserRow, isActive: boolean): void {
    const prev = u.isActive;
    u.isActive = isActive;

    this.api.setStatus(u.id, isActive).subscribe({
      next: () => {},
      error: (err) => {
        console.error(err);
        u.isActive = prev; // rollback
      }
    });
  }
}
