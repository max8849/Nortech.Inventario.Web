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

  list(q: string = '', active: boolean = true): Observable<ProductRowDto[]> {
    let params = new HttpParams().set('active', String(active));
    if (q?.trim()) params = params.set('q', q.trim());
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
