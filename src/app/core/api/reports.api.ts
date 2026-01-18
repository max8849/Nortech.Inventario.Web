import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface OverviewDto {
  activeProducts: number;
  lowStockCount: number;
  totalStockUnits: number;
  movementsCount: number;
  movementItemsCount: number;
}

export interface DailyMovementsDto {
  labels: string[];
  in: number[];
  out: number[];
}

export interface TopMoverDto {
  id: number;
  sku: string;
  name: string;
  qtyIn: number;
  qtyOut: number;
  total: number;
}

export interface StockRow {
  id: number;
  sku: string;
  name: string;
  unit: string;

  stock: number;

  // opcionales (si luego los agregas en backend)
  minStock?: number;
  isLow?: boolean;

  isActive: boolean;
  branchId?: number;
  branchName?: string;
}


@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/reports`;

  stock(includeInactive = false, branchId?: number | null): Observable<StockRow[]> {
    const params: any = { includeInactive };
    if (branchId !== undefined && branchId !== null) params.branchId = branchId;
    return this.http.get<StockRow[]>(`${this.base}/stock`, { params });
  }

  kardex(productId: number, branchId?: number | null) {
    const params: any = { productId };
    if (branchId !== undefined && branchId !== null) params.branchId = branchId;
    return this.http.get(`${this.base}/kardex`, { params });
  }

  // ✅ NUEVO: branchId opcional
  overview(days = 30, branchId?: number | null): Observable<OverviewDto> {
    const params: any = { days };
    if (branchId !== undefined && branchId !== null) params.branchId = branchId;
    return this.http.get<OverviewDto>(`${this.base}/overview`, { params });
  }

  // ✅ NUEVO: branchId opcional
  daily(days = 30, branchId?: number | null): Observable<DailyMovementsDto> {
    const params: any = { days };
    if (branchId !== undefined && branchId !== null) params.branchId = branchId;
    return this.http.get<DailyMovementsDto>(`${this.base}/movements/daily`, { params });
  }

  // ✅ NUEVO: branchId opcional
  topMovers(days = 30, take = 10, branchId?: number | null): Observable<TopMoverDto[]> {
    const params: any = { days, take };
    if (branchId !== undefined && branchId !== null) params.branchId = branchId;
    return this.http.get<TopMoverDto[]>(`${this.base}/top-movers`, { params });
  }
}
