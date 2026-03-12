import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { ExpenseDto, ExpenseTypeDto, PropertyDto } from '../../../core/models/domain.model';
import { ExpenseApiService } from '../../../core/services/expense-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainLabel, getDomainOptions } from '../../../shared/utils/domain-label.util';
import { getFloatingMenuPosition } from '../../../shared/utils/floating-menu.util';

@Component({
  selector: 'app-despesas-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    TablePaginationComponent,
    BrlCurrencyPipe,
    DateOnlyBrPipe,
    DomainLabelPipe,
    RouterLink,
    AsyncSearchSelectComponent,
    BrlCurrencyInputDirective
  ],
  templateUrl: './despesas.page.html',
  styleUrl: './despesas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DespesasPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly toast = inject(ToastService);

  readonly propertyId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly scopedProperty = signal<PropertyDto | null>(null);
  readonly isLoading = signal(false);
  readonly items = signal<ExpenseDto[]>([]);
  readonly overdueItems = signal<ExpenseDto[]>([]);
  readonly types = signal<ExpenseTypeDto[]>([]);
  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly statusFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly showTypeForm = signal(false);
  readonly editingTypeId = signal<string | null>(null);
  readonly payingExpense = signal<ExpenseDto | null>(null);

  readonly isPropertyScoped = computed(() => !!this.propertyId());
  readonly headerTitle = computed(() => (this.isPropertyScoped() ? 'Contas do imóvel' : 'Contas e Despesas'));
  readonly headerSubtitle = computed(() => {
    const property = this.scopedProperty();
    if (property) {
      return `Listagem de contas vinculadas a ${property.title}`;
    }

    return this.isPropertyScoped()
      ? 'Listagem de contas vinculadas ao imóvel selecionado'
      : 'Financeiro dos imóveis com tipos reutilizáveis, atrasadas e baixa manual';
  });
  readonly breadcrumbs = computed(() => {
    const items = [{ label: 'Painel', route: '/app/dashboard' }, { label: 'Imóveis', route: '/app/imoveis' }];
    if (!this.isPropertyScoped()) {
      return [...items, { label: 'Contas' }];
    }

    return [...items, { label: this.scopedProperty()?.title ?? 'Imóvel' }, { label: 'Contas' }];
  });
  readonly actionQueryParams = computed<Params | null>(() =>
    this.isPropertyScoped() ? { propertyId: this.propertyId(), context: 'property-expenses' } : null
  );
  readonly typeOptions = computed(() => [{ id: '', label: 'Todos' }, ...this.types().map((item) => ({ id: item.id, label: item.name }))]);
  readonly statusOptions = getDomainOptions('expenseStatus', { includeEmptyOption: true, emptyLabel: 'Todos' });
  readonly listColumnCount = computed(() => (this.isPropertyScoped() ? 6 : 7));
  readonly showManagementPanels = computed(() => !this.isPropertyScoped());

  readonly typeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    isFixedCost: [true]
  });

  readonly paymentForm = this.fb.nonNullable.group({
    paidAmount: [0, [Validators.required, Validators.min(0.01)]],
    paidAtUtc: [new Date().toISOString().slice(0, 16), Validators.required],
    paidBy: [''],
    notes: ['']
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.items();
    }

    return this.items().filter((item) =>
      [item.propertyTitle, item.expenseTypeName, item.description, item.status, getDomainLabel('expenseStatus', item.status)].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  });

  readonly activeMenuItem = computed(() => this.items().find((item) => item.id === this.activeMenuId()) ?? null);

  ngOnInit(): void {
    if (this.isPropertyScoped()) {
      this.loadScopedProperty();
    }

    this.loadTypes();
    this.loadExpenses();
    this.loadOverdue();
  }

  loadExpenses(): void {
    this.isLoading.set(true);
    this.expenseApi
      .list({
        propertyId: this.propertyId() || undefined,
        expenseTypeId: this.typeFilter() || undefined,
        status: this.statusFilter() || undefined,
        page: this.page(),
        pageSize: this.pageSize()
      })
      .subscribe({
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

  loadOverdue(): void {
    this.expenseApi.listOverdue().subscribe({
      next: (items) => {
        const propertyId = this.propertyId();
        this.overdueItems.set(propertyId ? items.filter((item) => item.propertyId === propertyId) : items);
      },
      error: () => undefined
    });
  }

  loadTypes(): void {
    this.expenseApi.listTypes().subscribe({ next: (types) => this.types.set(types) });
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

  onTypeChange(value: string): void {
    this.typeFilter.set(value);
    this.page.set(1);
    this.loadExpenses();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
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

    this.menuPosition.set(getFloatingMenuPosition(trigger, 230, 150));
    this.activeMenuId.set(id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  toggleTypeForm(): void {
    this.showTypeForm.update((current) => !current);
    if (!this.showTypeForm()) {
      this.cancelTypeEdit();
    }
  }

  editType(item: ExpenseTypeDto): void {
    this.showTypeForm.set(true);
    this.editingTypeId.set(item.id);
    this.typeForm.reset({
      name: item.name,
      category: item.category,
      isFixedCost: item.isFixedCost
    });
  }

  cancelTypeEdit(): void {
    this.editingTypeId.set(null);
    this.typeForm.reset({ name: '', category: '', isFixedCost: true });
  }

  saveType(): void {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    const id = this.editingTypeId();
    const request$ = id ? this.expenseApi.updateType(id, this.typeForm.getRawValue()) : this.expenseApi.createType(this.typeForm.getRawValue());

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Tipo de despesa atualizado.' : 'Tipo de despesa criado.');
        this.cancelTypeEdit();
        this.showTypeForm.set(false);
        this.loadTypes();
      },
      error: () => this.toast.error('Falha ao salvar tipo de despesa.')
    });
  }

  openPaymentModal(item: ExpenseDto): void {
    this.payingExpense.set(item);
    this.paymentForm.reset({
      paidAmount: item.totalAmount,
      paidAtUtc: new Date().toISOString().slice(0, 16),
      paidBy: '',
      notes: ''
    });
    this.activeMenuId.set(null);
  }

  closePaymentModal(): void {
    this.payingExpense.set(null);
  }

  submitPayment(): void {
    const expense = this.payingExpense();
    if (!expense || this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.expenseApi.markPaid(expense.id, this.paymentForm.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Pagamento registrado.');
        this.closePaymentModal();
        this.loadExpenses();
        this.loadOverdue();
      },
      error: () => this.toast.error('Falha ao registrar pagamento.')
    });
  }

  getFormQueryParams(propertyId: string): Params | null {
    return this.isPropertyScoped() ? { propertyId, context: 'property-expenses' } : null;
  }

  private loadScopedProperty(): void {
    this.propertyApi.getById(this.propertyId(), { silent: true }).subscribe({
      next: (property) => this.scopedProperty.set(property),
      error: () => undefined
    });
  }
}
