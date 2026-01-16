import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api.config';
import { MovementCreate } from '../models/movement.model';

@Injectable({ providedIn: 'root' })
export class MovementsApi {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/api/movements`;

  create(dto: MovementCreate) {
    return this.http.post<{ id: number }>(this.base, dto);
  }
}
