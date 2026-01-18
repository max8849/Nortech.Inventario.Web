import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface ProductRowDto {
  id: number;
  sku: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  isActive: boolean;
  sectionId: number;
  sectionName: string;
}

export interface ProductCreateDto {
  sku: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  sectionId: number;
}

export interface ProductUpdateDto {
  sku: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  sectionId: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private base = `${API_BASE_URL}/api/products`;

  constructor(private http: HttpClient) {}

  /**
   * list:
   * - Mantiene compatibilidad: (q, active) sigue funcionando igual.
   * - Nuevo opcional: branchId (number | null | undefined)
   *   - undefined => no manda parámetro (comportamiento actual)
   *   - null => no manda parámetro (útil para Admin "Todas")
   *   - number (>0) => manda branchId
   */
  list(
    q: string = '',
    active: boolean = true,
    branchId?: number | null
  ): Observable<ProductRowDto[]> {
    let params = new HttpParams().set('active', String(active));

    if (q?.trim()) params = params.set('q', q.trim());

    // ✅ solo agrega branchId si viene válido (>0)
    if (branchId != null) {
      const n = Number(branchId);
      if (Number.isFinite(n) && n > 0) {
        params = params.set('branchId', String(n));
      }
    }

    return this.http.get<ProductRowDto[]>(this.base, { params });
  }

  get(id: number): Observable<ProductRowDto> {
    return this.http.get<ProductRowDto>(`${this.base}/${id}`);
  }

  create(dto: ProductCreateDto): Observable<any> {
    return this.http.post(this.base, dto);
  }

  update(id: number, dto: ProductUpdateDto): Observable<any> {
    return this.http.put(`${this.base}/${id}`, dto);
  }

  setActive(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.base}/${id}/active`, { isActive });
  }
}
