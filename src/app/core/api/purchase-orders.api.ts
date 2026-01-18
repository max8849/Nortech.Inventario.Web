import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

/**
 * ESTATUS (4):
 * 1 = Created     (Creado)
 * 2 = InTransit   (En camino)
 * 3 = Confirmed   (Confirmado)
 * 4 = Cancelled   (Cancelado)
 */
export type PurchaseOrderStatus = 1 | 2 | 3 | 4;

export type PurchaseOrderListRow = {
  id: number;
  status: PurchaseOrderStatus;

  branchId?: number;
  branchName?: string;

  createdAtUtc: string;

  // backend usa ConfirmedAtUtc = ReceivedAtUtc (compat)
  confirmedAtUtc?: string | null;
  receivedAtUtc?: string | null; // legacy, por si aún lo usas

  note?: string | null;
  receiveNote?: string | null;

  itemsCount?: number;

  totalOrdered?: number;
  totalReceived?: number;
};

export type PurchaseOrderCreateItemDto = {
  productId: number;
  quantityOrdered: number;
  unitCost: number;
};

export type PurchaseOrderCreateDto = {
  branchId: number;
  note?: string | null;
  items: PurchaseOrderCreateItemDto[];
};

// ===== Ship (Admin) =====
export type PurchaseOrderShipItemDto = {
  itemId: number;
  quantityShipped: number;
};

export type PurchaseOrderShipDto = {
  shipNote?: string | null;
  items?: PurchaseOrderShipItemDto[];
};

// ===== Confirm (Staff/Admin) =====
export type PurchaseOrderReceiveItemDto = {
  itemId: number;
  quantityReceived: number;
};

export type PurchaseOrderReceiveDto = {
  receiveNote?: string | null;
  items?: PurchaseOrderReceiveItemDto[]; // en tu backend: si no mandas items => recibido = ordenado/enviado
};

export type PurchaseOrderDetailItemRow = {
  id: number;
  productId: number;
  sku: string;
  name: string;
  unit: string;

  quantityOrdered: number;

  // ✅ NUEVO
  quantityShipped?: number;

  quantityReceived: number;
  unitCost: number;
};

export type EvidenceDto = {
  id?: number;
  fileName: string;
  contentType?: string;
  sizeBytes: number;
  uploadedAtUtc: string;
  url: string; // "/uploads/..."
};

export type PurchaseOrderDetailRow = {
  id: number;
  status: PurchaseOrderStatus;

  branchId: number;
  branchName: string;

  note?: string | null;
  receiveNote?: string | null;

  createdAtUtc: string;

  // backend te manda ConfirmedAtUtc (compat)
  confirmedAtUtc?: string | null;
  receivedAtUtc?: string | null;

  items: PurchaseOrderDetailItemRow[];

  // backend suele mandar Evidence, pero dejamos ambos por compat del front
  evidence?: EvidenceDto[];
  evidences?: EvidenceDto[];
};

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersApi {
  private base = `${API_BASE_URL}/api/purchase-orders`;

  constructor(private http: HttpClient) {}

  // Admin list
  list(filters?: { status?: number | null; branchId?: number | null }): Observable<PurchaseOrderListRow[]> {
    let params = new HttpParams();

    if (filters?.status != null && Number(filters.status) > 0) {
      params = params.set('status', String(filters.status));
    }
    if (filters?.branchId != null && Number(filters.branchId) > 0) {
      params = params.set('branchId', String(filters.branchId));
    }

    return this.http.get<PurchaseOrderListRow[]>(this.base, { params });
  }

  // Staff mine
  mine(filters?: { status?: number | null; branchId?: number | null }): Observable<PurchaseOrderListRow[]> {
    let params = new HttpParams();

    if (filters?.status != null && Number(filters.status) > 0) {
      params = params.set('status', String(filters.status));
    }
    if (filters?.branchId != null && Number(filters.branchId) > 0) {
      params = params.set('branchId', String(filters.branchId));
    }

    return this.http.get<PurchaseOrderListRow[]>(`${this.base}/mine`, { params });
  }

  get(id: number): Observable<PurchaseOrderDetailRow> {
    return this.http.get<PurchaseOrderDetailRow>(`${this.base}/${id}`);
  }

  // alias legacy
  getDetail(id: number): Observable<PurchaseOrderDetailRow> {
    return this.get(id);
  }

  create(dto: PurchaseOrderCreateDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto);
  }

  /**
   * ✅ Admin: mandar mercancía (pasa a InTransit)
   * Endpoint real en tu backend: POST /{id}/ship
   */
  ship(id: number, payload?: PurchaseOrderShipDto): Observable<string> {
    const body: any = payload ?? {};
    return this.http.post(`${this.base}/${id}/ship`, body, { responseType: 'text' });
  }

  /**
   * ✅ Staff/Admin: confirmar recepción (pasa a Confirmed)
   * POST /{id}/confirm
   */
  confirm(id: number, dto?: PurchaseOrderReceiveDto): Observable<string> {
    const body: any = dto ?? {};
    return this.http.post(`${this.base}/${id}/confirm`, body, { responseType: 'text' });
  }

  /**
   * LEGACY: /receive (tu backend lo deja como alias de confirm)
   */
  receive(id: number, dto: PurchaseOrderReceiveDto): Observable<string> {
    return this.http.post(`${this.base}/${id}/receive`, dto, { responseType: 'text' });
  }

  cancel(id: number): Observable<string> {
    return this.http.post(`${this.base}/${id}/cancel`, {}, { responseType: 'text' });
  }

  uploadEvidence(id: number, files: File[]): Observable<any> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f)); // “files”
    return this.http.post(`${this.base}/${id}/evidence`, fd);
  }

  // backend devuelve 204 NoContent => mejor void
  deleteEvidence(poId: number, fileName: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${poId}/evidence/${encodeURIComponent(fileName)}`);
  }

  getPendingCount(branchId?: number | null): Observable<{ count: number }> {
    let params = new HttpParams();
    if (branchId != null && Number(branchId) > 0) {
      params = params.set('branchId', String(branchId));
    }
    return this.http.get<{ count: number }>(`${this.base}/pending-count`, { params });
  }
  setInTransit(id: number): Observable<string> {
  return this.ship(id, {});
}

}
