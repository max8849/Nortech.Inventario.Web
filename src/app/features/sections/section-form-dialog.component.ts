import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

import { SectionsApi } from '../../core/api/sections.api';

export type SectionDialogData =
  | { mode: 'create' }
  | { mode: 'edit'; id: number; name: string };

@Component({
  selector: 'app-section-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule, 

  ],
  templateUrl: './section-form-dialog.component.html',
  styleUrls: ['./section-form-dialog.component.scss']
})
export class SectionFormDialogComponent {
  saving = false;
  name = '';

  constructor(
    private api: SectionsApi,
    private ref: MatDialogRef<SectionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SectionDialogData
  ) {
    if (data.mode === 'edit') this.name = data.name;
  }

  cancel(): void {
    this.ref.close(false);
  }

  save(): void {
    const nm = this.name.trim();
    if (nm.length < 2) return;

    this.saving = true;

    const req$ = this.data.mode === 'create'
      ? this.api.create({ name: nm })
      : this.api.update(this.data.id, { name: nm });

    req$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.ref.close(true),
        error: (err) => console.error(err)
      });
  }
}
