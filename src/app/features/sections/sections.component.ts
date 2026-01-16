import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { finalize } from 'rxjs/operators';
import { SectionsApi, SectionRow } from '../../core/api/sections.api';
import { SectionFormDialogComponent } from './section-form-dialog.component';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './sections.component.html',
  styleUrls: ['./sections.component.scss']
})
export class SectionsComponent implements OnInit {
  loading = false;

  rows: SectionRow[] = [];
  filtered: SectionRow[] = [];

  q = '';
  includeInactive = false;

  displayedColumns = ['name', 'active', 'actions'];

  constructor(private api: SectionsApi, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list(this.includeInactive)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.rows = data;
          this.applyFilter();
        },
        error: (err) => console.error(err)
      });
  }

  applyFilter(): void {
    const term = this.q.trim().toLowerCase();
    this.filtered = !term
      ? this.rows
      : this.rows.filter(r => r.name.toLowerCase().includes(term));
  }

  openCreate(): void {
    const ref = this.dialog.open(SectionFormDialogComponent, {
      width: '560px',
      data: { mode: 'create' },
        maxWidth: '92vw',
  panelClass: 'nt-dialog'
    });
    ref.afterClosed().subscribe(ok => ok && this.load());
  }

  openEdit(r: SectionRow): void {
    const ref = this.dialog.open(SectionFormDialogComponent, {
      width: '480px',
      data: { mode: 'edit', id: r.id, name: r.name }
    });
    ref.afterClosed().subscribe(ok => ok && this.load());
  }

  toggleActive(r: SectionRow, isActive: boolean): void {
    this.api.setStatus(r.id, { isActive }).subscribe({
      next: () => {
        r.isActive = isActive;
        this.applyFilter();
      },
      error: (err) => {
        console.error(err);
        // revierte UI
        r.isActive = !isActive;
        this.applyFilter();
      }
    });
  }

  onIncludeInactiveChanged(v: boolean): void {
    this.includeInactive = v;
    this.load();
  }
}
