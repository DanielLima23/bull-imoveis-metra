import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PagedResult, PropertyDto } from '../../../core/models/domain.model';
import { MaintenanceApiService } from '../../../core/services/maintenance-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { toPropertySelectOption } from '../../../shared/utils/select-option.util';

@Component({
  selector: 'app-manutencoes-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, BrlCurrencyInputDirective, DateTimeBrInputDirective, AsyncSearchSelectComponent],
  templateUrl: './manutencoes-form.page.html',
  styleUrl: './manutencoes-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManutencoesFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MaintenanceApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly priorityOptions: SelectOption[] = [
    { id: 'LOW', label: 'Baixa' },
    { id: 'MEDIUM', label: 'Média' },
    { id: 'HIGH', label: 'Alta' }
  ];
  readonly statusOptions: SelectOption[] = [
    { id: 'OPEN', label: 'Aberta' },
    { id: 'IN_PROGRESS', label: 'Em andamento' },
    { id: 'DONE', label: 'Concluída' },
    { id: 'CANCELED', label: 'Cancelada' }
  ];

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
    title: ['', Validators.required],
    description: ['', Validators.required],
    priority: ['MEDIUM', Validators.required],
    estimatedCost: [0],
    actualCost: [0],
    status: ['OPEN', Validators.required],
    startedAtUtc: [''],
    finishedAtUtc: [''],
    notes: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          propertyId: item.propertyId,
          title: item.title,
          description: item.description,
          priority: item.priority,
          estimatedCost: item.estimatedCost ?? 0,
          actualCost: item.actualCost ?? 0,
          status: item.status,
          startedAtUtc: item.startedAtUtc ? item.startedAtUtc.slice(0, 16) : '',
          finishedAtUtc: item.finishedAtUtc ? item.finishedAtUtc.slice(0, 16) : '',
          notes: item.notes ?? ''
        });

        this.form.controls.propertyId.disable();
      },
      error: () => this.toast.error('Falha ao carregar manutenção para edição.')
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
      this.api
        .create({
          propertyId: payload.propertyId,
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          estimatedCost: payload.estimatedCost || undefined,
          notes: payload.notes || undefined
        })
        .subscribe({
          next: () => this.handleSuccess('Manutenção criada com sucesso.'),
          error: () => this.handleError('Falha ao criar manutenção.')
        });
      return;
    }

    this.api
      .update(id, {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        estimatedCost: payload.estimatedCost || undefined,
        actualCost: payload.actualCost || undefined,
        status: payload.status,
        startedAtUtc: payload.startedAtUtc || undefined,
        finishedAtUtc: payload.finishedAtUtc || undefined,
        notes: payload.notes || undefined
      })
      .subscribe({
        next: () => this.handleSuccess('Manutenção atualizada com sucesso.'),
        error: () => this.handleError('Falha ao atualizar manutenção.')
      });
  }

  back(): void {
    void this.router.navigate(['/app/manutencoes']);
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.router.navigate(['/app/manutencoes']);
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.toast.error(message);
  }

  private mapOptionsResult(result: PagedResult<PropertyDto>): PagedResult<SelectOption> {
    return {
      ...result,
      items: result.items.map((item) => toPropertySelectOption(item))
    };
  }
}

