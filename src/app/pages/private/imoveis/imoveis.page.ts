import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Params, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PropertyDto } from '../../../core/models/domain.model';
import { PropertyApiService } from '../../../core/services/property-api.service';
import {
  PropertyStatusTransitionResult,
  PropertyStatusTransitionService
} from '../../../core/services/property-status-transition.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { FlowGuidanceModalComponent } from '../../../shared/components/flow-guidance-modal/flow-guidance-modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainLabel } from '../../../shared/utils/domain-label.util';
import { getFloatingMenuPosition } from '../../../shared/utils/floating-menu.util';
import {
  getPropertyIdleReasonOptions,
  getPropertyStatusOptions,
  inferPropertyIdleReason,
  inferPropertyStatus,
  mapPropertyStatusToPayload,
  requiresPropertyIdleReason
} from '../../../shared/utils/property-status.util';

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
    AsyncSearchSelectComponent,
    DomainLabelPipe,
    FlowGuidanceModalComponent
  ],
  providers: [PropertyStatusTransitionService],
  templateUrl: './imoveis.page.html',
  styleUrl: './imoveis.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisPage implements OnInit, OnDestroy {
  private readonly propertyApi = inject(PropertyApiService);
  private readonly propertyStatusTransition = inject(PropertyStatusTransitionService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private listRequestSub: Subscription | null = null;
  private statusSelectionToken = 0;
  private restoringStatusEditorSelection = false;
  private statusEditorStableSelection = { status: 'AVAILABLE', idleReason: '' };

  readonly isLoading = signal(false);
  readonly items = signal<PropertyDto[]>([]);
  readonly search = signal('');
  readonly city = signal('');
  readonly status = signal('');
  readonly propertyType = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly rentModalProperty = signal<PropertyDto | null>(null);
  readonly statusEditorPropertyId = signal<string | null>(null);
  readonly statusEditorPosition = signal({ x: 0, y: 0 });
  readonly flowGuidanceModal = signal<{ title: string; message: string; queryParams: Params } | null>(null);

  readonly activeMenuItem = computed(() => this.items().find((item) => item.id === this.activeMenuId()) ?? null);
  readonly editingStatusProperty = computed(() => this.items().find((item) => item.id === this.statusEditorPropertyId()) ?? null);

  readonly propertyStatusFilterOptions = getPropertyStatusOptions(true, 'Todos');
  readonly propertyStatusEditOptions = getPropertyStatusOptions();
  readonly propertyIdleReasonOptions = getPropertyIdleReasonOptions(true);
  readonly propertyTypeOptions: SelectOption[] = [
    { id: '', label: 'Todos' },
    { id: 'Casa', label: 'Casa' },
    { id: 'Apartamento', label: 'Apartamento' },
    { id: 'Comercial', label: 'Comercial' },
    { id: 'Terreno', label: 'Terreno' }
  ];

  readonly rentReferenceForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    effectiveFrom: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  readonly statusEditorForm = this.fb.nonNullable.group({
    status: ['AVAILABLE', Validators.required],
    idleReason: ['']
  });

  ngOnInit(): void {
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
          propertyType: this.propertyType().trim() || undefined,
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

    this.closeStatusEditor();
    this.closeRentModal();
    this.menuPosition.set(getFloatingMenuPosition(trigger, 264, 260));
    this.activeMenuId.set(propertyId);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  openPropertyDetail(propertyId: string): void {
    this.closeTransientPanels();
    void this.router.navigate(['/app/imoveis', propertyId]);
  }

  openPropertyLeases(propertyId: string): void {
    this.closeTransientPanels();
    void this.router.navigate(['/app/imoveis', propertyId], { queryParams: { tab: 'locacoes' } });
  }

  openPropertyExpenses(propertyId: string): void {
    this.closeTransientPanels();
    void this.router.navigate(['/app/imoveis', propertyId, 'contas']);
  }

  openPropertyPendencies(propertyId: string): void {
    this.closeTransientPanels();
    void this.router.navigate(['/app/imoveis', propertyId, 'pendencias']);
  }

  openRentModal(property: PropertyDto): void {
    this.closeTransientPanels();
    this.rentReferenceForm.reset({
      amount: property.currentBaseRent ?? 0,
      effectiveFrom: new Date().toISOString().slice(0, 10)
    });
    this.rentModalProperty.set(property);
  }

  closeRentModal(): void {
    this.rentModalProperty.set(null);
  }

  openStatusEditor(event: MouseEvent, property: PropertyDto): void {
    if (this.statusEditorPropertyId() === property.id) {
      this.closeStatusEditor();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

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
    this.closeRowMenu();
    this.closeRentModal();

    this.statusEditorPosition.set(getFloatingMenuPosition(trigger, 320, requiresPropertyIdleReason(status) ? 268 : 212));
    this.statusEditorPropertyId.set(property.id);
  }

  closeStatusEditor(): void {
    this.statusEditorPropertyId.set(null);
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
        this.toast.success('Status do imóvel atualizado.');
        this.closeStatusEditor();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao atualizar status do imóvel.')
    });
  }

  submitRentReference(): void {
    const property = this.rentModalProperty();
    if (!property || this.rentReferenceForm.invalid) {
      this.rentReferenceForm.markAllAsTouched();
      return;
    }

    this.propertyApi.addRentReference(property.id, this.rentReferenceForm.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Valor de referência atualizado.');
        this.closeRentModal();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao atualizar valor de referência.')
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

  private closeTransientPanels(): void {
    this.closeRowMenu();
    this.closeStatusEditor();
    this.closeRentModal();
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
    this.closeStatusEditor();

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
