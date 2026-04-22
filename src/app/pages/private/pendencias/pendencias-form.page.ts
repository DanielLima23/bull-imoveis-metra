import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../../../shared/components/async-search-select/async-search-select.component';
import { HeaderBreadcrumb, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PagedResult, PendencyTypeDto, PropertyDto } from '../../../core/models/domain.model';
import { PendencyApiService } from '../../../core/services/pendency-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { toPropertySelectOption } from '../../../shared/utils/select-option.util';

@Component({
  selector: 'app-pendencias-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, DateTimeBrInputDirective, AsyncSearchSelectComponent],
  templateUrl: './pendencias-form.page.html',
  styleUrl: './pendencias-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PendenciasFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PendencyApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly propertyContextId = signal(this.route.snapshot.queryParamMap.get('propertyId'));
  readonly context = signal(this.route.snapshot.queryParamMap.get('context') ?? '');
  readonly scopedProperty = signal<PropertyDto | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly isPropertyScoped = computed(() => this.context() === 'property-pendencies' && !!this.propertyContextId());
  readonly headerTitle = computed(() => {
    if (this.isEdit()) {
      return this.isPropertyScoped() ? 'Editar pendência do imóvel' : 'Editar Pendência';
    }

    return this.isPropertyScoped() ? 'Nova pendência do imóvel' : 'Nova Pendência';
  });
  readonly breadcrumbs = computed<HeaderBreadcrumb[]>(() => {
    if (this.isPropertyScoped()) {
      return [
        { label: 'Painel', route: '/app/dashboard' },
        { label: 'Imóveis', route: '/app/imoveis' },
        { label: this.scopedProperty()?.title ?? 'Imóvel', route: this.getPropertyReturnRoute() ?? undefined },
        { label: 'Pendências', route: this.getPropertyReturnRoute() ?? undefined },
        { label: this.isEdit() ? 'Editar' : 'Novo' }
      ];
    }

    return [
      { label: 'Painel', route: '/app/dashboard' },
      { label: 'Pendências', route: '/app/pendencias' },
      { label: this.isEdit() ? 'Editar' : 'Novo' }
    ];
  });
  readonly submitting = signal(false);
  readonly types = signal<PendencyTypeDto[]>([]);
  readonly pendencyTypeOptions = computed<SelectOption[]>(() =>
    this.types().map((item) => ({
      id: item.id,
      label: `${item.code ? `${item.code} · ` : ''}${item.name} (${item.defaultSlaDays}d)`
    }))
  );

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
    pendencyTypeId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    residenceNumber: [''],
    dueAtUtc: [new Date().toISOString().slice(0, 16), Validators.required]
  });

  ngOnInit(): void {
    this.api.listTypes().subscribe({ next: (types) => this.types.set(types) });

    if (this.propertyContextId()) {
      this.loadScopedProperty(this.propertyContextId()!);
    }

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      this.prefillScopedProperty();
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          propertyId: item.propertyId,
          pendencyTypeId: item.pendencyTypeId,
          title: item.title,
          description: item.description ?? '',
          residenceNumber: item.residenceNumber ? String(item.residenceNumber) : '',
          dueAtUtc: item.dueAtUtc.slice(0, 16)
        });

        this.form.controls.propertyId.disable();
        this.form.controls.pendencyTypeId.disable();
      },
      error: () => this.toast.error('Falha ao carregar pendência para edição.')
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
    const residenceNumber = payload.residenceNumber ? Number(payload.residenceNumber) : undefined;

    if (!id) {
      this.api
        .create({
          propertyId: payload.propertyId,
          pendencyTypeId: payload.pendencyTypeId,
          title: payload.title,
          description: payload.description || undefined,
          residenceNumber,
          dueAtUtc: payload.dueAtUtc
        })
        .subscribe({
          next: () => this.handleSuccess('Pendência criada com sucesso.'),
          error: () => this.handleError('Falha ao criar pendência.')
        });
      return;
    }

    this.api
      .update(id, {
        title: payload.title,
        description: payload.description || undefined,
        residenceNumber,
        dueAtUtc: payload.dueAtUtc
      })
      .subscribe({
        next: () => this.handleSuccess('Pendência atualizada com sucesso.'),
        error: () => this.handleError('Falha ao atualizar pendência.')
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
      await this.router.navigate(['/app/imoveis', propertyId, 'pendencias']);
      return;
    }

    await this.router.navigate(['/app/pendencias']);
  }

  private getPropertyReturnRoute(): string | null {
    const propertyId = this.propertyContextId();
    return propertyId ? `/app/imoveis/${propertyId}/pendencias` : null;
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
