import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { PurchaseOrdersApi } from '../../core/api/purchase-orders.api';
import { API_BASE_URL } from '../../core/config/api.config';

type PoItem = {
  id: number;            // itemId
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
};

type EvidenceDto = {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAtUtc: string;
  url: string; // "/uploads/..."
};

type PoDetail = {
  id: number;
  status: any;           // number o string
  branchId: number;
  branchName: string;
  note?: string | null;
  receiveNote?: string | null;
  createdAtUtc: string;
  receivedAtUtc?: string | null;
  items: PoItem[];

  // ✅ OJO: en el HTML que te pasé lo uso como "evidence"
  evidence?: EvidenceDto[];
};

type ReceiveItemDto = { itemId: number; quantityReceived: number };

@Component({
  selector: 'app-purchase-order-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './purchase-order-details.component.html',
  styleUrls: ['./purchase-order-details.component.scss']
})
export class PurchaseOrderDetailsComponent implements OnInit {
  loading = false;
  saving = false;

  // evidencia
  evidenceUploading = false;
  selectedFiles: File[] = [];

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  id = 0;
  po: PoDetail | null = null;

  receiveMode = false;
  receivedMap: Record<number, number> = {};
  receiveNote = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: PurchaseOrdersApi,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (!this.id) {
      this.router.navigateByUrl('/purchase-orders');
      return;
    }
    this.load();
  }

  load(): void {
    this.loading = true;

    this.api.get(this.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: any) => {
          const items = (data.items || data.Items || []).map((x: any) => ({
            id: x.id ?? x.Id,
            productId: x.productId ?? x.ProductId,
            sku: x.sku ?? x.Sku,
            name: x.name ?? x.Name,
            unit: x.unit ?? x.Unit,
            quantityOrdered: Number(x.quantityOrdered ?? x.QuantityOrdered ?? 0),
            quantityReceived: Number(x.quantityReceived ?? x.QuantityReceived ?? 0),
            unitCost: Number(x.unitCost ?? x.UnitCost ?? 0),
          })) as PoItem[];

          const evidence = (data.evidence || data.Evidence || data.evidences || data.Evidences || []).map((e: any) => ({
            id: e.id ?? e.Id,
            fileName: e.fileName ?? e.FileName,
            contentType: e.contentType ?? e.ContentType,
            sizeBytes: Number(e.sizeBytes ?? e.SizeBytes ?? 0),
            uploadedAtUtc: e.uploadedAtUtc ?? e.UploadedAtUtc,
            url: this.apiFileUrl(e.url ?? e.Url)
          })) as EvidenceDto[];

          this.po = {
            id: data.id ?? data.Id,
            status: data.status ?? data.Status,
            branchId: data.branchId ?? data.BranchId,
            branchName: data.branchName ?? data.BranchName,
            note: data.note ?? data.Note,
            receiveNote: data.receiveNote ?? data.ReceiveNote,
            createdAtUtc: data.createdAtUtc ?? data.CreatedAtUtc,
            receivedAtUtc: data.receivedAtUtc ?? data.ReceivedAtUtc,
            items,
            evidence
          };

          // preset: recibido = ordenado (rápido en móvil)
          this.receivedMap = {};
          items.forEach(it => {
            this.receivedMap[it.id] = this.clamp(it.quantityOrdered, 0, 999999);
          });

          this.receiveNote = this.po.receiveNote || '';
          this.receiveMode = false;
        },
        error: (err) => {
          console.error(err);
          this.snack.open('No se pudo cargar el detalle', 'Cerrar', { duration: 2500 });
          this.router.navigateByUrl('/purchase-orders');
        }
      });
  }

  // ===== status helpers =====
  private statusNumber(): number | null {
    const s = this.po?.status;
    if (s == null) return null;
    if (typeof s === 'number') return s;

    const v = String(s).toLowerCase().trim();
    if (v === '1' || v.includes('pending')) return 1;
    if (v === '2' || v.includes('received')) return 2;
    if (v === '3' || v.includes('cancel')) return 3;
    return null;
  }

  isPending(): boolean { return this.statusNumber() === 1; }
  isReceived(): boolean { return this.statusNumber() === 2; }
  isCancelled(): boolean { return this.statusNumber() === 3; }

  statusLabel(): string {
    const n = this.statusNumber();
    if (n === 1) return 'PENDIENTE';
    if (n === 2) return 'RECIBIDA';
    if (n === 3) return 'CANCELADA';
    return String(this.po?.status ?? '');
  }

  formatDateTime(isoUtc?: string | null): string {
    if (!isoUtc) return '';
    const d = new Date(isoUtc); // UTC -> local
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }

  // ===== UI =====
  toggleReceiveMode(): void {
    if (!this.isPending()) return;
    this.receiveMode = !this.receiveMode;
  }

  inc(itemId: number, step = 1): void {
    const v = Number(this.receivedMap[itemId] ?? 0);
    this.receivedMap[itemId] = this.clamp(v + step, 0, 999999);
  }

  dec(itemId: number, step = 1): void {
    const v = Number(this.receivedMap[itemId] ?? 0);
    this.receivedMap[itemId] = this.clamp(v - step, 0, 999999);
  }

  setReceived(itemId: number, value: any): void {
    const n = Number(value ?? 0);
    this.receivedMap[itemId] = this.clamp(isNaN(n) ? 0 : n, 0, 999999);
  }

  setAllReceivedToOrdered(): void {
    if (!this.po) return;
    this.po.items.forEach(it => (this.receivedMap[it.id] = this.clamp(it.quantityOrdered, 0, 999999)));
    this.snack.open('Listo: recibido = ordenado', 'OK', { duration: 1200 });
  }

  setAllReceivedToZero(): void {
    if (!this.po) return;
    this.po.items.forEach(it => (this.receivedMap[it.id] = 0));
    this.snack.open('Listo: recibido = 0', 'OK', { duration: 1200 });
  }

  canReceive(): boolean {
    if (this.saving) return false;
    if (!this.po) return false;
    if (!this.isPending()) return false;
    if (!this.po.items?.length) return false;

    // valida que todos sean números >= 0
    return this.po.items.every(it => Number(this.receivedMap[it.id] ?? 0) >= 0);
  }

  receive(): void {
    if (!this.po || !this.canReceive()) return;

    const items: ReceiveItemDto[] = this.po.items.map(it => ({
      itemId: it.id,
      quantityReceived: Number(this.receivedMap[it.id] ?? 0)
    }));

    const payload = {
      receiveNote: (this.receiveNote || '').trim(),
      items
    };

    this.saving = true;

    // ✅ importante: usar API con responseType 'text' para evitar HttpErrorResponse con status 200
    this.api.receive(this.po.id, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Orden recibida', 'OK', { duration: 1800 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al recibir', 'Cerrar', { duration: 2500 });
        }
      });
  }

  cancel(): void {
    if (!this.isAdmin || !this.po || !this.isPending()) return;

    this.saving = true;
    this.api.cancel(this.po.id)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Orden cancelada', 'OK', { duration: 1600 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudo cancelar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  back(): void {
    this.router.navigateByUrl('/purchase-orders');
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  print(): void {
    if (!this.po) return;
    this.router.navigateByUrl(`/purchase-orders/${this.po.id}/print`);
  }

  // =========================
  // Evidencia
  // =========================
  onEvidenceSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    // limita a 5 archivos
    this.selectedFiles = files.slice(0, 5);

    // limpia el input para poder seleccionar el mismo archivo otra vez
    input.value = '';
    if (this.selectedFiles.length > 0) {
      // si quieres subir inmediato, descomenta:
      // this.uploadEvidence();
    }
  }

  uploadEvidence(): void {
    if (!this.po) return;
    if (this.selectedFiles.length === 0) {
      this.snack.open('Selecciona al menos 1 archivo', 'Cerrar', { duration: 1800 });
      return;
    }

    this.evidenceUploading = true;

    this.api.uploadEvidence(this.po.id, this.selectedFiles)
      .pipe(finalize(() => (this.evidenceUploading = false)))
      .subscribe({
        next: () => {
          this.snack.open('Evidencia subida', 'OK', { duration: 1500 });
          this.selectedFiles = [];
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al subir evidencia', 'Cerrar', { duration: 2500 });
        }
      });
  }

  openEvidence(ev: EvidenceDto): void {
    const url = ev?.url || '';
    if (!url) return;
    window.open(url, '_blank');
  }

  deleteEvidence(ev: EvidenceDto): void {
    if (!this.isAdmin || !this.po) return;

    this.saving = true;
    this.api.deleteEvidence(this.po.id, ev.id)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Evidencia eliminada', 'OK', { duration: 1500 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudo eliminar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  isImage(fileName?: string | null): boolean {
    const f = String(fileName || '').toLowerCase();
    return f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.gif');
  }

  formatBytes(bytes?: number | null): string {
    const b = Number(bytes || 0);
    if (!b) return '0 B';
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  private apiFileUrl(u?: string | null): string {
    if (!u) return '';
    // u suele venir "/uploads/..."
    if (u.startsWith('http')) return u;

    // ✅ usa tu constant del front
    return `${API_BASE_URL}${u}`;
  }
}
