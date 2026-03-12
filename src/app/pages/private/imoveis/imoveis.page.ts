import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExpenseTypeDto, PendencyTypeDto, PropertyDto } from '../../../core/models/domain.model';
import { ExpenseApiService } from '../../../core/services/expense-api.service';
import { PendencyApiService } from '../../../core/services/pendency-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';
import { getFloatingMenuPosition } from '../../../shared/utils/floating-menu.util';

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
    AsyncSearchSelectComponent,
    DomainLabelPipe
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

  readonly isLoading = signal(false);
  readonly items = signal<PropertyDto[]>([]);
  readonly search = signal('');
  readonly city = signal('');
  readonly status = signal('');
  readonly propertyType = signal('');
  readonly occupancyStatus = signal('');
  readonly assetState = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly quickModal = signal<'expense' | 'pendency' | 'rent' | 'status' | null>(null);
  readonly selectedProperty = signal<PropertyDto | null>(null);
  readonly activeMenuItem = computed(() => this.items().find((item) => item.id === this.activeMenuId()) ?? null);

  readonly expenseTypes = signal<ExpenseTypeDto[]>([]);
  readonly pendencyTypes = signal<PendencyTypeDto[]>([]);
  readonly expenseTypeOptions = computed<SelectOption[]>(() => this.expenseTypes().map((item) => ({ id: item.id, label: item.name })));
  readonly pendencyTypeOptions = computed<SelectOption[]>(() =>
    this.pendencyTypes().map((item) => ({
      id: item.id,
      label: `${item.code ? `${item.code} · ` : ''}${item.name}`
    }))
  );
  readonly propertyStatusOptions = getDomainOptions('propertyStatus', { includeEmptyOption: true, emptyLabel: 'Todos' });
  readonly propertyTypeOptions: SelectOption[] = [
    { id: '', label: 'Todos' },
    { id: 'Casa', label: 'Casa' },
    { id: 'Apartamento', label: 'Apartamento' },
    { id: 'Comercial', label: 'Comercial' },
    { id: 'Terreno', label: 'Terreno' }
  ];
  readonly occupancyStatusOptions = getDomainOptions('occupancyStatus', { includeEmptyOption: true, emptyLabel: 'Todos' });
  readonly assetStateOptions = getDomainOptions('assetState', { includeEmptyOption: true, emptyLabel: 'Todos' });
  readonly frequencyOptions = getDomainOptions('expenseFrequency');

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

  readonly statusQuickForm = this.fb.nonNullable.group({
    occupancyStatus: ['', Validators.required],
    assetState: ['', Validators.required]
  });

  ngOnInit(): void {
    this.load();
    this.expenseApi.listTypes().subscribe({ next: (items) => this.expenseTypes.set(items) });
    this.pendencyApi.listTypes().subscribe({ next: (items) => this.pendencyTypes.set(items) });
  }

  ngOnDestroy(): void {
    this.listRequestSub?.unsubscribe();
  }

  load(showLoading = true): void {
    this.listRequestSub?.unsubscribe();
    if (showLoading) {
      this.isLoading.set(true);
    }

    this.listRequestSub = this.propertyApi
      .list(
        {
          search: this.search().trim() || undefined,
          city: this.city().trim() || undefined,
          status: this.status().trim() || undefined,
          propertyType: this.propertyType().trim() || undefined,
          occupancyStatus: this.occupancyStatus().trim() || undefined,
          assetState: this.assetState().trim() || undefined,
          page: this.page(),
          pageSize: this.pageSize()
        },
        showLoading ? undefined : { silent: true }
      )
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.page.set(result.page);
          this.pageSize.set(result.pageSize);
          this.totalItems.set(result.totalItems);
          this.totalPages.set(result.totalPages);
          this.activeMenuId.set(null);
          this.isLoading.set(false);
          this.listRequestSub = null;
        },
        error: () => {
          this.toast.error('Falha ao carregar imóveis.');
          this.isLoading.set(false);
          this.listRequestSub = null;
        }
      });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load(false);
  }

  onCityInput(value: string): void {
    this.city.set(value);
    this.page.set(1);
    this.load(false);
  }

  onStatusChange(value: string): void {
    this.status.set(value);
    this.page.set(1);
    this.load(false);
  }

  onPropertyTypeChange(value: string): void {
    this.propertyType.set(value);
    this.page.set(1);
    this.load(false);
  }

  onOccupancyChange(value: string): void {
    this.occupancyStatus.set(value);
    this.page.set(1);
    this.load(false);
  }

  onAssetStateChange(value: string): void {
    this.assetState.set(value);
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

  toggleRowMenu(event: MouseEvent, propertyId: string): void {
    if (this.activeMenuId() === propertyId) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    this.menuPosition.set(getFloatingMenuPosition(trigger, 248, 318));
    this.activeMenuId.set(propertyId);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  openPropertyDetail(propertyId: string): void {
    this.closeRowMenu();
    void this.router.navigate(['/app/imoveis', propertyId]);
  }

  openPropertyLeases(propertyId: string): void {
    this.closeRowMenu();
    void this.router.navigate(['/app/imoveis', propertyId], { queryParams: { tab: 'locacoes' } });
  }

  openQuickModal(type: 'expense' | 'pendency' | 'rent' | 'status', property: PropertyDto): void {
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

    this.statusQuickForm.reset({
      occupancyStatus: property.occupancyStatus ?? '',
      assetState: property.assetState ?? ''
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
        notes: payload.notes || undefined
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
        description: payload.description || undefined,
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

    this.propertyApi.addRentReference(property.id, this.rentQuickForm.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Valor de referência atualizado.');
        this.closeQuickModal();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao atualizar valor de referência.')
    });
  }

  submitQuickStatus(): void {
    const property = this.selectedProperty();
    if (!property || this.statusQuickForm.invalid) {
      this.statusQuickForm.markAllAsTouched();
      return;
    }

    this.propertyApi.updateStatus(property.id, this.statusQuickForm.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Situação do imóvel atualizada.');
        this.closeQuickModal();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao atualizar situação do imóvel.')
    });
  }
}
