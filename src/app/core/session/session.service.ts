import { Injectable } from '@angular/core';

export type Role = 'Admin' | 'Staff';

export type BranchLite = {
  id: number;
  name: string;
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  // ===== Keys =====
  private readonly K_TOKEN = 'token';
  private readonly K_ROLE = 'role';
  private readonly K_USERNAME = 'username';

  private readonly K_BRANCH_ID = 'branchId';
  private readonly K_BRANCH_NAME = 'branchName';

  private readonly K_BRANCH_IDS = 'branchIds';
  private readonly K_BRANCH_NAMES = 'branchNames';

  private readonly K_ACTIVE_BRANCH_ID = 'activeBranchId';

  // ===== Basics =====
  token(): string | null {
    return localStorage.getItem(this.K_TOKEN);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  username(): string {
    return localStorage.getItem(this.K_USERNAME) || '';
  }

  role(): Role {
    const r = (localStorage.getItem(this.K_ROLE) || 'Staff').toLowerCase();
    return r === 'admin' ? 'Admin' : 'Staff';
  }

  isAdmin(): boolean {
    return this.role() === 'Admin';
  }

  // ===== Branch principal (compat) =====
  primaryBranchId(): number {
    return Number(localStorage.getItem(this.K_BRANCH_ID) || 0) || 0;
  }

  primaryBranchName(): string {
    return localStorage.getItem(this.K_BRANCH_NAME) || '';
  }

  // ===== BranchIds permitidas =====
  branchIds(): number[] {
    try {
      const raw = localStorage.getItem(this.K_BRANCH_IDS);
      const arr = raw ? JSON.parse(raw) : [];
      const ids = (arr || [])
        .map((x: any) => Number(x))
        .filter((x: any) => Number.isFinite(x) && x > 0);

      if (ids.length > 0) return Array.from(new Set(ids));
    } catch {}

    const b = this.primaryBranchId();
    return b > 0 ? [b] : [];
  }

  branchNames(): string[] {
    try {
      const raw = localStorage.getItem(this.K_BRANCH_NAMES);
      const arr = raw ? JSON.parse(raw) : [];
      return (arr || []).map((x: any) => String(x || '')).filter(Boolean);
    } catch {
      const n = this.primaryBranchName();
      return n ? [n] : [];
    }
  }

  // lista (id + nombre) para select (sobre todo Staff)
  branches(): BranchLite[] {
    const ids = this.branchIds();
    const names = this.branchNames();

    if (names.length === ids.length && names.length > 0) {
      return ids.map((id, i) => ({ id, name: names[i] || `Sucursal ${id}` }));
    }

    const primaryId = this.primaryBranchId();
    const primaryName =
      this.primaryBranchName() || (primaryId ? `Sucursal ${primaryId}` : '');

    return ids.map((id) => ({
      id,
      name: id === primaryId ? primaryName : `Sucursal ${id}`
    }));
  }

  // ===== Branch activa =====
  activeBranchId(): number {
    const v = Number(localStorage.getItem(this.K_ACTIVE_BRANCH_ID) || 0) || 0;

    // ✅ Admin: 0 es válido (Todas)
    if (this.isAdmin() && v === 0) return 0;

    if (v > 0 && this.branchIds().includes(v)) return v;

    const primary = this.primaryBranchId();
    if (primary > 0 && this.branchIds().includes(primary)) return primary;

    const ids = this.branchIds();
    return ids[0] || 0;
  }

  setActiveBranchId(id: number): void {
    const n = Number(id);

    // ✅ Admin puede guardar 0 (Todas)
    if (this.isAdmin() && n === 0) {
      localStorage.setItem(this.K_ACTIVE_BRANCH_ID, '0');
      return;
    }

    if (!Number.isFinite(n) || n <= 0) return;

    // solo permitir si está en permitidas (Staff)
    const allowed = this.branchIds();
    if (allowed.length > 0 && !allowed.includes(n)) return;

    localStorage.setItem(this.K_ACTIVE_BRANCH_ID, String(n));
  }

  // Staff: solo si tiene >1 asignada. Admin: usualmente sí.
  canChooseBranch(): boolean {
    return this.isAdmin() || this.branchIds().length > 1;
  }

  // Helper para requests con branchId opcional:
  // - Staff => siempre un branchId (>0)
  // - Admin => 0 => null (todas), >0 => ese id
  branchIdParam(): number | null {
    if (!this.isAdmin()) return this.activeBranchId();
    const v = this.activeBranchId();
    return v > 0 ? v : null;
  }
  // ===== Set Session (Login) =====
  setSession(data: {
    token: string;
    role: Role;
    username: string;
    branchId: number;
    branchName: string;
    branchIds?: number[];
    branchNames?: string[];
  }): void {
    localStorage.setItem(this.K_TOKEN, data.token || '');
    localStorage.setItem(this.K_ROLE, data.role || 'Staff');
    localStorage.setItem(this.K_USERNAME, data.username || '');

    localStorage.setItem(this.K_BRANCH_ID, String(Number(data.branchId) || 0));
    localStorage.setItem(this.K_BRANCH_NAME, data.branchName || '');

    const ids = (data.branchIds || [])
      .map(x => Number(x))
      .filter(x => Number.isFinite(x) && x > 0);

    const uniqueIds = Array.from(new Set(ids.length ? ids : [Number(data.branchId) || 0].filter(x => x > 0)));

    localStorage.setItem(this.K_BRANCH_IDS, JSON.stringify(uniqueIds));

    const names = (data.branchNames || []).map(x => String(x || '')).filter(Boolean);

    // si no vienen nombres, guardamos al menos el principal para no romper el UI
    const finalNames =
      names.length === uniqueIds.length
        ? names
        : uniqueIds.map(id => (id === Number(data.branchId) ? (data.branchName || `Sucursal ${id}`) : `Sucursal ${id}`));

    localStorage.setItem(this.K_BRANCH_NAMES, JSON.stringify(finalNames));

    // default: activa = principal
    if (Number(data.branchId) > 0) {
      localStorage.setItem(this.K_ACTIVE_BRANCH_ID, String(Number(data.branchId)));
    }
  }

  // ===== Cleanup =====
  clear(): void {
    localStorage.removeItem(this.K_TOKEN);
    localStorage.removeItem(this.K_ROLE);
    localStorage.removeItem(this.K_USERNAME);

    localStorage.removeItem(this.K_BRANCH_ID);
    localStorage.removeItem(this.K_BRANCH_NAME);

    localStorage.removeItem(this.K_BRANCH_IDS);
    localStorage.removeItem(this.K_BRANCH_NAMES);
    localStorage.removeItem(this.K_ACTIVE_BRANCH_ID);
  }
}
