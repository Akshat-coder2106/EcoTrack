export interface HistoryEntry {
  id: number;
  date: string;
  activity: string;
  category: 'transport' | 'food' | 'energy' | 'goods';
  quantity: number;
  unit: string;
  co2_kg: number;
}

export interface SupplyChainNode {
  id: string;
  source: string;
  factor: number;
  unit: string;
  category: string;
  dependencies: string[];
}
