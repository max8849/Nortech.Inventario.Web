import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Product } from '../models/product.model';

export interface ProductCreateDto {
  sku: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  minStock: number;
  branchId?: number; 
  initialQty?: number;

}

export interface ProductUpdateDto extends ProductCreateDto {
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/products`;

  get(q?: string, active?: boolean): Observable<Product[]> {
    const params: any = {};
    if (q) params.q = q;
    if (active !== undefined) params.active = active;
    return this.http.get<Product[]>(this.base, { params });
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

create(dto: ProductCreateDto) {
  return this.http.post(`${this.base}`, dto);
}

  update(id: number, dto: ProductUpdateDto) {
    return this.http.put<{ id: number }>(`${this.base}/${id}`, dto);
  }
}
