import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  error: string | null = null;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  submit() {
    this.error = null;
    if (this.form.invalid) return;

    this.loading = true;
    const req = this.form.value as { username: string; password: string };

    this.auth.login(req).subscribe({
      next: () => {
        // ================================
        // ✅ PRUEBA TEMPORAL (multi-sucursal)
        // ================================
        // Si tu backend ya mete branchIds en el token pero NO los guardas en localStorage,
        // esto forzará que tu SessionService.branches() ya vea más de una sucursal.
        //
        // OJO: Ajusta estos IDs/nombres a los reales que tú tengas.
        // Si no tienes branchNames reales, igual funciona (solo UI).
        try {
          // Si ya existen, NO los pisamos. (para no romper sesiones reales)
          const existingIds = localStorage.getItem('branchIds');
          const existingNames = localStorage.getItem('branchNames');

          if (!existingIds) {
            // ejemplo: dos sucursales
            localStorage.setItem('branchIds', JSON.stringify([1, 2]));
          }
          if (!existingNames) {
            localStorage.setItem('branchNames', JSON.stringify(['Matriz', 'Sucursal 2']));
          }

          // si no hay activeBranchId, ponlo a la principal o a una válida
          const active = Number(localStorage.getItem('activeBranchId') || 0) || 0;
          if (!active) {
            const primary = Number(localStorage.getItem('branchId') || 0) || 0;
            localStorage.setItem('activeBranchId', String(primary > 0 ? primary : 1));
          }
        } catch {}

        this.loading = false;
        this.router.navigateByUrl('/home');
      },
      error: () => {
        this.loading = false;
        this.error = 'Usuario o contraseña incorrectos.';
      }
    });
  }
}
