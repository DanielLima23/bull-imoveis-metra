import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { LeaseDto, PagedResult, PropertyDto, TenantDto } from '../../../core/models/domain.model';
import { LeaseApiService } from '../../../core/services/lease-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { SystemSettingsService } from '../../../core/services/system-settings.service';
import { TenantApiService } from '../../../core/services/tenant-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { SelectOption } from '../../../shared/models/select-option.model';
import { getFloatingMenuPosition } from '../../../shared/utils/floating-menu.util';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';
import { toPropertySelectOption, toTenantSelectOption } from '../../../shared/utils/select-option.util';

type LeaseGuideMode = 'activate-lease' | 'close-active-lease';

@Component({
  selector: 'app-locacoes-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    TablePaginationComponent,
    BrlCurrencyPipe,
    DateOnlyBrPipe,
    DomainLabelPipe,
    RouterLink,
    AsyncSearchSelectComponent,
    DateBrInputDirective
  ],
  templateUrl: './locacoes.page.html',
  styleUrl: './locacoes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocacoesPage implements OnInit {
  private readonly leaseApi = inject(LeaseApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly tenantApi = inject(TenantApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly settingsService = inject(SystemSettingsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequestToken = 0;

  readonly isLoading = signal(false);
  readonly leases = signal<LeaseDto[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly propertyId = signal('');
  readonly tenantId = signal('');
  readonly status = signal('');
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly closingLease = signal<LeaseDto | null>(null);
  readonly guideMode = signal<LeaseGuideMode | null>(null);
  readonly guideDismissed = signal(false);
  readonly guideFallbackMessage = signal('');
  readonly highlightedLeaseId = signal<string | null>(null);
  readonly guidedFlowsEnabled = this.settingsService.guidedFlowsEnabled;

  readonly activeMenuItem = computed(() => this.leases().find((item) => item.id === this.activeMenuId()) ?? null);
  readonly guideVisualsEnabled = computed(() => this.guidedFlowsEnabled() && !!this.guideMode() && !this.guideDismissed());
  readonly guideBanner = computed(() => {
    if (!this.guideVisualsEnabled()) {
      return null;
    }

    if (this.guideMode() === 'activate-lease') {
      return {
        title: 'Como ativar o fluxo de locacao deste imovel',
        message:
          'Revise as locacoes vinculadas a este imovel. Se ainda nao existir um contrato ativo, use "Adicionar nova" para cadastrar a locacao.'
      };
    }

    return {
      title: 'Como encerrar a locacao ativa deste imovel',
      message:
        this.guideFallbackMessage() ||
        'Localize a locacao ativa destacada e use o menu de acoes da linha para encerrar o contrato antes de alterar o status do imovel.'
    };
  });
  readonly createLeaseQueryParams = computed<Params | null>(() => {
    const propertyId = this.propertyId().trim();
    if (this.guideMode() !== 'activate-lease' || !propertyId) {
      return null;
    }

    return {
      propertyId,
      returnTo: this.buildReturnToUrl()
    };
  });
  readonly statusOptions: SelectOption[] = getDomainOptions('leaseStatus', { includeEmptyOption: true, emptyLabel: 'Todos' });

  readonly propertySelectFetchPage: AsyncSelectFetchPage = (query) =>
    this.propertyApi
      .list({ search: query.search, page: query.page, pageSize: query.pageSize }, { silent: true })
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

  readonly closeForm = this.fb.nonNullable.group({
    endDate: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const guideMode = this.parseGuideMode(params.get('guideMode'));
      const status = guideMode === 'close-active-lease' ? params.get('status')?.trim() || 'ACTIVE' : params.get('status')?.trim() || '';

      this.propertyId.set(params.get('propertyId')?.trim() || '');
      this.tenantId.set(params.get('tenantId')?.trim() || '');
      this.status.set(status);
      this.page.set(1);
      this.guideMode.set(guideMode);
      this.guideDismissed.set(false);
      this.guideFallbackMessage.set('');
      this.highlightedLeaseId.set(null);
      this.activeMenuId.set(null);
      this.closingLease.set(null);
      this.load();
    });
  }

  load(showLoading = true): void {
    const requestToken = ++this.loadRequestToken;

    if (showLoading) {
      this.isLoading.set(true);
    }

    this.leaseApi
      .list(
        {
          propertyId: this.propertyId() || undefined,
          tenantId: this.tenantId() || undefined,
          status: this.status() || undefined,
          page: this.page(),
          pageSize: this.pageSize()
        },
        showLoading ? undefined : { silent: true }
      )
      .subscribe({
        next: (result) => {
          if (requestToken !== this.loadRequestToken) {
            return;
          }

          this.leases.set(result.items);
          this.page.set(result.page);
          this.pageSize.set(result.pageSize);
          this.totalItems.set(result.totalItems);
          this.totalPages.set(result.totalPages);
          this.activeMenuId.set(null);
          this.isLoading.set(false);
          this.syncGuideTargets();
        },
        error: () => {
          if (requestToken !== this.loadRequestToken) {
            return;
          }

          this.toast.error('Falha ao carregar locacoes.');
          this.isLoading.set(false);
          this.highlightedLeaseId.set(null);
        }
      });
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

  onPropertyFilterChange(value: string): void {
    this.propertyId.set(value);
    this.page.set(1);
    this.load(false);
  }

  onTenantFilterChange(value: string): void {
    this.tenantId.set(value);
    this.page.set(1);
    this.load(false);
  }

  onStatusChange(value: string): void {
    this.status.set(value);
    this.page.set(1);
    this.load(false);
  }

  dismissGuide(): void {
    this.guideDismissed.set(true);
    this.guideFallbackMessage.set('');
    this.highlightedLeaseId.set(null);
  }

  toggleRowMenu(event: MouseEvent, id: string): void {
    if (this.activeMenuId() === id) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    this.menuPosition.set(getFloatingMenuPosition(trigger, 236, 150));
    this.activeMenuId.set(id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  openCloseModal(lease: LeaseDto): void {
    this.closingLease.set(lease);
    this.closeForm.reset({ endDate: new Date().toISOString().slice(0, 10) });
    this.activeMenuId.set(null);
  }

  closeCloseModal(): void {
    this.closingLease.set(null);
  }

  isLeaseHighlighted(leaseId: string): boolean {
    return this.highlightedLeaseId() === leaseId && this.guideVisualsEnabled() && this.guideMode() === 'close-active-lease';
  }

  isLeaseActionHighlighted(leaseId: string): boolean {
    return this.isLeaseHighlighted(leaseId);
  }

  submitCloseLease(): void {
    const lease = this.closingLease();
    if (!lease || this.closeForm.invalid) {
      this.closeForm.markAllAsTouched();
      return;
    }

    this.leaseApi.close(lease.id, this.closeForm.controls.endDate.value).subscribe({
      next: () => {
        this.toast.success('Locacao encerrada.');
        this.closeCloseModal();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao encerrar locacao.')
    });
  }

  private syncGuideTargets(): void {
    if (!this.guideVisualsEnabled()) {
      this.guideFallbackMessage.set('');
      this.highlightedLeaseId.set(null);
      return;
    }

    this.guideFallbackMessage.set('');

    if (this.guideMode() === 'activate-lease') {
      this.highlightedLeaseId.set(null);
      this.queueGuideFocus('[data-guide-filters]');
      return;
    }

    const propertyId = this.propertyId().trim();
    const highlightedLease =
      this.leases().find((item) => (!propertyId || item.propertyId === propertyId) && this.normalizeStatus(item.status) === 'ACTIVE') ?? null;

    if (!highlightedLease) {
      this.highlightedLeaseId.set(null);
      this.guideFallbackMessage.set(
        'Nenhuma locacao ativa desse imovel apareceu na lista atual. Confira os filtros ou cadastre o contrato correto antes de tentar alterar o status do imovel.'
      );
      this.queueGuideFocus('[data-guide-filters]');
      return;
    }

    this.highlightedLeaseId.set(highlightedLease.id);
    this.queueGuideFocus(`[data-guide-lease-row="${highlightedLease.id}"]`);
  }

  private buildReturnToUrl(): string {
    const params = new URLSearchParams();

    if (this.propertyId().trim()) {
      params.set('propertyId', this.propertyId().trim());
    }

    if (this.tenantId().trim()) {
      params.set('tenantId', this.tenantId().trim());
    }

    if (this.status().trim()) {
      params.set('status', this.status().trim());
    }

    if (this.guideMode()) {
      params.set('guideMode', this.guideMode()!);
    }

    const query = params.toString();
    return query ? `/app/locacoes?${query}` : '/app/locacoes';
  }

  private mapOptionsResult<T>(result: PagedResult<T>, mapper: (item: T) => SelectOption): PagedResult<SelectOption> {
    return {
      ...result,
      items: result.items.map((item) => mapper(item))
    };
  }

  private parseGuideMode(value: string | null): LeaseGuideMode | null {
    return value === 'activate-lease' || value === 'close-active-lease' ? value : null;
  }

  private queueGuideFocus(selector: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(selector);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
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
