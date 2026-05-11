import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { PropertyMonthlyStatementLineDto } from '../../../core/models/domain.model';
import { BrlCurrencyPipe } from '../../pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../pipes/date-only-br.pipe';
import {
  CalendarCell,
  CalendarRow,
  CALENDAR_COLUMNS,
  MONTH_LABELS_SHORT,
} from './calendar.models';

// ─── Pure helper functions (exported for unit/property tests) ────────────────

/**
 * Determines the priority rank of a cell state for conflict resolution.
 * Higher number = higher priority.
 */
function statePriority(state: CalendarCell['state']): number {
  switch (state) {
    case 'overdue':  return 3;
    case 'pending':  return 2;
    case 'paid':     return 1;
    default:         return 0; // 'empty'
  }
}

/**
 * Derives the cell state from a single statement line.
 */
function cellStateFromLine(line: PropertyMonthlyStatementLineDto): CalendarCell['state'] {
  const status = (line.status ?? '').toUpperCase();
  if (status === 'PAID')    return 'paid';
  if (status === 'OVERDUE') return 'overdue';
  if ((line.expectedAmount ?? 0) > 0) return 'pending';
  return 'empty';
}

/**
 * Builds a CalendarCell from a single statement line.
 */
function cellFromLine(line: PropertyMonthlyStatementLineDto): CalendarCell {
  const state = cellStateFromLine(line);
  return {
    state,
    amount: state === 'paid'
      ? (line.paidAmount ?? null)
      : (line.expectedAmount ?? null),
    paidDate: state === 'paid' ? (line.dueDate ?? null) : null,
    sourceLine: line,
  };
}

/**
 * Merges two cells, keeping the one with higher state priority.
 */
function mergeCells(a: CalendarCell, b: CalendarCell): CalendarCell {
  return statePriority(a.state) >= statePriority(b.state) ? a : b;
}

/**
 * Returns an empty CalendarCell.
 */
function emptyCell(): CalendarCell {
  return { state: 'empty', amount: null, paidDate: null, sourceLine: null };
}

/**
 * Builds 12 CalendarRow entries (one per month) from an array of statement lines.
 *
 * Rules:
 * - Always returns exactly 12 rows (months 1–12).
 * - Maps each line's `kind` (case-insensitive) to the matching CalendarColumn;
 *   falls back to the `extra` column when no match is found.
 * - State priority when multiple lines land in the same month/column:
 *   overdue > pending > paid > empty
 */
export function buildCalendarRows(
  lines: PropertyMonthlyStatementLineDto[],
): CalendarRow[] {
  // Initialise 12 empty rows
  const rows: CalendarRow[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthLabel: MONTH_LABELS_SHORT[i],
    rent:        emptyCell(),
    iptu:        emptyCell(),
    condominium: emptyCell(),
    water:       emptyCell(),
    electricity: emptyCell(),
    gas:         emptyCell(),
    extra:       emptyCell(),
  }));

  for (const line of lines) {
    // Derive the month index (1-based) from competenceDate (ISO date string)
    const competenceDate = line.competenceDate ?? '';
    const monthNumber = competenceDate ? new Date(competenceDate + 'T00:00:00').getMonth() + 1 : null;
    if (!monthNumber || monthNumber < 1 || monthNumber > 12) continue;

    const rowIndex = monthNumber - 1;
    const kindUpper = (line.kind ?? '').toUpperCase();

    // Find the matching column (case-insensitive); fallback to 'extra'
    const column =
      CALENDAR_COLUMNS.find(
        (col) => col.kinds.length > 0 && col.kinds.includes(kindUpper),
      ) ?? CALENDAR_COLUMNS.find((col) => col.key === 'extra')!;

    const key = column.key;
    const incoming = cellFromLine(line);
    rows[rowIndex][key] = mergeCells(rows[rowIndex][key], incoming);
  }

  return rows;
}

/**
 * Returns a non-empty aria-label string for a calendar cell.
 * Always contains both `categoryLabel` and `monthLabel`.
 */
export function getCellAriaLabel(
  cell: CalendarCell,
  categoryLabel: string,
  monthLabel: string,
): string {
  const base = `${categoryLabel} ${monthLabel}`;
  switch (cell.state) {
    case 'paid':
      return `${base}: pago em ${cell.paidDate ?? ''}, R$ ${cell.amount ?? 0}`;
    case 'overdue':
      return `${base}: atrasado, R$ ${cell.amount ?? 0}`;
    case 'pending':
      return `${base}: pendente, R$ ${cell.amount ?? 0}`;
    default:
      return `${base}: sem lançamento`;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-property-payment-calendar',
  standalone: true,
  imports: [BrlCurrencyPipe, DateOnlyBrPipe],
  templateUrl: './property-payment-calendar.component.html',
  styleUrl: './property-payment-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyPaymentCalendarComponent implements OnInit {
  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly propertyId = input.required<string>();
  readonly initialYear = input<number>(new Date().getFullYear());

  // ── Internal signals ──────────────────────────────────────────────────────
  readonly calendarYear = signal<number>(new Date().getFullYear());
  readonly rows = signal<CalendarRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);

  // ── Computed helpers ──────────────────────────────────────────────────────
  /** Used by the template to render skeleton rows during loading. */
  readonly skeletonRows = Array.from({ length: 12 });
  /** Column definitions exposed to the template. */
  readonly columns = CALENDAR_COLUMNS;

  // ── Injections ────────────────────────────────────────────────────────────
  private readonly propertyApi = inject(PropertyApiService);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.calendarYear.set(this.initialYear());
    this.loadCalendar();
  }

  // ── Public methods ────────────────────────────────────────────────────────

  loadCalendar(): void {
    this.loading.set(true);
    this.error.set(false);

    this.propertyApi
      .getMonthlyStatement(this.propertyId(), this.calendarYear())
      .subscribe({
        next: (statement) => {
          this.rows.set(buildCalendarRows(statement.lines ?? []));
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  previousYear(): void {
    this.calendarYear.update((y) => y - 1);
    this.loadCalendar();
  }

  nextYear(): void {
    this.calendarYear.update((y) => y + 1);
    this.loadCalendar();
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  /**
   * Delegates to the exported pure function so the template can call it
   * without importing the standalone function directly.
   */
  getCellAriaLabel(
    cell: CalendarCell,
    categoryLabel: string,
    monthLabel: string,
  ): string {
    return getCellAriaLabel(cell, categoryLabel, monthLabel);
  }
}
