import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Params, Router } from '@angular/router';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { PendencyTypeDto, PropertyDto } from '../../../core/models/domain.model';
import { PendencyApiService } from '../../../core/services/pendency-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import {
  PropertyStatusTransitionResult,
  PropertyStatusTransitionService
} from '../../../core/services/property-status-transition.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { FlowGuidanceModalComponent } from '../../../shared/components/flow-guidance-modal/flow-guidance-modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainLabel } from '../../../shared/utils/domain-label.util';
import {
  getPropertyIdleReasonOptions,
  getPropertyStatusOptions,
  inferPropertyIdleReason,
  inferPropertyStatus,
  mapPropertyStatusToPayload,
  requiresPropertyIdleReason
} from '../../../shared/utils/property-status.util';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    TablePaginationComponent,
    DomainLabelPipe,
    AsyncSearchSelectComponent,
    DateTimeBrInputDirective,
    BrlCurrencyPipe,
    FlowGuidanceModalComponent,
    SlicePipe
  ],
  providers: [PropertyStatusTransitionService],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly propertyApi = inject(PropertyApiService);
  private readonly pendencyApi = inject(PendencyApiService);
  private readonly propertyStatusTransition = inject(PropertyStatusTransitionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private listRequestSub: Subscription | null = null;
  private statusSelectionToken = 0;
  private restoringStatusEditorSelection = false;
  private statusEditorStableSelection = { status: 'AVAILABLE', idleReason: '' };

  readonly isLoading = signal(false);
  readonly types = signal<PendencyTypeDto[]>([]);
  readonly items = signal<PropertyDto[]>([]);
  readonly search = signal('');
  readonly city = signal('');
  readonly status = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(15);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly openPendencyCounts = signal<Record<string, number>>({});
  readonly statusEditorPropertyId = signal<string | null>(null);
  readonly pendencyModalPropertyId = signal<string | null>(null);
  readonly isSubmittingPendency = signal(false);
  readonly flowGuidanceModal = signal<{ title: string; message: string; queryParams: Params } | null>(null);

  readonly editingStatusProperty = computed(() => this.items().find((item) => item.id === this.statusEditorPropertyId()) ?? null);
  readonly editingPendencyProperty = computed(() => this.items().find((item) => item.id === this.pendencyModalPropertyId()) ?? null);
  readonly propertyStatusFilterOptions = getPropertyStatusOptions(true, 'Todos');
  readonly propertyStatusEditOptions = getPropertyStatusOptions();
  readonly propertyIdleReasonOptions = getPropertyIdleReasonOptions(true);
  readonly pendencyTypeOptions = computed<SelectOption[]>(() =>
    this.types().map((item) => ({
      id: item.id,
      label: `${item.code ? `${item.code} - ` : ''}${item.name}`
    }))
  );

  readonly statusEditorForm = this.fb.nonNullable.group({
    status: ['AVAILABLE', Validators.required],
    idleReason: ['']
  });

  readonly pendencyForm = this.fb.nonNullable.group({
    pendencyTypeId: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    dueAtUtc: [this.buildDefaultDueDate(), Validators.required]
  });

  ngOnInit(): void {
    this.loadTypes();
    this.load();
    this.watchStatusEditor();
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
          this.loadOpenPendencyCounts(result.items);
          this.isLoading.set(false);
          this.listRequestSub = null;
        },
        error: () => {
          this.toast.error('Falha ao carregar o painel de imóveis.');
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

  openPendencies(propertyId: string): void {
    void this.router.navigate(['/app/imoveis', propertyId, 'pendencias']);
  }

  openStatusModal(property: PropertyDto): void {
    const status = inferPropertyStatus(property);
    const idleReason = inferPropertyIdleReason(property);

    this.statusEditorForm.reset(
      {
        status,
        idleReason
      },
      { emitEvent: false }
    );
    this.syncIdleReasonValidator(status);
    this.statusEditorStableSelection = { status, idleReason };
    this.statusSelectionToken += 1;
    this.pendencyModalPropertyId.set(null);
    this.statusEditorPropertyId.set(property.id);
  }

  closeStatusModal(): void {
    this.statusEditorPropertyId.set(null);
  }

  openPendencyModal(property: PropertyDto): void {
    this.pendencyForm.reset({
      pendencyTypeId: '',
      title: '',
      description: '',
      dueAtUtc: this.buildDefaultDueDate()
    });
    this.statusEditorPropertyId.set(null);
    this.pendencyModalPropertyId.set(property.id);
  }

  closePendencyModal(): void {
    this.pendencyModalPropertyId.set(null);
    this.isSubmittingPendency.set(false);
  }

  closeFlowGuidanceModal(): void {
    this.flowGuidanceModal.set(null);
  }

  navigateFromFlowGuidanceModal(): void {
    const modal = this.flowGuidanceModal();
    if (!modal) {
      return;
    }

    this.flowGuidanceModal.set(null);
    void this.router.navigate(['/app/locacoes'], { queryParams: modal.queryParams });
  }

  submitStatusEditor(): void {
    const property = this.editingStatusProperty();
    if (!property) {
      return;
    }

    const payload = this.statusEditorForm.getRawValue();
    this.syncIdleReasonValidator(payload.status);

    if (this.statusEditorForm.invalid) {
      this.statusEditorForm.markAllAsTouched();
      return;
    }

    this.propertyApi.updateStatus(property.id, mapPropertyStatusToPayload(payload.status, payload.idleReason)).subscribe({
      next: () => {
        this.propertyStatusTransition.invalidate(property.id);
        this.toast.success('Status do imóvel atualizado.');
        this.closeStatusModal();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao atualizar status do imóvel.')
    });
  }

  submitPendency(): void {
    const property = this.editingPendencyProperty();
    if (!property || this.isSubmittingPendency()) {
      return;
    }

    if (this.pendencyForm.invalid) {
      this.pendencyForm.markAllAsTouched();
      return;
    }

    const payload = this.pendencyForm.getRawValue();
    this.isSubmittingPendency.set(true);

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
          this.toast.success('Pendência criada com sucesso.');
          this.closePendencyModal();
          this.load(false);
        },
        error: () => {
          this.isSubmittingPendency.set(false);
          this.toast.error('Falha ao criar pendência.');
        }
      });
  }

  getPropertyStatusLabel(property: PropertyDto): string {
    return getDomainLabel('propertyStatus', inferPropertyStatus(property));
  }

  getPropertyIdleReasonLabel(property: PropertyDto): string {
    return getDomainLabel('propertyIdleReason', inferPropertyIdleReason(property), '');
  }

  getStatusTagClass(property: PropertyDto): string {
    switch (inferPropertyStatus(property)) {
      case 'LEASED':
        return 'status-tag--leased';
      case 'INACTIVE':
        return 'status-tag--inactive';
      case 'FOR_SALE':
        return 'status-tag--for-sale';
      case 'DEMANDS':
        return 'status-tag--demands';
      case 'IDLE':
        return 'status-tag--idle';
      default:
        return 'status-tag--available';
    }
  }

  shouldShowIdleReason(value?: string | null): boolean {
    return requiresPropertyIdleReason(value);
  }

  getOpenPendencyCount(propertyId: string): number {
    return this.openPendencyCounts()[propertyId] ?? 0;
  }

  private loadTypes(): void {
    this.pendencyApi.listTypes().subscribe({
      next: (items) => this.types.set(items),
      error: () => this.toast.error('Falha ao carregar tipos de pendência.')
    });
  }

  private watchStatusEditor(): void {
    this.statusEditorForm.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (this.restoringStatusEditorSelection) {
        return;
      }

      this.syncIdleReasonValidator(value);
      this.handleStatusEditorSelectionChange(value);
    });

    this.statusEditorForm.controls.idleReason.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (this.restoringStatusEditorSelection) {
        return;
      }

      if (this.normalizeStatus(this.statusEditorForm.controls.status.value) !== this.normalizeStatus(this.statusEditorStableSelection.status)) {
        return;
      }

      this.statusEditorStableSelection = {
        ...this.statusEditorStableSelection,
        idleReason: value
      };
    });

    this.syncIdleReasonValidator(this.statusEditorForm.controls.status.value);
  }

  private syncIdleReasonValidator(status?: string | null): void {
    const idleReasonControl = this.statusEditorForm.controls.idleReason;
    const isRequired = requiresPropertyIdleReason(status);

    if (isRequired) {
      idleReasonControl.setValidators([Validators.required]);
    } else {
      idleReasonControl.setValidators([]);
      if (idleReasonControl.value) {
        idleReasonControl.patchValue('', { emitEvent: false });
      }
    }

    idleReasonControl.updateValueAndValidity({ emitEvent: false });
  }

  private handleStatusEditorSelectionChange(nextStatus: string): void {
    const property = this.editingStatusProperty();
    if (!property) {
      return;
    }

    const currentSelection = { ...this.statusEditorStableSelection };
    if (this.normalizeStatus(nextStatus) === this.normalizeStatus(currentSelection.status)) {
      return;
    }

    const token = ++this.statusSelectionToken;
    this.propertyStatusTransition.validateTransition(property.id, currentSelection.status, nextStatus).subscribe((result) => {
      if (token !== this.statusSelectionToken) {
        return;
      }

      if (result === 'allowed') {
        this.statusEditorStableSelection = {
          status: nextStatus,
          idleReason: this.statusEditorForm.controls.idleReason.value
        };
        return;
      }

      this.restoreStatusEditorSelection(currentSelection);
      this.openBlockedStatusModal(property, result);
    });
  }

  private restoreStatusEditorSelection(selection: { status: string; idleReason: string }): void {
    this.restoringStatusEditorSelection = true;
    this.statusEditorForm.patchValue(
      {
        status: selection.status,
        idleReason: selection.idleReason
      },
      { emitEvent: false }
    );
    this.restoringStatusEditorSelection = false;
    this.syncIdleReasonValidator(selection.status);
    this.statusEditorStableSelection = selection;
  }

  private openBlockedStatusModal(property: PropertyDto, result: PropertyStatusTransitionResult): void {
    this.closeStatusModal();

    if (result === 'blocked_requires_active_lease') {
      this.flowGuidanceModal.set({
        title: 'Para marcar este imóvel como alugado',
        message: 'É necessário existir uma locação ativa vinculada a este imóvel antes de definir o status como alugado.',
        queryParams: {
          propertyId: property.id,
          guideMode: 'activate-lease'
        }
      });
      return;
    }

    this.flowGuidanceModal.set({
      title: 'Para alterar o status deste imóvel',
      message: 'Existe uma locação ativa vinculada a este imóvel. Encerre o contrato antes de alterar o status manualmente.',
      queryParams: {
        propertyId: property.id,
        status: 'ACTIVE',
        guideMode: 'close-active-lease'
      }
    });
  }

  private buildDefaultDueDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + 3);
    now.setHours(18, 0, 0, 0);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T18:00`;
  }

  private loadOpenPendencyCounts(items: PropertyDto[]): void {
    if (items.length === 0) {
      this.openPendencyCounts.set({});
      return;
    }

    const requests: Observable<{ propertyId: string; total: number }>[] = items.map((item) =>
      new Observable<{ propertyId: string; total: number }>((subscriber) => {
        const subscription = this.pendencyApi.list({ propertyId: item.id, status: 'OPEN', page: 1, pageSize: 1 }).subscribe({
          next: (result) => {
            subscriber.next({ propertyId: item.id, total: result.totalItems });
            subscriber.complete();
          },
          error: () => {
            subscriber.next({ propertyId: item.id, total: 0 });
            subscriber.complete();
          }
        });

        return () => subscription.unsubscribe();
      })
    );

    forkJoin(requests).subscribe((results) => {
      this.openPendencyCounts.set(
        results.reduce<Record<string, number>>((acc, result) => {
          acc[result.propertyId] = result.total;
          return acc;
        }, {})
      );
    });
  }

  private normalizeStatus(value?: string | null): string {
    return String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .toUpperCase();
  }
}
