import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type BranchOpt = { id: number; name: string; isActive: boolean };
export interface BranchRow {
  id: number;
  name: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private base = `${API_BASE_URL}/api/branches`;
  constructor(private http: HttpClient) {}

  list(): Observable<BranchOpt[]> {
    return this.http.get<BranchOpt[]>(this.base);
  }
}
