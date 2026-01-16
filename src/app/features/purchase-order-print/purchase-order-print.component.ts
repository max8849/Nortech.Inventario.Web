import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PurchaseOrdersApi } from '../../core/api/purchase-orders.api';

type PoItem = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
};

type PoDetail = {
  id: number;
  status: any;
  branchName: string;
  note?: string | null;
  createdAtUtc: string;
  items: PoItem[];
};

@Component({
  selector: 'app-purchase-order-print',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './purchase-order-print.component.html',
  styleUrls: ['./purchase-order-print.component.scss']
})
export class PurchaseOrderPrintComponent implements OnInit {
  loading = false;

  isAdmin = ((localStorage.getItem('role') || '').toLowerCase() === 'admin');

  id = 0;
  po: PoDetail | null = null;

  printedAt = new Date().toISOString();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: PurchaseOrdersApi
  ) {}

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.router.navigateByUrl('/purchase-orders');
      return;
    }

    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (!this.id) {
      this.router.navigateByUrl('/purchase-orders');
      return;
    }

    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get(this.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: any) => {
          const items = (data.items || data.Items || []).map((x: any) => ({
            id: x.id ?? x.Id,
            sku: x.sku ?? x.Sku,
            name: x.name ?? x.Name,
            unit: x.unit ?? x.Unit,
            quantityOrdered: Number(x.quantityOrdered ?? x.QuantityOrdered ?? 0),
          })) as PoItem[];

          this.po = {
            id: data.id ?? data.Id,
            status: data.status ?? data.Status,
            branchName: data.branchName ?? data.BranchName,
            note: data.note ?? data.Note,
            createdAtUtc: data.createdAtUtc ?? data.CreatedAtUtc,
            items: items.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
          };

          // auto imprimir
          setTimeout(() => this.print(), 200);
        },
        error: () => this.router.navigateByUrl('/purchase-orders')
      });
  }

  back(): void {
    this.router.navigateByUrl(`/purchase-orders/${this.id}`);
  }

  print(): void {
    window.print();
  }

  dt(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
