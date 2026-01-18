import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type BranchRow = {
  id: number;
  name: string;
  isActive: boolean;
};

export type BranchCreateDto = {
  name: string;
};

export type BranchUpdateDto = {
  name: string;
};

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private base = `${API_BASE_URL}/api/branches`;

  constructor(private http: HttpClient) {}

  list(active: boolean = true): Observable<BranchRow[]> {
    let params = new HttpParams().set('active', String(active));
    return this.http.get<BranchRow[]>(this.base, { params });
  }

  get(id: number): Observable<BranchRow> {
    return this.http.get<BranchRow>(`${this.base}/${id}`);
  }

  create(dto: BranchCreateDto): Observable<any> {
    return this.http.post(this.base, dto);
  }

  update(id: number, dto: BranchUpdateDto): Observable<any> {
    return this.http.put(`${this.base}/${id}`, dto);
  }

  setActive(id: number, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.base}/${id}/active`, { isActive });
  }
}
