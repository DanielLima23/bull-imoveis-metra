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
import { PropertyApiService } from '../../../core/services/property-api.service';
import { VisitApiService } from '../../../core/services/visit-api.service';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { PhoneBrInputDirective } from '../../../shared/directives/phone-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';
import { normalizePhone } from '../../../shared/utils/format.util';
import { toPropertySelectOption } from '../../../shared/utils/select-option.util';

@Component({
  selector: 'app-visitas-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, PhoneBrInputDirective, DateTimeBrInputDirective, AsyncSearchSelectComponent],
  templateUrl: './visitas-form.page.html',
  styleUrl: './visitas-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisitasFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(VisitApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly visitStatusOptions: SelectOption[] = getDomainOptions('visitStatus');

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
    scheduledAtUtc: [new Date().toISOString().slice(0, 16), Validators.required],
    contactName: ['', Validators.required],
    contactPhone: [''],
    responsibleName: [''],
    status: ['SCHEDULED', Validators.required],
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
          scheduledAtUtc: item.scheduledAtUtc.slice(0, 16),
          contactName: item.contactName,
          contactPhone: item.contactPhone ?? '',
          responsibleName: item.responsibleName ?? '',
          status: item.status,
          notes: item.notes ?? ''
        });

        this.form.controls.propertyId.disable();
      },
      error: () => this.toast.error('Falha ao carregar visita para edição.')
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
    const contactPhone = normalizePhone(payload.contactPhone);

    if (!id) {
      this.api
        .create({
          propertyId: payload.propertyId,
          scheduledAtUtc: payload.scheduledAtUtc,
          contactName: payload.contactName,
          contactPhone: contactPhone || undefined,
          responsibleName: payload.responsibleName || undefined,
          notes: payload.notes || undefined
        })
        .subscribe({
          next: () => this.handleSuccess('Visita criada com sucesso.'),
          error: () => this.handleError('Falha ao criar visita.')
        });
      return;
    }

    this.api
      .update(id, {
        propertyId: payload.propertyId,
        scheduledAtUtc: payload.scheduledAtUtc,
        contactName: payload.contactName,
        contactPhone: contactPhone || undefined,
        responsibleName: payload.responsibleName || undefined,
        status: payload.status,
        notes: payload.notes || undefined
      })
      .subscribe({
        next: () => this.handleSuccess('Visita atualizada com sucesso.'),
        error: () => this.handleError('Falha ao atualizar visita.')
      });
  }

  back(): void {
    void this.router.navigate(['/app/visitas']);
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.router.navigate(['/app/visitas']);
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

