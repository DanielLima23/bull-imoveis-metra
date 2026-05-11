import { PropertyMonthlyStatementLineDto } from '../../../core/models/domain.model';

export type CellState = 'paid' | 'pending' | 'overdue' | 'empty';

export interface CalendarCell {
  state: CellState;
  /** Valor pago (state=paid) ou valor esperado (state=pending/overdue) */
  amount: number | null;
  /** Data de pagamento formatada (state=paid) */
  paidDate: string | null;
  /** Linha de origem para referência */
  sourceLine: PropertyMonthlyStatementLineDto | null;
}

export interface CalendarRow {
  /** Índice do mês: 1–12 */
  month: number;
  /** Rótulo abreviado: Jan, Fev, ... */
  monthLabel: string;
  rent: CalendarCell;
  iptu: CalendarCell;
  condominium: CalendarCell;
  water: CalendarCell;
  electricity: CalendarCell;
  gas: CalendarCell;
  extra: CalendarCell;
}

export interface CalendarColumn {
  key: keyof Omit<CalendarRow, 'month' | 'monthLabel'>;
  label: string;
  /** Valores de kind aceitos (case-insensitive) */
  kinds: string[];
}

export const CALENDAR_COLUMNS: CalendarColumn[] = [
  { key: 'rent',        label: 'Aluguel',    kinds: ['RENT', 'ALUGUEL'] },
  { key: 'iptu',        label: 'IPTU',       kinds: ['IPTU'] },
  { key: 'condominium', label: 'Condomínio', kinds: ['CONDOMINIO', 'CONDOMÍNIO', 'CONDO'] },
  { key: 'water',       label: 'Água',       kinds: ['AGUA', 'ÁGUA', 'WATER'] },
  { key: 'electricity', label: 'Luz',        kinds: ['LUZ', 'ELECTRICITY', 'ENERGIA'] },
  { key: 'gas',         label: 'Gás',        kinds: ['GAS', 'GÁS'] },
  { key: 'extra',       label: 'Extra',      kinds: [] }, // fallback
];

export const MONTH_LABELS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];
