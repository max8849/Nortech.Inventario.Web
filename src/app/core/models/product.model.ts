export interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  minStock: number;
  isActive: boolean;
  createdAtUtc?: string;
}
