import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../../../shared/components/async-search-select/async-search-select.component';
import { ExpenseTypeDto, PagedResult, PropertyDto } from '../../../core/models/domain.model';
import { ExpenseApiService } from '../../../core/services/expense-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { HeaderBreadcrumb, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';
import { toPropertySelectOption } from '../../../shared/utils/select-option.util';

@Component({
  selector: 'app-despesas-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, BrlCurrencyInputDirective, DateBrInputDirective, AsyncSearchSelectComponent],
  templateUrl: './despesas-form.page.html',
  styleUrl: './despesas-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DespesasFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly propertyContextId = signal(this.route.snapshot.queryParamMap.get('propertyId'));
  readonly context = signal(this.route.snapshot.queryParamMap.get('context') ?? '');
  readonly scopedProperty = signal<PropertyDto | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly isPropertyScoped = computed(() => this.context() === 'property-expenses' && !!this.propertyContextId());
  readonly headerTitle = computed(() => {
    if (this.isEdit()) {
      return this.isPropertyScoped() ? 'Editar conta do imóvel' : 'Editar Conta';
    }

    return this.isPropertyScoped() ? 'Nova conta do imóvel' : 'Nova Conta';
  });
  readonly breadcrumbs = computed<HeaderBreadcrumb[]>(() => {
    if (this.isPropertyScoped()) {
      return [
        { label: 'Painel', route: '/app/dashboard' },
        { label: 'Imóveis', route: '/app/imoveis' },
        { label: this.scopedProperty()?.title ?? 'Imóvel', route: this.getPropertyReturnRoute() ?? undefined },
        { label: 'Contas', route: this.getPropertyReturnRoute() ?? undefined },
        { label: this.isEdit() ? 'Editar' : 'Novo' }
      ];
    }

    return [
      { label: 'Painel', route: '/app/dashboard' },
      { label: 'Contas', route: '/app/despesas' },
      { label: this.isEdit() ? 'Editar' : 'Novo' }
    ];
  });
  readonly submitting = signal(false);
  readonly types = signal<ExpenseTypeDto[]>([]);
  readonly expenseTypeOptions = computed<SelectOption[]>(() => this.types().map((item) => ({ id: item.id, label: item.name })));
  readonly frequencyOptions: SelectOption[] = getDomainOptions('expenseFrequency');
  readonly expenseStatusOptions: SelectOption[] = getDomainOptions('expenseStatus');

  readonly propertySelectFetchPage: AsyncSelectFetchPage = (query) =>
    this.propertyApi
      .list({ search: query.search, page: query.page, pageSize: query.pageSize }, { silent: true })
      .pipe(map((result) => this.mapOptionsResult(result)));

  readonly propertySelectFetchById: AsyncSelectFetchById = (id) =>
    this.propertyApi.getById(id, { silent: true }).pipe(
      map((item) => toPropertySelectOption(item)),
      catchError(() => of(null))
    );

  readonly form = this.fb.nonNullable.group({
    propertyId: ['', Validators.required],
    expenseTypeId: ['', Validators.required],
    description: ['', Validators.required],
    frequency: ['MONTHLY', Validators.required],
    dueDate: [new Date().toISOString().slice(0, 10), Validators.required],
    totalAmount: [0, [Validators.required, Validators.min(1)]],
    installmentsCount: [1, [Validators.required, Validators.min(1)]],
    isRecurring: [true],
    yearlyMonth: [1],
    status: ['PENDING', Validators.required],
    notes: ['']
  });

  readonly isYearly = computed(() => this.form.controls.frequency.value === 'YEARLY');

  ngOnInit(): void {
    this.expenseApi.listTypes().subscribe({ next: (types) => this.types.set(types) });

    if (this.propertyContextId()) {
      this.loadScopedProperty(this.propertyContextId()!);
    }

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      this.prefillScopedProperty();
      return;
    }

    this.expenseApi.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          propertyId: item.propertyId,
          expenseTypeId: item.expenseTypeId,
          description: item.description,
          frequency: item.frequency,
          dueDate: item.dueDate,
          totalAmount: item.totalAmount,
          installmentsCount: item.installmentsCount,
          isRecurring: item.isRecurring,
          yearlyMonth: item.yearlyMonth ?? 1,
          status: item.status,
          notes: item.notes ?? ''
        });

        this.form.controls.propertyId.disable();
        this.form.controls.expenseTypeId.disable();
      },
      error: () => this.toast.error('Falha ao carregar despesa para edição.')
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const id = this.id();
    const payload = this.form.getRawValue();

    if (!id) {
      this.expenseApi
        .create({
          propertyId: payload.propertyId,
          expenseTypeId: payload.expenseTypeId,
          description: payload.description,
          frequency: payload.frequency,
          dueDate: payload.dueDate,
          totalAmount: payload.totalAmount,
          installmentsCount: payload.installmentsCount,
          isRecurring: payload.isRecurring,
          yearlyMonth: payload.frequency === 'YEARLY' ? payload.yearlyMonth : undefined,
          notes: payload.notes || undefined
        })
        .subscribe({
          next: () => this.handleSuccess('Despesa criada com sucesso.'),
          error: () => this.handleError('Falha ao criar despesa.')
        });
      return;
    }

    this.expenseApi
      .update(id, {
        description: payload.description,
        frequency: payload.frequency,
        dueDate: payload.dueDate,
        totalAmount: payload.totalAmount,
        installmentsCount: payload.installmentsCount,
        isRecurring: payload.isRecurring,
        yearlyMonth: payload.frequency === 'YEARLY' ? payload.yearlyMonth : undefined,
        status: payload.status,
        notes: payload.notes || undefined
      })
      .subscribe({
        next: () => this.handleSuccess('Despesa atualizada com sucesso.'),
        error: () => this.handleError('Falha ao atualizar despesa.')
      });
  }

  back(): void {
    void this.navigateAfterSubmit();
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.navigateAfterSubmit();
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.toast.error(message);
  }

  private prefillScopedProperty(): void {
    const propertyId = this.propertyContextId();
    if (!this.isPropertyScoped() || !propertyId) {
      return;
    }

    this.form.patchValue({ propertyId });
    this.form.controls.propertyId.disable();
  }

  private async navigateAfterSubmit(): Promise<void> {
    const propertyId = this.propertyContextId() ?? this.form.getRawValue().propertyId;
    if (this.isPropertyScoped() && propertyId) {
      await this.router.navigate(['/app/imoveis', propertyId, 'contas']);
      return;
    }

    await this.router.navigate(['/app/despesas']);
  }

  private getPropertyReturnRoute(): string | null {
    const propertyId = this.propertyContextId();
    return propertyId ? `/app/imoveis/${propertyId}/contas` : null;
  }

  private loadScopedProperty(propertyId: string): void {
    this.propertyApi.getById(propertyId, { silent: true }).subscribe({
      next: (property) => this.scopedProperty.set(property),
      error: () => undefined
    });
  }

  private mapOptionsResult(result: PagedResult<PropertyDto>): PagedResult<SelectOption> {
    return {
      ...result,
      items: result.items.map((item) => toPropertySelectOption(item))
    };
  }
}
