import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface SectionRow {
  id: number;
  name: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface SectionCreateDto {
  name: string;
}

export interface SectionUpdateDto {
  name: string;
}

export interface SectionStatusDto {
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SectionsApi {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/sections`;

  list(includeInactive = false): Observable<SectionRow[]> {
    return this.http.get<SectionRow[]>(this.base, {
      params: { includeInactive: String(includeInactive) }
    });
  }

  create(dto: SectionCreateDto): Observable<SectionRow> {
    return this.http.post<SectionRow>(this.base, dto);
  }

  update(id: number, dto: SectionUpdateDto): Observable<SectionRow> {
    return this.http.put<SectionRow>(`${this.base}/${id}`, dto);
  }

  setStatus(id: number, dto: SectionStatusDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/status`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ❌ Ya no se usa (branch sale del token)
  // listByBranch(branchId: number): Observable<any[]> { ... }
}

