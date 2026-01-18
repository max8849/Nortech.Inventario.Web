import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type UserRole = 'Admin' | 'Staff';

export interface UserRow {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;

  // ✅ ahora viene del backend
  branchId: number;
  branchName: string;

  // ✅ multi-sucursal
  branchIds: number[];

  isActive: boolean;
  createdAtUtc?: string;
}

export interface UserCreateDto {
  username: string;
  fullName: string;
  role: UserRole;
  password: string;

  // ✅ principal (matriz o default)
  branchId: number;

  // ✅ accesos
  branchIds: number[];
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/users`;

  list(): Observable<UserRow[]> {
    return this.http.get<UserRow[]>(this.base);
  }

  create(dto: UserCreateDto): Observable<UserRow> {
    return this.http.post<UserRow>(this.base, dto);
  }

  setStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/status`, { isActive });
  }

  resetPassword(id: number, password: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/password`, { password });
  }
setBranches(id: number, branchIds: number[]): Observable<void> {
  return this.http.put<void>(`${this.base}/${id}/branches`, { branchIds });
}

}
