import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { forkJoin } from 'rxjs';
import { ReportsApi, OverviewDto, DailyMovementsDto, TopMoverDto } from '../../../core/api/reports.api';

import {
  Chart,
  LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
  BarController, BarElement
} from 'chart.js';

Chart.register(
  LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
  BarController, BarElement
);

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule,
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

  constructor(private reports: ReportsApi) {}

  ngAfterViewInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.lineChart?.destroy();
    this.barChart?.destroy();
  }

setDays(value: 7 | 30 | 90) {
  if (this.days === value) return;

  this.days = value;

  // Opcional: destruye charts para evitar estados raros
  this.lineChart?.destroy();
  this.barChart?.destroy();
  this.lineChart = undefined;
  this.barChart = undefined;

  this.load();
}

load(): void {
  this.loading = true;

  forkJoin({
    overview: this.reports.overview(this.days),
    daily: this.reports.daily(this.days),
    top: this.reports.topMovers(this.days, 10),
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
      // para que no quede pantalla “vacía”
      this.overview = this.overview ?? {
        activeProducts: 0,
        lowStockCount: 0,
        totalStockUnits: 0,
        movementsCount: 0,
        movementItemsCount: 0
      };
    }
  });
}


 private renderOrUpdateCharts(): void {
  if (!this.daily) return;
  if (!this.lineCanvas?.nativeElement || !this.barCanvas?.nativeElement) return;

  console.log('render charts with colors');

  // LINE: Entradas vs Salidas
  const labels = this.daily.labels;
  const inData = this.daily.in;
  const outData = this.daily.out;

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Entradas',
        data: inData,
        tension: 0.25,
        borderColor: 'rgba(33, 150, 243, 1)',
        backgroundColor: 'rgba(33, 150, 243, 0.18)',
        pointRadius: 3,
        fill: true,
      },
      {
        label: 'Salidas',
        data: outData,
        tension: 0.25,
        borderColor: 'rgba(244, 67, 54, 1)',
        backgroundColor: 'rgba(244, 67, 54, 0.18)',
        pointRadius: 3,
        fill: true,
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } }
  };

  if (!this.lineChart) {
    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: lineData,
      options: lineOptions
    });
  } else {
    this.lineChart.data.labels = labels as any;

    const ds0 = this.lineChart.data.datasets[0] as any;
    ds0.data = inData as any;
    ds0.borderColor = 'rgba(33, 150, 243, 1)';
    ds0.backgroundColor = 'rgba(33, 150, 243, 0.18)';
    ds0.fill = true;

    const ds1 = this.lineChart.data.datasets[1] as any;
    ds1.data = outData as any;
    ds1.borderColor = 'rgba(244, 67, 54, 1)';
    ds1.backgroundColor = 'rgba(244, 67, 54, 0.18)';
    ds1.fill = true;

    this.lineChart.update();
  }

  // BAR: Top movers
  const topLabels = this.top.map(x => x.name);
  const totals = this.top.map(x => x.total);

  const barData = {
    labels: topLabels,
    datasets: [
      {
        label: 'Movimiento total',
        data: totals,
        backgroundColor: 'rgba(76, 175, 80, 0.35)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  if (!this.barChart) {
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: barData,
      options: barOptions
    });
  } else {
    this.barChart.data.labels = topLabels as any;

    const ds = this.barChart.data.datasets[0] as any;
    ds.data = totals as any;
    ds.backgroundColor = 'rgba(76, 175, 80, 0.35)';
    ds.borderColor = 'rgba(76, 175, 80, 1)';
    ds.borderWidth = 1;

    this.barChart.update();
  }
}

}
