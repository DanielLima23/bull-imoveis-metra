import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { catchError, fromEvent, map, of } from 'rxjs';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { LeaseDto, PagedResult } from '../../../core/models/domain.model';
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
type LeaseGuideStep = 'filters' | 'create' | 'actions' | 'close-action' | 'close-form';

interface GuideSpotlight {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuideCoachPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
}

interface GuideStepContent {
  index: number;
  total: number;
  title: string;
  message: string;
  hint?: string;
  primaryActionLabel?: string;
  showBack: boolean;
}

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
  private readonly router = inject(Router);
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
  readonly guideStep = signal<LeaseGuideStep | null>(null);
  readonly guideDismissed = signal(false);
  readonly guideFallbackMessage = signal('');
  readonly highlightedLeaseId = signal<string | null>(null);
  readonly guideSpotlight = signal<GuideSpotlight | null>(null);
  readonly guideCoachPosition = signal<GuideCoachPosition | null>(null);
  readonly guidedFlowsEnabled = this.settingsService.guidedFlowsEnabled;

  readonly activeMenuItem = computed(() => this.leases().find((item) => item.id === this.activeMenuId()) ?? null);
  readonly guideVisualsEnabled = computed(() => this.guidedFlowsEnabled() && !!this.guideMode() && !this.guideDismissed());
  readonly guideOverlayVisible = computed(() => this.guideVisualsEnabled() && !!this.guideStep());
  readonly guideStepContent = computed<GuideStepContent | null>(() => {
    if (!this.guideOverlayVisible()) {
      return null;
    }

    const mode = this.guideMode();
    const step = this.guideStep();
    if (!mode || !step) {
      return null;
    }

    if (mode === 'activate-lease') {
      if (step === 'filters') {
        return {
          index: 1,
          total: 2,
          title: 'Confira as locações deste imóvel',
          message: 'Os filtros já foram preparados para você visualizar o imóvel correto antes de cadastrar um contrato.',
          hint: 'Quando estiver pronto, avance para o cadastro da nova locação.',
          primaryActionLabel: 'Continuar',
          showBack: false
        };
      }

      return {
        index: 2,
        total: 2,
        title: 'Cadastre a nova locação',
        message: 'Agora use o botão destacado "Adicionar nova" para abrir o cadastro com o imóvel já preenchido.',
        hint: 'Você pode clicar no destaque ou usar o atalho abaixo.',
        primaryActionLabel: 'Abrir cadastro',
        showBack: true
      };
    }

    if (step === 'filters' && !this.highlightedLeaseId()) {
      return {
        index: 1,
        total: 1,
        title: 'Não encontramos uma locação ativa na lista',
        message:
          this.guideFallbackMessage() ||
          'Confira se a locação correta está ativa ou cadastre um novo contrato antes de tentar alterar o status do imóvel.',
        hint: 'Você pode fechar o guia e revisar a lista manualmente.',
        showBack: false
      };
    }

    if (step === 'filters') {
      return {
        index: 1,
        total: 4,
        title: 'A lista já foi filtrada para você',
        message: 'Este passo mostra apenas as locações do imóvel certo. Agora vamos abrir a locação ativa.',
        hint: 'Clique em continuar para focar na locação que precisa ser encerrada.',
        primaryActionLabel: 'Continuar',
        showBack: false
      };
    }

    if (step === 'actions') {
      return {
        index: 2,
        total: 4,
        title: 'Abra as ações da locação destacada',
        message: 'Use o botão de ações da linha destacada para encontrar a opção de encerramento.',
        hint: 'Você pode clicar no destaque ou usar o atalho abaixo.',
        primaryActionLabel: 'Abrir menu',
        showBack: true
      };
    }

    if (step === 'close-action') {
      return {
        index: 3,
        total: 4,
        title: 'Escolha encerrar locação',
        message: 'No menu aberto, clique em "Encerrar locação" para seguir para o formulário final.',
        hint: 'Se preferir, use o atalho abaixo para abrir o encerramento.',
        primaryActionLabel: 'Abrir encerramento',
        showBack: true
      };
    }

    return {
      index: 4,
      total: 4,
      title: 'Conclua o encerramento',
      message: 'Preencha a data de encerramento no formulário destacado e confirme a operação.',
      hint: 'Depois disso, o status do imóvel poderá ser alterado.',
      primaryActionLabel: 'Fechar guia',
      showBack: false
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
      this.guideSpotlight.set(null);
      this.guideCoachPosition.set(null);
      this.guideStep.set(guideMode ? 'filters' : null);
      this.load();
    });

    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateGuideOverlayFromDom(false));
      fromEvent(window, 'scroll').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateGuideOverlayFromDom(false));
    }
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

          this.toast.error('Falha ao carregar locações.');
          this.isLoading.set(false);
          this.highlightedLeaseId.set(null);
          this.guideSpotlight.set(null);
          this.guideCoachPosition.set(null);
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
    this.guideStep.set(null);
    this.guideSpotlight.set(null);
    this.guideCoachPosition.set(null);
  }

  onGuidePrimaryAction(): void {
    const step = this.guideStep();
    const mode = this.guideMode();
    if (!step || !mode) {
      return;
    }

    if (mode === 'activate-lease') {
      if (step === 'filters') {
        this.setGuideStep('create');
        return;
      }

      this.navigateToCreateLease();
      return;
    }

    if (step === 'filters') {
      if (this.highlightedLeaseId()) {
        this.setGuideStep('actions');
      }
      return;
    }

    if (step === 'actions') {
      this.openGuideActionMenu();
      return;
    }

    if (step === 'close-action') {
      this.openGuideCloseModal();
      return;
    }

    this.dismissGuide();
  }

  onGuideBack(): void {
    const step = this.guideStep();
    if (!step) {
      return;
    }

    if (step === 'create') {
      this.setGuideStep('filters');
      return;
    }

    if (step === 'actions') {
      this.setGuideStep('filters');
      return;
    }

    if (step === 'close-action') {
      this.activeMenuId.set(null);
      this.setGuideStep('actions');
    }
  }

  shouldHighlightFilters(): boolean {
    return this.guideOverlayVisible() && this.guideStep() === 'filters';
  }

  shouldHighlightCreateAction(): boolean {
    return this.guideOverlayVisible() && this.guideStep() === 'create';
  }

  shouldHighlightLeaseRow(leaseId: string): boolean {
    return (
      this.highlightedLeaseId() === leaseId &&
      this.guideOverlayVisible() &&
      (this.guideStep() === 'actions' || this.guideStep() === 'close-action')
    );
  }

  shouldHighlightLeaseAction(leaseId: string): boolean {
    return this.highlightedLeaseId() === leaseId && this.guideOverlayVisible() && this.guideStep() === 'actions';
  }

  shouldHighlightCloseLeaseAction(leaseId: string): boolean {
    return this.highlightedLeaseId() === leaseId && this.guideOverlayVisible() && this.guideStep() === 'close-action';
  }

  toggleRowMenu(event: MouseEvent, id: string): void {
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    this.toggleRowMenuFromTrigger(trigger, id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);

    if (this.guideOverlayVisible() && this.guideStep() === 'close-action') {
      this.setGuideStep('actions');
      return;
    }

    this.queueGuideOverlaySync(false);
  }

  openCloseModal(lease: LeaseDto): void {
    this.closingLease.set(lease);
    this.closeForm.reset({ endDate: new Date().toISOString().slice(0, 10) });
    this.activeMenuId.set(null);

    if (this.guideOverlayVisible() && this.highlightedLeaseId() === lease.id && this.guideMode() === 'close-active-lease') {
      this.setGuideStep('close-form');
      return;
    }

    this.queueGuideOverlaySync(false);
  }

  closeCloseModal(): void {
    this.closingLease.set(null);

    if (this.guideOverlayVisible() && this.guideStep() === 'close-form' && this.guideMode() === 'close-active-lease') {
      this.setGuideStep('actions');
      return;
    }

    this.queueGuideOverlaySync(false);
  }

  submitCloseLease(): void {
    const lease = this.closingLease();
    if (!lease || this.closeForm.invalid) {
      this.closeForm.markAllAsTouched();
      return;
    }

    this.leaseApi.close(lease.id, this.closeForm.controls.endDate.value).subscribe({
      next: () => {
        this.toast.success('Locação encerrada.');
        this.closeCloseModal();
        this.dismissGuide();
        this.load(false);
      },
      error: () => this.toast.error('Falha ao encerrar locação.')
    });
  }

  private syncGuideTargets(): void {
    if (!this.guideMode()) {
      this.highlightedLeaseId.set(null);
      this.guideSpotlight.set(null);
      this.guideCoachPosition.set(null);
      return;
    }

    if (this.guideMode() === 'activate-lease') {
      this.highlightedLeaseId.set(null);
      this.guideFallbackMessage.set('');
      this.queueGuideOverlaySync(true);
      return;
    }

    const propertyId = this.propertyId().trim();
    const highlightedLease =
      this.leases().find((item) => (!propertyId || item.propertyId === propertyId) && this.normalizeStatus(item.status) === 'ACTIVE') ?? null;

    if (!highlightedLease) {
      this.highlightedLeaseId.set(null);
      this.guideFallbackMessage.set(
        'Nenhuma locação ativa desse imóvel apareceu na lista atual. Confira os filtros ou cadastre o contrato correto antes de tentar alterar o status do imóvel.'
      );
      if (this.guideStep() && this.guideStep() !== 'filters') {
        this.guideStep.set('filters');
      }
      this.queueGuideOverlaySync(true);
      return;
    }

    this.highlightedLeaseId.set(highlightedLease.id);
    this.guideFallbackMessage.set('');
    this.queueGuideOverlaySync(true);
  }

  private navigateToCreateLease(): void {
    const queryParams = this.createLeaseQueryParams() ?? undefined;
    void this.router.navigate(['/app/locacoes/new'], { queryParams });
  }

  private openGuideActionMenu(): void {
    const leaseId = this.highlightedLeaseId();
    if (!leaseId || typeof document === 'undefined') {
      return;
    }

    const trigger = document.querySelector<HTMLElement>(`[data-guide-lease-action="${leaseId}"]`);
    if (!trigger) {
      return;
    }

    this.toggleRowMenuFromTrigger(trigger, leaseId);
  }

  private openGuideCloseModal(): void {
    const leaseId = this.highlightedLeaseId();
    if (!leaseId) {
      return;
    }

    const lease = this.leases().find((item) => item.id === leaseId);
    if (!lease) {
      return;
    }

    this.openCloseModal(lease);
  }

  private toggleRowMenuFromTrigger(trigger: HTMLElement, id: string): void {
    if (this.activeMenuId() === id) {
      this.closeRowMenu();
      return;
    }

    this.menuPosition.set(getFloatingMenuPosition(trigger, 236, 150));
    this.activeMenuId.set(id);

    if (this.guideOverlayVisible() && this.guideMode() === 'close-active-lease' && this.highlightedLeaseId() === id && this.guideStep() === 'actions') {
      this.setGuideStep('close-action');
      return;
    }

    this.queueGuideOverlaySync(false);
  }

  private setGuideStep(step: LeaseGuideStep): void {
    this.guideStep.set(step);
    this.queueGuideOverlaySync(true);
  }

  private queueGuideOverlaySync(ensureVisible: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => this.updateGuideOverlayFromDom(ensureVisible), 80);
  }

  private updateGuideOverlayFromDom(ensureVisible: boolean): void {
    if (!this.guideOverlayVisible()) {
      this.guideSpotlight.set(null);
      this.guideCoachPosition.set(null);
      return;
    }

    const selector = this.getGuideTargetSelector();
    if (!selector || typeof document === 'undefined') {
      this.guideSpotlight.set(null);
      this.guideCoachPosition.set(this.getCenteredCoachPosition());
      return;
    }

    const target = document.querySelector<HTMLElement>(selector);
    if (!target) {
      this.handleMissingGuideTarget();
      return;
    }

    if (ensureVisible) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      window.setTimeout(() => this.updateGuideOverlayFromDom(false), 140);
      return;
    }

    const padding = 12;
    const rect = target.getBoundingClientRect();
    const maxWidth = Math.max(0, window.innerWidth - 24);
    const maxHeight = Math.max(0, window.innerHeight - 24);
    const width = Math.min(maxWidth, rect.width + padding * 2);
    const height = Math.min(maxHeight, rect.height + padding * 2);
    const spotlight: GuideSpotlight = {
      top: Math.max(12, Math.min(rect.top - padding, window.innerHeight - height - 12)),
      left: Math.max(12, Math.min(rect.left - padding, window.innerWidth - width - 12)),
      width,
      height
    };

    this.guideSpotlight.set(spotlight);
    this.guideCoachPosition.set(this.computeGuideCoachPosition(spotlight));
  }

  private handleMissingGuideTarget(): void {
    const step = this.guideStep();

    if (step === 'close-action' || step === 'close-form') {
      this.guideStep.set('actions');
      this.queueGuideOverlaySync(true);
      return;
    }

    if (step === 'create') {
      this.guideStep.set('filters');
      this.queueGuideOverlaySync(true);
      return;
    }

    this.guideSpotlight.set(null);
    this.guideCoachPosition.set(this.getCenteredCoachPosition());
  }

  private getGuideTargetSelector(): string | null {
    const step = this.guideStep();
    const leaseId = this.highlightedLeaseId();

    switch (step) {
      case 'filters':
        return '[data-guide-filters]';
      case 'create':
        return '.page-header__action--guided';
      case 'actions':
        return leaseId ? `[data-guide-lease-action="${leaseId}"]` : null;
      case 'close-action':
        return leaseId ? `[data-guide-close-lease="${leaseId}"]` : null;
      case 'close-form':
        return '[data-guide-close-modal]';
      default:
        return null;
    }
  }

  private computeGuideCoachPosition(spotlight: GuideSpotlight): GuideCoachPosition {
    if (typeof window === 'undefined') {
      return { top: 24, left: 24, placement: 'below' };
    }

    const cardWidth = Math.min(380, window.innerWidth - 32);
    const estimatedHeight = 240;
    const gap = 18;
    const preferredLeft = spotlight.left + spotlight.width / 2 - cardWidth / 2;
    const left = Math.max(16, Math.min(preferredLeft, window.innerWidth - cardWidth - 16));

    if (spotlight.top + spotlight.height + gap + estimatedHeight <= window.innerHeight - 16) {
      return {
        top: spotlight.top + spotlight.height + gap,
        left,
        placement: 'below'
      };
    }

    return {
      top: Math.max(16, spotlight.top - estimatedHeight - gap),
      left,
      placement: 'above'
    };
  }

  private getCenteredCoachPosition(): GuideCoachPosition {
    if (typeof window === 'undefined') {
      return { top: 24, left: 24, placement: 'below' };
    }

    const cardWidth = Math.min(380, window.innerWidth - 32);
    return {
      top: Math.max(24, window.innerHeight / 2 - 120),
      left: Math.max(16, (window.innerWidth - cardWidth) / 2),
      placement: 'below'
    };
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
