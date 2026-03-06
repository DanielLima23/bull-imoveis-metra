import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AsyncSearchSelectComponent } from '../async-search-select/async-search-select.component';
import { SelectOption } from '../../models/select-option.model';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [AsyncSearchSelectComponent],
  templateUrl: './table-pagination.component.html',
  styleUrl: './table-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TablePaginationComponent {
  readonly page = input<number>(1);
  readonly pageSize = input<number>(10);
  readonly totalItems = input<number>(0);
  readonly totalPages = input<number>(1);
  readonly pageSizeOptions = input<number[]>([10, 20, 50]);
  readonly loading = input<boolean>(false);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly selectedPageSize = computed(() => String(this.pageSize()));
  readonly pageSizeSelectOptions = computed<SelectOption[]>(() =>
    this.pageSizeOptions().map((option) => ({
      id: String(option),
      label: String(option)
    }))
  );

  readonly fromItem = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return 0;
    }

    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly toItem = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return 0;
    }

    return Math.min(total, this.page() * this.pageSize());
  });

  readonly canGoPrevious = computed(() => this.page() > 1);
  readonly canGoNext = computed(() => this.page() < Math.max(this.totalPages(), 1));

  previous(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.pageChange.emit(this.page() - 1);
  }

  next(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.pageChange.emit(this.page() + 1);
  }

  changePageSize(value: string): void {
    const pageSize = Number(value);
    if (!Number.isFinite(pageSize) || pageSize <= 0 || pageSize === this.pageSize()) {
      return;
    }

    this.pageSizeChange.emit(pageSize);
  }
}
