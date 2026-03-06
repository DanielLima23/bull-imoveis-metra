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
import { PendencyTypeDto, PagedResult, PropertyDto } from '../../../core/models/domain.model';
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
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly types = signal<PendencyTypeDto[]>([]);
  readonly pendencyTypeOptions = computed<SelectOption[]>(() =>
    this.types().map((item) => ({
      id: item.id,
      label: `${item.name} (${item.defaultSlaDays}d)`
    }))
  );

  readonly propertySelectFetchPage: AsyncSelectFetchPage = (query) =>
    this.propertyApi
      .list(query.search, '', query.page, query.pageSize, { silent: true })
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
    dueAtUtc: [new Date().toISOString().slice(0, 16), Validators.required]
  });

  ngOnInit(): void {
    this.api.listTypes().subscribe({ next: (types) => this.types.set(types) });

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          propertyId: item.propertyId,
          pendencyTypeId: item.pendencyTypeId,
          title: item.title,
          description: item.description ?? '',
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

    if (!id) {
      this.api
        .create({
          propertyId: payload.propertyId,
          pendencyTypeId: payload.pendencyTypeId,
          title: payload.title,
          description: payload.description || undefined,
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
        dueAtUtc: payload.dueAtUtc
      })
      .subscribe({
        next: () => this.handleSuccess('Pendência atualizada com sucesso.'),
        error: () => this.handleError('Falha ao atualizar pendência.')
      });
  }

  back(): void {
    void this.router.navigate(['/app/pendencias']);
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.router.navigate(['/app/pendencias']);
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


