import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LeaseDto, PagedResult } from '../../../core/models/domain.model';
import { LeaseApiService } from '../../../core/services/lease-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { TenantApiService } from '../../../core/services/tenant-api.service';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { toPropertySelectOption, toTenantSelectOption } from '../../../shared/utils/select-option.util';

@Component({
  selector: 'app-locacoes-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, BrlCurrencyInputDirective, DateBrInputDirective, AsyncSearchSelectComponent],
  templateUrl: './locacoes-form.page.html',
  styleUrl: './locacoes-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocacoesFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly leaseApi = inject(LeaseApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly tenantApi = inject(TenantApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly returnTo = signal<string | null>(null);
  readonly selectedLease = signal<LeaseDto | null>(null);
  readonly leaseStatusOptions: SelectOption[] = [
    { id: 'DRAFT', label: 'Rascunho' },
    { id: 'ACTIVE', label: 'Ativa' },
    { id: 'ENDED', label: 'Encerrada' },
    { id: 'CANCELED', label: 'Cancelada' }
  ];

  readonly propertySelectFetchPage: AsyncSelectFetchPage = (query) =>
    this.propertyApi
      .list(query.search, '', query.page, query.pageSize, { silent: true })
      .pipe(map((result) => this.mapOptionsResult(result, toPropertySelectOption)));

  readonly propertySelectFetchById: AsyncSelectFetchById = (id) =>
    this.propertyApi.getById(id, { silent: true }).pipe(
      map((item) => toPropertySelectOption(item)),
      catchError(() => of(null))
    );

  readonly tenantSelectFetchPage: AsyncSelectFetchPage = (query) =>
    this.tenantApi
      .list(query.search, query.page, query.pageSize, { active: true, silent: true })
      .pipe(map((result) => this.mapOptionsResult(result, toTenantSelectOption)));

  readonly tenantSelectFetchById: AsyncSelectFetchById = (id) =>
    this.tenantApi.getById(id, { silent: true }).pipe(
      map((item) => toTenantSelectOption(item)),
      catchError(() => of(null))
    );

  readonly form = this.fb.nonNullable.group({
    propertyId: ['', Validators.required],
    tenantId: ['', Validators.required],
    startDate: [new Date().toISOString().slice(0, 10), Validators.required],
    endDate: [''],
    monthlyRent: [0, [Validators.required, Validators.min(1)]],
    depositAmount: [0],
    status: ['ACTIVE', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    const requestedPropertyId = this.route.snapshot.queryParamMap.get('propertyId');
    const requestedTenantId = this.route.snapshot.queryParamMap.get('tenantId');
    this.returnTo.set(this.normalizeReturnTo(this.route.snapshot.queryParamMap.get('returnTo')));

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      if (requestedPropertyId) {
        this.form.controls.propertyId.setValue(requestedPropertyId);
        this.form.controls.propertyId.disable();
      }

      if (requestedTenantId) {
        this.form.controls.tenantId.setValue(requestedTenantId);
      }

      return;
    }

    this.leaseApi.getById(id).subscribe({
      next: (item) => {
        this.selectedLease.set(item);
        this.form.patchValue({
          propertyId: item.propertyId,
          tenantId: item.tenantId,
          startDate: item.startDate,
          endDate: item.endDate ?? '',
          monthlyRent: item.monthlyRent,
          depositAmount: item.depositAmount ?? 0,
          status: item.status,
          notes: item.notes ?? ''
        });

        this.form.controls.propertyId.disable();
        this.form.controls.tenantId.disable();
      },
      error: () => this.toast.error('Falha ao carregar locação para edição.')
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
      this.leaseApi
        .create({
          propertyId: payload.propertyId,
          tenantId: payload.tenantId,
          startDate: payload.startDate,
          endDate: payload.endDate || undefined,
          monthlyRent: payload.monthlyRent,
          depositAmount: payload.depositAmount || undefined,
          notes: payload.notes || undefined
        })
        .subscribe({
          next: () => this.handleSuccess('Locação criada com sucesso.'),
          error: () => this.handleError('Falha ao criar locação.')
        });
      return;
    }

    this.leaseApi
      .update(id, {
        startDate: payload.startDate,
        endDate: payload.endDate || undefined,
        monthlyRent: payload.monthlyRent,
        depositAmount: payload.depositAmount || undefined,
        status: payload.status,
        notes: payload.notes || undefined
      })
      .subscribe({
        next: () => this.handleSuccess('Locação atualizada com sucesso.'),
        error: () => this.handleError('Falha ao atualizar locação.')
      });
  }

  back(): void {
    const returnTo = this.returnTo();
    if (returnTo) {
      void this.router.navigateByUrl(returnTo);
      return;
    }

    void this.router.navigate(['/app/locacoes']);
  }

  goToCreateTenant(): void {
    if (this.isEdit()) {
      return;
    }

    const payload = this.form.getRawValue();
    const queryParams: Record<string, string> = {
      returnTo: '/app/locacoes/new'
    };

    if (payload.propertyId) {
      queryParams['propertyId'] = payload.propertyId;
    }

    const leaseReturnTo = this.returnTo();
    if (leaseReturnTo) {
      queryParams['leaseReturnTo'] = leaseReturnTo;
    }

    void this.router.navigate(['/app/locatarios/new'], { queryParams });
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);

    const returnTo = this.returnTo();
    if (returnTo) {
      void this.router.navigateByUrl(returnTo);
      return;
    }

    void this.router.navigate(['/app/locacoes']);
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.toast.error(message);
  }

  private normalizeReturnTo(value: string | null): string | null {
    if (!value || !value.startsWith('/app/')) {
      return null;
    }

    return value;
  }

  private mapOptionsResult<T>(result: PagedResult<T>, mapper: (item: T) => SelectOption): PagedResult<SelectOption> {
    return {
      ...result,
      items: result.items.map((item) => mapper(item))
    };
  }
}

