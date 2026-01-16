// Coincide con tu enum en .NET:
// In = 1, Out = 2, Adjust = 3
export type MovementType = 1 | 2 | 3;

export interface MovementItemCreate {
  productId: number;
  quantity: number;
  unitCost?: number | null;
}

export interface MovementCreate {
  type: MovementType;
  note?: string | null;
  items: MovementItemCreate[];
}
