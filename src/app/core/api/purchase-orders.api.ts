import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';

export type PurchaseOrderStatus = number; // 1 Pending, 2 Received, 3 Cancelled (según tu enum backend)

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
};

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersApi {
  private base = `${API_BASE_URL}/api/purchase-orders`;

  constructor(private http: HttpClient) {}

  list(filters?: { status?: number; branchId?: number }) {
    let params = new HttpParams();
    if (filters?.status != null) params = params.set('status', String(filters.status));
    if (filters?.branchId != null) params = params.set('branchId', String(filters.branchId));
    return this.http.get<PurchaseOrderListRow[]>(`${this.base}`, { params });
  }

  mine() {
    return this.http.get<PurchaseOrderListRow[]>(`${this.base}/mine`);
  }

  get(id: number) {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  create(dto: PurchaseOrderCreateDto) {
    return this.http.post<{ id: number }>(`${this.base}`, dto);
  }

   // ✅ detalle tipado (opcional, pero recomendado)
  getDetail(id: number) {
    return this.http.get<PurchaseOrderDetailRow>(`${this.base}/${id}`);
  }

    receive(id: number, dto: { receiveNote?: string | null; items: { itemId: number; quantityReceived: number }[] }) {
    // backend devuelve texto "Recibida." -> responseType 'text'
    return this.http.post(`${this.base}/${id}/receive`, dto, { responseType: 'text' });
    }

    cancel(id: number) {
    // si aún no existe en backend, no lo llames; pero así queda listo.
    return this.http.post(`${this.base}/${id}/cancel`, {}, { responseType: 'text' });
    }
  
}
