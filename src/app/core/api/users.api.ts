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
  isActive: boolean;
}

export interface UserCreateDto {
  username: string;
  fullName: string;
  role: UserRole;
  password: string;
  branchId: number;

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
}
