import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
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
import { SessionService } from '../../core/session/session.service'; // ajusta ruta si difiere

type PoItem = {
  id: number;
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  quantityShipped: number;   // ✅ nuevo
  quantityReceived: number;
  unitCost: number;
};

type PendingPreview = {
  name: string;
  size: number;
  isImage: boolean;
  url: string;
};

type EvidenceDto = {
  id?: number;
  fileName: string;
  contentType?: string;
  sizeBytes: number;
  uploadedAtUtc: string;
  url: string;
};

type PoDetail = {
  id: number;
  status: any;
  branchId: number;
  branchName: string;
  note?: string | null;
  shipNote?: string | null;     // ✅ opcional (si decides guardarla en back)
  receiveNote?: string | null;
  createdAtUtc: string;
  confirmedAtUtc?: string | null; // ✅ (back usa ReceivedAtUtc como ConfirmedAtUtc)
  items: PoItem[];
  evidence?: EvidenceDto[];
};

type ShipItemDto = { itemId: number; quantityShipped: number };
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
  @ViewChild('evidenceInput') evidenceInput?: ElementRef<HTMLInputElement>;

  loading = false;
  saving = false;

  // evidencia
  evidenceUploading = false;
  selectedFiles: File[] = [];
  pendingPreviews: PendingPreview[] = [];

  id = 0;
  po: PoDetail | null = null;

  // roles
  isAdmin = false;

  // modos
  shipMode = false;      // ✅ admin ajusta enviado
  receiveMode = false;   // ✅ staff ajusta recibido

  // maps
  shippedMap: Record<number, number> = {};
  receivedMap: Record<number, number> = {};

  // notas
  shipNote = '';
  receiveNote = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: PurchaseOrdersApi,
    private snack: MatSnackBar,
    private session: SessionService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.session.isAdmin();

    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (!this.id) {
      this.router.navigateByUrl('/purchase-orders');
      return;
    }
    this.load();
  }

  // ===== Status helpers =====
  private statusNumber(): number | null {
    const s = this.po?.status;
    if (s == null) return null;
    if (typeof s === 'number') return s;

    const v = String(s).toLowerCase().trim();
    if (v === '1' || v.includes('created')) return 1;
    if (v === '2' || v.includes('intransit') || v.includes('transit')) return 2;
    if (v === '3' || v.includes('confirmed')) return 3;
    if (v === '4' || v.includes('cancel')) return 4;
    return null;
  }

  isCreated(): boolean { return this.statusNumber() === 1; }
  isInTransit(): boolean { return this.statusNumber() === 2; }
  isConfirmed(): boolean { return this.statusNumber() === 3; }
  isCancelled(): boolean { return this.statusNumber() === 4; }

  statusLabel(): string {
    const n = this.statusNumber();
    if (n === 1) return 'CREADA';
    if (n === 2) return 'EN CAMINO';
    if (n === 3) return 'CONFIRMADA';
    if (n === 4) return 'CANCELADA';
    return String(this.po?.status ?? '');
  }

  statusClass(): string {
    const n = this.statusNumber();
    if (n === 1) return 'created';
    if (n === 2) return 'transit';
    if (n === 3) return 'confirmed';
    if (n === 4) return 'cancelled';
    return 'unknown';
  }

  formatDateTime(isoUtc?: string | null): string {
    if (!isoUtc) return '';
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }

  // ===== Load =====
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
            quantityShipped: Number(x.quantityShipped ?? x.QuantityShipped ?? 0), // ✅
            quantityReceived: Number(x.quantityReceived ?? x.QuantityReceived ?? 0),
            unitCost: Number(x.unitCost ?? x.UnitCost ?? 0),
          })) as PoItem[];

          const evidence = (data.evidence || data.Evidence || data.evidences || data.Evidences || []).map((e: any) => ({
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
            shipNote: data.shipNote ?? data.ShipNote, // opcional si lo agregas en back
            receiveNote: data.receiveNote ?? data.ReceiveNote,
            createdAtUtc: data.createdAtUtc ?? data.CreatedAtUtc,
            confirmedAtUtc: data.confirmedAtUtc ?? data.ConfirmedAtUtc ?? data.receivedAtUtc ?? data.ReceivedAtUtc,
            items,
            evidence
          };

          // reset modos
          this.shipMode = false;
          this.receiveMode = false;

          // init maps:
          // shipped default = ordered (para admin cuando mande)
          this.shippedMap = {};
          items.forEach(it => {
            const fallback = it.quantityShipped > 0 ? it.quantityShipped : it.quantityOrdered;
            this.shippedMap[it.id] = this.clamp(fallback, 0, 999999);
          });

          // received default = min(shipped, ordered) (para staff al recibir)
          this.receivedMap = {};
          items.forEach(it => {
            const cap = this.capForReceive(it);
            const fallback = it.quantityReceived > 0 ? it.quantityReceived : cap;
            this.receivedMap[it.id] = this.clamp(fallback, 0, 999999);
          });

          this.shipNote = this.po.shipNote || '';
          this.receiveNote = this.po.receiveNote || '';

          // si ya está confirmada, limpia selección evidencia
          if (this.isConfirmed()) this.clearSelected();
        },
        error: (err) => {
          console.error(err);
          this.snack.open('No se pudo cargar el detalle', 'Cerrar', { duration: 2500 });
          this.router.navigateByUrl('/purchase-orders');
        }
      });
  }

  back(): void {
    this.router.navigateByUrl('/purchase-orders');
  }

  print(): void {
    if (!this.po) return;
    this.router.navigateByUrl(`/purchase-orders/${this.po.id}/print`);
  }

  // ===== Admin: Ship =====
  canShip(): boolean {
    if (this.saving) return false;
    if (!this.po) return false;
    if (!this.isAdmin) return false;
    if (!this.isCreated()) return false;
    if (!this.po.items?.length) return false;
    return this.po.items.every(it => Number(this.shippedMap[it.id] ?? 0) >= 0);
  }

  toggleShipMode(): void {
    if (!this.isAdmin || !this.isCreated()) return;
    this.shipMode = !this.shipMode;
    if (this.shipMode) this.receiveMode = false;
  }

  ship(): void {
    if (!this.po || !this.canShip()) return;

    const items: ShipItemDto[] = this.po.items.map(it => ({
      itemId: it.id,
      quantityShipped: this.clamp(Number(this.shippedMap[it.id] ?? 0), 0, 999999)
    }));

    const payload = {
      shipNote: (this.shipNote || '').trim(),
      items
    };

    this.saving = true;
    this.api.ship(this.po.id, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Pedido marcado EN CAMINO', 'OK', { duration: 1600 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudo mandar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  setAllShippedToOrdered(): void {
    if (!this.po) return;
    this.po.items.forEach(it => (this.shippedMap[it.id] = this.clamp(it.quantityOrdered, 0, 999999)));
    this.snack.open('Listo: enviado = ordenado', 'OK', { duration: 1200 });
  }

  setAllShippedToZero(): void {
    if (!this.po) return;
    this.po.items.forEach(it => (this.shippedMap[it.id] = 0));
    this.snack.open('Listo: enviado = 0', 'OK', { duration: 1200 });
  }

  // ===== Staff/Admin: Confirm (receive) =====
  canReceive(): boolean {
    if (this.saving) return false;
    if (!this.po) return false;
    // ✅ Recibir SOLO cuando está EN CAMINO
    if (!this.isInTransit()) return false;
    if (!this.po.items?.length) return false;
    return this.po.items.every(it => Number(this.receivedMap[it.id] ?? 0) >= 0);
  }

  toggleReceiveMode(): void {
    if (!this.isInTransit()) return;
    this.receiveMode = !this.receiveMode;
    if (this.receiveMode) this.shipMode = false;
  }

  receive(): void {
    if (!this.po || !this.canReceive()) return;

    const items: ReceiveItemDto[] = this.po.items.map(it => ({
      itemId: it.id,
      quantityReceived: this.clamp(Number(this.receivedMap[it.id] ?? 0), 0, this.capForReceive(it))
    }));

    const payload = {
      receiveNote: (this.receiveNote || '').trim(),
      items
    };

    this.saving = true;

    // ✅ back ya tiene /confirm y alias /receive; usa el que tengas en tu api
    this.api.confirm(this.po.id, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Pedido CONFIRMADO', 'OK', { duration: 1800 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'Error al confirmar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  setAllReceivedToCap(): void {
    if (!this.po) return;
    this.po.items.forEach(it => (this.receivedMap[it.id] = this.capForReceive(it)));
    this.snack.open('Listo: recibido = enviado', 'OK', { duration: 1200 });
  }

  setAllReceivedToZero(): void {
    if (!this.po) return;
    this.po.items.forEach(it => (this.receivedMap[it.id] = 0));
    this.snack.open('Listo: recibido = 0', 'OK', { duration: 1200 });
  }

  // ===== Cancel =====
  cancel(): void {
    if (!this.isAdmin || !this.po || !this.isCreated()) return;

    this.saving = true;
    this.api.cancel(this.po.id)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.snack.open('Pedido cancelado', 'OK', { duration: 1600 });
          this.load();
        },
        error: (err) => {
          console.error(err);
          this.snack.open(err?.error || 'No se pudo cancelar', 'Cerrar', { duration: 2500 });
        }
      });
  }

  // ===== Counters =====
  inc(map: 'ship'|'recv', itemId: number, step = 1): void {
    const src = map === 'ship' ? this.shippedMap : this.receivedMap;
    const v = Number(src[itemId] ?? 0);
    src[itemId] = this.clamp(v + step, 0, 999999);
    if (map === 'recv' && this.po) {
      // cap visual para recibir
      const it = this.po.items.find(x => x.id === itemId);
      if (it) src[itemId] = this.clamp(src[itemId], 0, this.capForReceive(it));
    }
  }

  dec(map: 'ship'|'recv', itemId: number, step = 1): void {
    const src = map === 'ship' ? this.shippedMap : this.receivedMap;
    const v = Number(src[itemId] ?? 0);
    src[itemId] = this.clamp(v - step, 0, 999999);
  }

  setValue(map: 'ship'|'recv', itemId: number, value: any): void {
    const src = map === 'ship' ? this.shippedMap : this.receivedMap;
    const n = Number(value ?? 0);
    src[itemId] = this.clamp(isNaN(n) ? 0 : n, 0, 999999);

    if (map === 'recv' && this.po) {
      const it = this.po.items.find(x => x.id === itemId);
      if (it) src[itemId] = this.clamp(src[itemId], 0, this.capForReceive(it));
    }
  }

  private capForReceive(it: PoItem): number {
    const shipped = Number(it.quantityShipped ?? 0);
    const ordered = Number(it.quantityOrdered ?? 0);
    // si ya existe shipped, cap = min(ordered, shipped); si no, cap = ordered
    const cap = shipped > 0 ? Math.min(ordered, shipped) : ordered;
    return this.clamp(cap, 0, 999999);
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  // =========================
  // Evidencia (solo Confirmed)
  // =========================
  openEvidencePicker(): void {
    if (!this.isConfirmed()) return;

    if (this.evidenceInput?.nativeElement) {
      this.evidenceInput.nativeElement.value = '';
      this.evidenceInput.nativeElement.click();
    }
  }

  onEvidenceSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    this.selectedFiles = files.slice(0, 5);

    this.pendingPreviews.forEach(p => URL.revokeObjectURL(p.url));
    this.pendingPreviews = this.selectedFiles.map(f => ({
      name: f.name,
      size: f.size,
      isImage: f.type.startsWith('image/'),
      url: URL.createObjectURL(f)
    }));

    input.value = '';
  }

  uploadEvidence(): void {
    if (!this.po) return;
    if (!this.isConfirmed()) return;

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
          this.clearSelected();
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
    this.api.deleteEvidence(this.po.id, ev.fileName)
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
    if (u.startsWith('http')) return u;
    return `${API_BASE_URL}${u}`;
  }

  clearSelected(): void {
    this.pendingPreviews.forEach(p => URL.revokeObjectURL(p.url));
    this.pendingPreviews = [];
    this.selectedFiles = [];
  }
}
