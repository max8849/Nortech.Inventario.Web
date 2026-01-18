import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { tap } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  username: string;
  role: 'Admin' | 'Staff' | string;

  branchId: number;
  branchName: string;

  // a veces viene, a veces no:
  branchIds?: number[] | string;
  branchNames?: string[] | string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${API_BASE_URL}/api/auth`;
  private tokenKey = 'token';

  constructor(private http: HttpClient) {}

  private parseJwt(token: string): any {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return {};
    }
  }

  private parseIds(raw: any): number[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(x => Number(x)).filter(x => x > 0);

    const s = String(raw).trim();
    if (!s) return [];

    // Soporta "4,2"
    if (s.includes(',')) {
      return s.split(',').map(x => Number(x.trim())).filter(x => x > 0);
    }

    // Soporta "[4,2]"
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        return (arr || []).map((x: any) => Number(x)).filter((x: any) => x > 0);
      } catch {
        return [];
      }
    }

    // Soporta "4"
    const n = Number(s);
    return n > 0 ? [n] : [];
  }

  private parseNames(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(x => String(x ?? '')).filter(Boolean);

    const s = String(raw).trim();
    if (!s) return [];

    // Soporta "Guadalupe,Saltillo"
    if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);

    // Soporta JSON array string
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        return (arr || []).map((x: any) => String(x ?? '')).filter(Boolean);
      } catch {
        return [];
      }
    }

    return [s];
  }

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.base}/login`, req).pipe(
      tap((resp) => {
        // ===== básicos
        localStorage.setItem(this.tokenKey, resp.token);
        localStorage.setItem('role', resp.role || 'Staff');
        localStorage.setItem('username', resp.username ?? '');

        localStorage.setItem('branchId', String(resp.branchId || 0));
        localStorage.setItem('branchName', resp.branchName ?? '');

        // ===== leer claims del token (fuente de verdad)
        const claims = this.parseJwt(resp.token);

        const idsFromResp = this.parseIds(resp.branchIds);
        const namesFromResp = this.parseNames(resp.branchNames);

        const idsFromToken = this.parseIds(claims.branchIds);
        const namesFromToken = this.parseNames(claims.branchNames);

        const ids = (idsFromResp.length ? idsFromResp : idsFromToken);
        const names = (namesFromResp.length ? namesFromResp : namesFromToken);

        const idsUnique = Array.from(new Set(ids)).filter(x => x > 0);

        localStorage.setItem('branchIds', JSON.stringify(idsUnique));

        // si names no viene alineado, lo dejamos vacío (tu SessionService hace fallback)
        const namesOk = (names.length === idsUnique.length) ? names : [];
        localStorage.setItem('branchNames', JSON.stringify(namesOk));

        // ===== branch activa
        const active = Number(localStorage.getItem('activeBranchId') || 0) || 0;
        if (!active || !idsUnique.includes(active)) {
          const def = (resp.branchId && idsUnique.includes(resp.branchId))
            ? resp.branchId
            : (idsUnique[0] || resp.branchId || 0);

          localStorage.setItem('activeBranchId', String(def));
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('branchId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('branchIds');
    localStorage.removeItem('branchNames');
    localStorage.removeItem('activeBranchId');
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
