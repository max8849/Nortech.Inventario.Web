import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type ExcelRange = 'month' | 'prev-month' | 'quin1' | 'quin2' | 'custom';

export type ExcelReportKey =
  | 'movements'
  | 'stock';

export interface ExcelReportCatalogItem {
  key: ExcelReportKey;
  title: string;
  description: string;
  tags?: string[];
}

export interface ExcelDownloadRequest {
  branchId: number | null;
  range: ExcelRange;
  from?: string | null; // YYYY-MM-DD
  to?: string | null;   // YYYY-MM-DD
  includeInactive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExcelReportsApi {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/reports-excel`;

  // Catalogo local (no necesita backend)
  catalog(): Observable<ExcelReportCatalogItem[]> {
    const rows: ExcelReportCatalogItem[] = [
      {
        key: 'movements',
        title: 'Movimientos',
        description: 'Entradas/Salidas por fecha, con productos y cantidades.',
        tags: ['mes', 'quincena', 'personalizable']
      },
      {
        key: 'stock',
        title: 'Stock',
        description: 'Snapshot de stock actual por producto (por sucursal).',
        tags: ['inventario']
      }
    ];
    return new Observable((sub) => {
      sub.next(rows);
      sub.complete();
    });
  }

  download(key: ExcelReportKey, req: ExcelDownloadRequest): Observable<Blob> {
    // BranchId: si viene null, NO lo mandamos
    let params = new HttpParams();

    // range
    params = params.set('range', req.range);

    if (req.branchId !== null && req.branchId !== undefined) {
      params = params.set('branchId', String(req.branchId));
    }

    if (req.includeInactive !== undefined && req.includeInactive !== null) {
      params = params.set('includeInactive', String(req.includeInactive));
    }

    // fechas personalizadas
    if (req.range === 'custom') {
      if (req.from) params = params.set('from', req.from);
      if (req.to) params = params.set('to', req.to);
    }

    // por rango fijo (mes/quincena) calculamos year/month/half desde el front
    // para no meter lógica rara en el controller
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    if (key === 'movements') {
      if (req.range === 'month') {
        params = params.set('year', String(y)).set('month', String(m));
        return this.http.get(`${this.base}/movements/month`, {
          params,
          responseType: 'blob'
        });
      }

      if (req.range === 'prev-month') {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        params = params.set('year', String(d.getFullYear())).set('month', String(d.getMonth() + 1));
        return this.http.get(`${this.base}/movements/month`, {
          params,
          responseType: 'blob'
        });
      }

      if (req.range === 'quin1' || req.range === 'quin2') {
        const half = req.range === 'quin1' ? 1 : 2;
        params = params.set('year', String(y)).set('month', String(m)).set('half', String(half));
        return this.http.get(`${this.base}/movements/quincena`, {
          params,
          responseType: 'blob'
        });
      }

      // custom
      return this.http.get(`${this.base}/movements`, {
        params,
        responseType: 'blob'
      });
    }

    // stock
    return this.http.get(`${this.base}/stock`, {
      params,
      responseType: 'blob'
    });
  }
}
