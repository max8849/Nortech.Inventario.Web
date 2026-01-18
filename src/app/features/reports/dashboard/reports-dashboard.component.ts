import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  Chart,
  LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
  BarController, BarElement
} from 'chart.js';

import { ReportsApi, OverviewDto, DailyMovementsDto, TopMoverDto } from '../../../core/api/reports.api';
import { BranchesApi } from '../../../core/api/branches.api';
import { SessionService, BranchLite } from '../../../core/session/session.service';

Chart.register(
  LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
  BarController, BarElement
);

type BranchOpt = { id: number; name: string; isActive?: boolean };

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.scss']
})
export class ReportsDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;

  days: 7 | 30 | 90 = 30;

  loading = false;

  overview: OverviewDto | null = null;
  daily: DailyMovementsDto | null = null;
  top: TopMoverDto[] = [];

  private lineChart?: Chart;
  private barChart?: Chart;

  // ✅ Selector sucursal (Admin y Staff)
  isAdmin = false;
  branches: BranchOpt[] = [];
  selectedBranchId = 0; // Admin: 0 = Todas | Staff: siempre >0

  constructor(
    private reports: ReportsApi,
    private branchesApi: BranchesApi,
    private session: SessionService
  ) {}

  ngAfterViewInit(): void {
    this.isAdmin = this.session.isAdmin();

    // ✅ Cargar branches según rol
    if (this.isAdmin) {
      this.branchesApi.list().subscribe({
        next: (bs: any[]) => {
          this.branches = (bs || [])
            .map((x: any) => ({
              id: x.id ?? x.Id,
              name: x.name ?? x.Name,
              isActive: x.isActive ?? x.IsActive
            }))
            .filter((b: BranchOpt) => !!b.isActive);

          // default admin = Todas
          this.selectedBranchId = 0;
          this.load();
        },
        error: (e) => {
          console.error('No se pudieron cargar sucursales', e);
          this.branches = [];
          this.selectedBranchId = 0;
          this.load();
        }
      });
    } else {
      // ✅ Staff: desde session
      const staffBranches: BranchLite[] = this.session.branches();
      this.branches = staffBranches.map(b => ({ id: b.id, name: b.name, isActive: true }));

      this.selectedBranchId = this.session.activeBranchId();
      if (!this.selectedBranchId && this.branches.length > 0) {
        this.selectedBranchId = this.branches[0].id;
        this.session.setActiveBranchId(this.selectedBranchId);
      }

      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  setDays(value: 7 | 30 | 90) {
    if (this.days === value) return;
    this.days = value;
    this.destroyCharts();
    this.load();
  }

  onBranchChange(): void {
    // ✅ Staff: persistir sucursal elegida
    if (!this.isAdmin) {
      this.session.setActiveBranchId(this.selectedBranchId);
    }

    this.destroyCharts();
    this.load();
  }

  load(): void {
    this.loading = true;

    const branchIdParam: number | null =
      this.isAdmin
        ? (this.selectedBranchId > 0 ? this.selectedBranchId : null) // 0 => todas
        : (this.selectedBranchId > 0 ? this.selectedBranchId : this.session.activeBranchId());

    forkJoin({
      overview: this.reports.overview(this.days, branchIdParam),
      daily: this.reports.daily(this.days, branchIdParam),
      top: this.reports.topMovers(this.days, 10, branchIdParam),
    })
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (res) => {
        this.overview = res.overview;
        this.daily = res.daily;
        this.top = res.top;
        requestAnimationFrame(() => this.renderOrUpdateCharts());
      },
      error: (err) => {
        console.error('Reports load error', err);
        this.overview = null;
        this.daily = null;
        this.top = [];
      }
    });
  }

  private destroyCharts(): void {
    this.lineChart?.destroy();
    this.barChart?.destroy();
    this.lineChart = undefined;
    this.barChart = undefined;
  }

  private cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    if (color.startsWith('rgba(')) return color.replace(/rgba\((.+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);

    const hex = (color || '').replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  private renderOrUpdateCharts(): void {
    if (!this.daily) return;
    if (!this.lineCanvas?.nativeElement || !this.barCanvas?.nativeElement) return;

    const primary = this.cssVar('--nt-primary') || '#00B7B2';
    const danger  = this.cssVar('--nt-danger')  || '#F44336';
    const text    = this.cssVar('--nt-text')    || 'rgba(0,0,0,.82)';
    const grid    = this.cssVar('--nt-grid')    || 'rgba(0,0,0,.08)';

    Chart.defaults.color = text;

    const commonScales: any = {
      x: { grid: { color: grid }, ticks: { color: text } },
      y: { beginAtZero: true, grid: { color: grid }, ticks: { color: text } }
    };

    // LINE
    const labels = this.daily.labels;
    const inData = this.daily.in;
    const outData = this.daily.out;

    const lineData: any = {
      labels,
      datasets: [
        {
          label: 'Entradas',
          data: inData,
          tension: 0.25,
          borderColor: primary,
          backgroundColor: this.withAlpha(primary, 0.18),
          pointRadius: 3,
          fill: true,
        },
        {
          label: 'Salidas',
          data: outData,
          tension: 0.25,
          borderColor: danger,
          backgroundColor: this.withAlpha(danger, 0.18),
          pointRadius: 3,
          fill: true,
        }
      ]
    };

    const lineOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: text } },
        tooltip: { enabled: true }
      },
      scales: commonScales
    };

    if (!this.lineChart) {
      this.lineChart = new Chart(this.lineCanvas.nativeElement, {
        type: 'line',
        data: lineData,
        options: lineOptions
      });
    } else {
      this.lineChart.data.labels = labels as any;
      (this.lineChart.data.datasets[0] as any).data = inData as any;
      (this.lineChart.data.datasets[1] as any).data = outData as any;
      this.lineChart.options = lineOptions;
      this.lineChart.update();
    }

    // BAR
    const topLabels = this.top.map(x => x.name);
    const totals = this.top.map(x => x.total);

    const barData: any = {
      labels: topLabels,
      datasets: [
        {
          label: 'Movimiento total',
          data: totals,
          backgroundColor: this.withAlpha(primary, 0.30),
          borderColor: primary,
          borderWidth: 1
        }
      ]
    };

    const barOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: commonScales
    };

    if (!this.barChart) {
      this.barChart = new Chart(this.barCanvas.nativeElement, {
        type: 'bar',
        data: barData,
        options: barOptions
      });
    } else {
      this.barChart.data.labels = topLabels as any;
      (this.barChart.data.datasets[0] as any).data = totals as any;
      this.barChart.options = barOptions;
      this.barChart.update();
    }
  }

  get branchLabel(): string {
    if (this.isAdmin) {
      if (this.selectedBranchId === 0) return 'Todas';
      return this.branches.find(b => b.id === this.selectedBranchId)?.name || 'Sucursal';
    }
    return this.branches.find(b => b.id === this.selectedBranchId)?.name
      || this.session.primaryBranchName()
      || 'Sucursal';
  }
}
