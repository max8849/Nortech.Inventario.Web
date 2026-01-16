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
  productId: number;
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
  minStock: number;
  stock: number;
  isLow: boolean;
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


  kardex(productId: number) {
    return this.http.get(`${this.base}/kardex`, {
      params: { productId }
    });
  }

  overview(days = 30): Observable<OverviewDto> {
    return this.http.get<OverviewDto>(`${this.base}/overview`, { params: { days } });
  }

  daily(days = 30): Observable<DailyMovementsDto> {
    return this.http.get<DailyMovementsDto>(`${this.base}/movements/daily`, { params: { days } });
  }

  topMovers(days = 30, take = 10): Observable<TopMoverDto[]> {
    return this.http.get<TopMoverDto[]>(`${this.base}/top-movers`, { params: { days, take } });
  }
}
