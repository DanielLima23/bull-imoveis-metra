import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { PropertyDto, ExpenseTypeDto, PendencyTypeDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';
import { ExpenseApiService } from '../../../core/services/expense-api.service';
import { PendencyApiService } from '../../../core/services/pendency-api.service';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';

@Component({
  selector: 'app-imoveis-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    TablePaginationComponent,
    RouterLink,
    BrlCurrencyInputDirective,
    DateBrInputDirective,
    DateTimeBrInputDirective,
    AsyncSearchSelectComponent
  ],
  templateUrl: './imoveis.page.html',
  styleUrl: './imoveis.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisPage implements OnInit, OnDestroy {
  private readonly propertyApi = inject(PropertyApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly pendencyApi = inject(PendencyApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private listRequestSub: Subscription | null = null;
  private listRequestUsesSkeleton = false;

  readonly isLoading = signal(false);
  readonly items = signal<PropertyDto[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly quickModal = signal<'expense' | 'pendency' | 'rent' | null>(null);
  readonly selectedProperty = signal<PropertyDto | null>(null);

  readonly expenseTypes = signal<ExpenseTypeDto[]>([]);
  readonly pendencyTypes = signal<PendencyTypeDto[]>([]);
  readonly propertyStatusOptions: SelectOption[] = [
    { id: 'AVAILABLE', label: 'Disponível' },
    { id: 'LEASED', label: 'Locado' },
    { id: 'PREPARATION', label: 'Preparação' }
  ];
  readonly expenseTypeOptions = computed<SelectOption[]>(() =>
    this.expenseTypes().map((item) => ({
      id: item.id,
      label: item.name
    }))
  );
  readonly frequencyOptions: SelectOption[] = [
    { id: 'ONE_TIME', label: 'Eventual' },
    { id: 'MONTHLY', label: 'Mensal' },
    { id: 'YEARLY', label: 'Anual' }
  ];
  readonly pendencyTypeOptions = computed<SelectOption[]>(() =>
    this.pendencyTypes().map((item) => ({
      id: item.id,
      label: `${item.name} (${item.defaultSlaDays}d)`
    }))
  );

  readonly activeMenuProperty = computed(() => {
    const id = this.activeMenuId();
    if (!id) {
      return null;
    }

    return this.items().find((item) => item.id === id) ?? null;
  });

  readonly expenseQuickForm = this.fb.nonNullable.group({
    expenseTypeId: ['', Validators.required],
    description: ['', Validators.required],
    frequency: ['MONTHLY', Validators.required],
    dueDate: [new Date().toISOString().slice(0, 10), Validators.required],
    totalAmount: [0, [Validators.required, Validators.min(1)]],
    installmentsCount: [1, [Validators.required, Validators.min(1)]],
    isRecurring: [true],
    yearlyMonth: [1],
    notes: ['']
  });

  readonly pendencyQuickForm = this.fb.nonNullable.group({
    pendencyTypeId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    dueAtUtc: [new Date().toISOString().slice(0, 16), Validators.required]
  });

  readonly rentQuickForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    effectiveFrom: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  ngOnInit(): void {
    this.load();
    this.loadQuickLookups();
  }

  ngOnDestroy(): void {
    this.cancelListRequest();
  }

  load(showLoading = true): void {
    this.cancelListRequest();
    this.listRequestUsesSkeleton = showLoading;

    if (showLoading) {
      this.isLoading.set(true);
    }

    this.listRequestSub = this.propertyApi
      .list(this.search().trim(), '', this.page(), this.pageSize(), showLoading ? undefined : { silent: true })
      .subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.totalItems.set(result.totalItems);
        this.totalPages.set(result.totalPages);
        this.activeMenuId.set(null);
        this.listRequestSub = null;
        if (this.listRequestUsesSkeleton) {
          this.isLoading.set(false);
        }
        this.listRequestUsesSkeleton = false;
      },
      error: () => {
        this.toast.error('Falha ao carregar imóveis.');
        this.listRequestSub = null;
        if (this.listRequestUsesSkeleton) {
          this.isLoading.set(false);
        }
        this.listRequestUsesSkeleton = false;
      }
    });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load(false);
  }

  onPageChange(page: number): void {
    if (page === this.page()) {
      return;
    }

    this.page.set(page);
    this.load();
  }

  onPageSizeChange(pageSize: number): void {
    if (pageSize === this.pageSize()) {
      return;
    }

    this.pageSize.set(pageSize);
    this.page.set(1);
    this.load();
  }

  changeStatus(item: PropertyDto, status: string): void {
    this.propertyApi.updateStatus(item.id, status).subscribe({
      next: () => {
        this.toast.success('Status atualizado.');
        this.load();
      },
      error: () => this.toast.error('Falha ao atualizar status.')
    });
  }

  toggleRowMenu(event: MouseEvent, propertyId: string): void {
    if (this.activeMenuId() === propertyId) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 228;
    const menuHeight = 264;

    let x = rect.right - menuWidth;
    x = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));

    let y = rect.bottom + 8;
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, rect.top - menuHeight - 8);
    }

    this.menuPosition.set({ x, y });
    this.activeMenuId.set(propertyId);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  openPropertyTenants(propertyId: string): void {
    this.closeRowMenu();
    void this.router.navigate(['/app/imoveis', propertyId, 'locatarios']);
  }

  openQuickModal(type: 'expense' | 'pendency' | 'rent', property: PropertyDto): void {
    this.selectedProperty.set(property);
    this.quickModal.set(type);
    this.closeRowMenu();

    this.expenseQuickForm.reset({
      expenseTypeId: '',
      description: '',
      frequency: 'MONTHLY',
      dueDate: new Date().toISOString().slice(0, 10),
      totalAmount: 0,
      installmentsCount: 1,
      isRecurring: true,
      yearlyMonth: 1,
      notes: ''
    });

    this.pendencyQuickForm.reset({
      pendencyTypeId: '',
      title: '',
      description: '',
      dueAtUtc: new Date().toISOString().slice(0, 16)
    });

    this.rentQuickForm.reset({
      amount: property.currentBaseRent ?? 0,
      effectiveFrom: new Date().toISOString().slice(0, 10)
    });
  }

  closeQuickModal(): void {
    this.quickModal.set(null);
    this.selectedProperty.set(null);
  }

  submitQuickExpense(): void {
    const property = this.selectedProperty();
    if (!property || this.expenseQuickForm.invalid) {
      this.expenseQuickForm.markAllAsTouched();
      return;
    }

    const payload = this.expenseQuickForm.getRawValue();
    this.expenseApi
      .create({
        propertyId: property.id,
        expenseTypeId: payload.expenseTypeId,
        description: payload.description,
        frequency: payload.frequency,
        dueDate: payload.dueDate,
        totalAmount: payload.totalAmount,
        installmentsCount: payload.installmentsCount,
        isRecurring: payload.isRecurring,
        yearlyMonth: payload.yearlyMonth,
        notes: payload.notes
      })
      .subscribe({
        next: () => {
          this.toast.success('Conta vinculada ao imóvel.');
          this.closeQuickModal();
        },
        error: () => this.toast.error('Falha ao criar conta.')
      });
  }

  submitQuickPendency(): void {
    const property = this.selectedProperty();
    if (!property || this.pendencyQuickForm.invalid) {
      this.pendencyQuickForm.markAllAsTouched();
      return;
    }

    const payload = this.pendencyQuickForm.getRawValue();
    this.pendencyApi
      .create({
        propertyId: property.id,
        pendencyTypeId: payload.pendencyTypeId,
        title: payload.title,
        description: payload.description,
        dueAtUtc: payload.dueAtUtc
      })
      .subscribe({
        next: () => {
          this.toast.success('Pendência vinculada ao imóvel.');
          this.closeQuickModal();
        },
        error: () => this.toast.error('Falha ao criar pendência.')
      });
  }

  submitQuickRentReference(): void {
    const property = this.selectedProperty();
    if (!property || this.rentQuickForm.invalid) {
      this.rentQuickForm.markAllAsTouched();
      return;
    }

    const payload = this.rentQuickForm.getRawValue();
    this.propertyApi.addRentReference(property.id, payload).subscribe({
      next: () => {
        this.toast.success('Valor de referência atualizado.');
        this.closeQuickModal();
        this.load();
      },
      error: () => this.toast.error('Falha ao atualizar valor de referência.')
    });
  }

  private loadQuickLookups(): void {
    this.expenseApi.listTypes().subscribe({ next: (items) => this.expenseTypes.set(items) });
    this.pendencyApi.listTypes().subscribe({ next: (items) => this.pendencyTypes.set(items) });
  }

  private cancelListRequest(): void {
    if (!this.listRequestSub) {
      return;
    }

    this.listRequestSub.unsubscribe();
    this.listRequestSub = null;
    if (this.listRequestUsesSkeleton) {
      this.isLoading.set(false);
    }
    this.listRequestUsesSkeleton = false;
  }
}

