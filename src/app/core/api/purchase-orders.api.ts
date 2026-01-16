import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type PurchaseOrderStatus = number; // 1 Pending, 2 Received, 3 Cancelled

export type PurchaseOrderListRow = {
  id: number;
  status: PurchaseOrderStatus;
  branchId?: number;
  branchName?: string;
  createdAtUtc: string;
  receivedAtUtc?: string | null;
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

export type PurchaseOrderReceiveItemDto = {
  itemId: number;
  quantityReceived: number;
};

export type PurchaseOrderReceiveDto = {
  receiveNote?: string | null;
  items: PurchaseOrderReceiveItemDto[];
};

export type PurchaseOrderDetailItemRow = {
  id: number;
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
};

export type EvidenceDto = {
  id: number;
  fileName: string;
  contentType: string;
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
  receivedAtUtc?: string | null;
  items: PurchaseOrderDetailItemRow[];
  evidences?: EvidenceDto[];
};

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersApi {
  private base = `${API_BASE_URL}/api/purchase-orders`;

  constructor(private http: HttpClient) {}

  list(filters?: { status?: number; branchId?: number }): Observable<PurchaseOrderListRow[]> {
    let params = new HttpParams();
    if (filters?.status != null) params = params.set('status', String(filters.status));
    if (filters?.branchId != null) params = params.set('branchId', String(filters.branchId));
    return this.http.get<PurchaseOrderListRow[]>(this.base, { params });
  }

  mine(): Observable<PurchaseOrderListRow[]> {
    return this.http.get<PurchaseOrderListRow[]>(`${this.base}/mine`);
  }

  // ✅ usa el tipado completo (incluye evidences si backend lo manda)
  get(id: number): Observable<PurchaseOrderDetailRow> {
    return this.http.get<PurchaseOrderDetailRow>(`${this.base}/${id}`);
  }

  create(dto: PurchaseOrderCreateDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto);
  }

  // (opcional) alias si ya lo usabas en componentes
  getDetail(id: number): Observable<PurchaseOrderDetailRow> {
    return this.get(id);
  }

  receive(id: number, dto: PurchaseOrderReceiveDto): Observable<string> {
    // backend devuelve texto "Recibida." -> responseType 'text'
    return this.http.post(`${this.base}/${id}/receive`, dto, { responseType: 'text' });
  }

  cancel(id: number): Observable<string> {
    // si aún no existe en backend, no lo llames; pero así queda listo.
    return this.http.post(`${this.base}/${id}/cancel`, {}, { responseType: 'text' });
  }

  uploadEvidence(id: number, files: File[]): Observable<EvidenceDto[]> {
    const form = new FormData();
    for (const f of (files || [])) form.append('files', f);
    return this.http.post<EvidenceDto[]>(`${this.base}/${id}/evidence`, form);
  }

  deleteEvidence(poId: number, evidenceId: number): Observable<any> {
    return this.http.delete(`${this.base}/${poId}/evidence/${evidenceId}`);
  }
}
