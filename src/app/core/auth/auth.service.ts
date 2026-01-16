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
  role: string;
  branchId: number;
  branchName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${API_BASE_URL}/api/auth`;
  private tokenKey = 'token'; // ✅ usa la misma key que guardas

  constructor(private http: HttpClient) {}

  login(req: LoginRequest) {
    // ✅ OJO: aquí era /auth/login doble. Debe ser /login
    return this.http.post<LoginResponse>(`${this.base}/login`, req).pipe(
      tap((resp) => {
        localStorage.setItem(this.tokenKey, resp.token);
        localStorage.setItem('role', resp.role);
        localStorage.setItem('branchId', String(resp.branchId));
        localStorage.setItem('branchName', resp.branchName ?? '');
        localStorage.setItem('username', resp.username ?? '');
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('role');
    localStorage.removeItem('branchId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('username');
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
