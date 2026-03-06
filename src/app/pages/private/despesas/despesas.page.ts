import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { ExpenseApiService } from '../../../core/services/expense-api.service';
import { ExpenseDto, ExpenseTypeDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';

@Component({
  selector: 'app-despesas-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, TablePaginationComponent, BrlCurrencyPipe, DateOnlyBrPipe, RouterLink],
  templateUrl: './despesas.page.html',
  styleUrl: './despesas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DespesasPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly items = signal<ExpenseDto[]>([]);
  readonly types = signal<ExpenseTypeDto[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });

  readonly showTypeForm = signal(false);
  readonly typeSubmitting = signal(false);

  readonly typeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    isFixedCost: [true]
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.items();
    }

    return this.items().filter((item) =>
      [item.propertyTitle, item.expenseTypeName, item.description, item.status].some((value) => value.toLowerCase().includes(term))
    );
  });

  readonly activeMenuItem = computed(() => {
    const id = this.activeMenuId();
    if (!id) {
      return null;
    }

    return this.items().find((item) => item.id === id) ?? null;
  });

  ngOnInit(): void {
    this.loadTypes();
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.isLoading.set(true);
    this.expenseApi.list(this.page(), this.pageSize()).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.totalItems.set(result.totalItems);
        this.totalPages.set(result.totalPages);
        this.activeMenuId.set(null);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Falha ao carregar despesas.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(page: number): void {
    if (page === this.page()) {
      return;
    }

    this.page.set(page);
    this.loadExpenses();
  }

  onPageSizeChange(pageSize: number): void {
    if (pageSize === this.pageSize()) {
      return;
    }

    this.pageSize.set(pageSize);
    this.page.set(1);
    this.loadExpenses();
  }

  toggleRowMenu(event: MouseEvent, id: string): void {
    if (this.activeMenuId() === id) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 150;

    let x = rect.right - menuWidth;
    x = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));

    let y = rect.bottom + 8;
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, rect.top - menuHeight - 8);
    }

    this.menuPosition.set({ x, y });
    this.activeMenuId.set(id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  loadTypes(): void {
    this.expenseApi.listTypes().subscribe({ next: (types) => this.types.set(types) });
  }

  toggleTypeForm(): void {
    this.showTypeForm.update((current) => !current);
  }

  createType(): void {
    if (this.typeForm.invalid || this.typeSubmitting()) {
      this.typeForm.markAllAsTouched();
      return;
    }

    this.typeSubmitting.set(true);
    this.expenseApi.createType(this.typeForm.getRawValue()).subscribe({
      next: () => {
        this.typeSubmitting.set(false);
        this.typeForm.reset({ name: '', category: '', isFixedCost: true });
        this.showTypeForm.set(false);
        this.toast.success('Tipo de despesa criado.');
        this.loadTypes();
      },
      error: () => {
        this.typeSubmitting.set(false);
        this.toast.error('Falha ao criar tipo de despesa.');
      }
    });
  }

  pay(item: ExpenseDto): void {
    this.expenseApi.markPaid(item.id).subscribe({
      next: () => {
        this.toast.success('Despesa marcada como paga.');
        this.activeMenuId.set(null);
        this.loadExpenses();
      },
      error: () => this.toast.error('Falha ao atualizar despesa.')
    });
  }
}

