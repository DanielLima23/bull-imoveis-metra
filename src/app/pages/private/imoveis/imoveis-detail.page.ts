import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import {
  LeaseDto,
  PropertyAttachmentDto,
  PropertyChargeTemplateDto,
  PropertyDetailDto,
  PropertyHistoryEntryDto,
  PropertyMonthlyStatementDto,
  PropertyRentReferenceDto
} from '../../../core/models/domain.model';
import {
  PropertyApiService,
  PropertyAttachmentPayload,
  PropertyChargeTemplatePayload,
  PropertyHistoryEntryPayload
} from '../../../core/services/property-api.service';
import { LeaseApiService } from '../../../core/services/lease-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { DateTimeBrInputDirective } from '../../../shared/directives/date-time-br-input.directive';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';

type PropertyDetailTab = 'resumo' | 'financeiro' | 'historico' | 'locacoes';

@Component({
  selector: 'app-imoveis-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    BrlCurrencyInputDirective,
    DateBrInputDirective,
    DateTimeBrInputDirective,
    BrlCurrencyPipe,
    DateOnlyBrPipe,
    DomainLabelPipe
  ],
  templateUrl: './imoveis-detail.page.html',
  styleUrl: './imoveis-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisDetailPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly leaseApi = inject(LeaseApiService);
  private readonly toast = inject(ToastService);

  readonly propertyId = signal('');
  readonly activeTab = signal<PropertyDetailTab>('resumo');
  readonly loading = signal(true);
  readonly detail = signal<PropertyDetailDto | null>(null);
  readonly rentHistory = signal<PropertyRentReferenceDto[]>([]);
  readonly attachments = signal<PropertyAttachmentDto[]>([]);
  readonly historyEntries = signal<PropertyHistoryEntryDto[]>([]);
  readonly chargeTemplates = signal<PropertyChargeTemplateDto[]>([]);
  readonly leaseHistory = signal<LeaseDto[]>([]);
  readonly statement = signal<PropertyMonthlyStatementDto | null>(null);
  readonly editingTemplateId = signal<string | null>(null);

  readonly tabs: { id: PropertyDetailTab; label: string }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'historico', label: 'Histórico' },
    { id: 'locacoes', label: 'Locações' }
  ];

  readonly title = computed(() => this.detail()?.property.title || 'Detalhe do imóvel');
  readonly subtitle = computed(() => {
    const property = this.detail()?.property;
    return property ? `${property.city}/${property.state} - ${property.propertyType}` : 'Visão consolidada do imóvel';
  });

  readonly rentForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    effectiveFrom: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  readonly historyForm = this.fb.nonNullable.group({
    content: ['', Validators.required],
    occurredAtUtc: [new Date().toISOString().slice(0, 16), Validators.required]
  });

  readonly attachmentForm = this.fb.nonNullable.group({
    category: ['', Validators.required],
    title: ['', Validators.required],
    resourceLocation: ['', Validators.required],
    notes: [''],
    referenceDateUtc: ['']
  });

  readonly templateForm = this.fb.nonNullable.group({
    kind: ['', Validators.required],
    title: ['', Validators.required],
    defaultAmount: [0, [Validators.required, Validators.min(0)]],
    dueDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    defaultResponsibility: [''],
    providerInformation: [''],
    notes: [''],
    isActive: [true]
  });

  readonly statementForm = this.fb.nonNullable.group({
    month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/app/imoveis']);
      return;
    }

    this.propertyId.set(id);
    this.activeTab.set(this.normalizeTab(this.route.snapshot.queryParamMap.get('tab')));

    this.route.queryParamMap.subscribe((params) => {
      const tab = this.normalizeTab(params.get('tab'));
      this.activeTab.set(tab);

      if (tab === 'financeiro' && this.detail()) {
        this.loadStatement();
      }
    });

    this.reloadAll();
  }

  changeTab(tab: PropertyDetailTab): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  reloadAll(): void {
    this.loading.set(true);
    const id = this.propertyId();
    const partialFailures: string[] = [];

    forkJoin({
      detail: this.propertyApi.getDetail(id),
      rentHistory: this.withFallback(this.propertyApi.getRentHistory(id), [], 'histórico de aluguéis', partialFailures),
      attachments: this.withFallback(this.propertyApi.listAttachments(id), [], 'anexos', partialFailures),
      historyEntries: this.withFallback(this.propertyApi.listHistory(id), [], 'histórico livre', partialFailures),
      chargeTemplates: this.withFallback(this.propertyApi.listChargeTemplates(id), [], 'contas-modelo', partialFailures),
      leaseHistory: this.withFallback(this.propertyApi.getLeaseHistory(id), [], 'histórico de locações', partialFailures)
    }).subscribe({
      next: (result) => {
        this.detail.set(result.detail);
        this.rentHistory.set(result.rentHistory);
        this.attachments.set(result.attachments);
        this.historyEntries.set(result.historyEntries);
        this.chargeTemplates.set(result.chargeTemplates);
        this.leaseHistory.set(result.leaseHistory);
        this.loading.set(false);

        if (partialFailures.length) {
          this.toast.warning(`Algumas seções não puderam ser carregadas: ${partialFailures.join(', ')}.`);
        }

        if (this.activeTab() === 'financeiro') {
          this.loadStatement();
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Falha ao carregar detalhe do imóvel.');
      }
    });
  }

  loadStatement(): void {
    if (this.statementForm.invalid) {
      this.statementForm.markAllAsTouched();
      return;
    }

    const id = this.propertyId();
    const { year, month } = this.statementForm.getRawValue();
    this.propertyApi.getMonthlyStatement(id, year, month).subscribe({
      next: (statement) => this.statement.set(statement),
      error: () => this.toast.error('Falha ao carregar extrato mensal.')
    });
  }

  submitRentReference(): void {
    if (this.rentForm.invalid) {
      this.rentForm.markAllAsTouched();
      return;
    }

    this.propertyApi.addRentReference(this.propertyId(), this.rentForm.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Referência locativa cadastrada.');
        this.rentForm.reset({
          amount: 0,
          effectiveFrom: new Date().toISOString().slice(0, 10)
        });
        this.reloadAll();
      },
      error: () => this.toast.error('Falha ao salvar referência locativa.')
    });
  }

  submitHistory(): void {
    if (this.historyForm.invalid) {
      this.historyForm.markAllAsTouched();
      return;
    }

    const payload = this.historyForm.getRawValue() as PropertyHistoryEntryPayload;
    this.propertyApi.createHistoryEntry(this.propertyId(), payload).subscribe({
      next: () => {
        this.toast.success('Histórico registrado.');
        this.historyForm.reset({
          content: '',
          occurredAtUtc: new Date().toISOString().slice(0, 16)
        });
        this.reloadAll();
      },
      error: () => this.toast.error('Falha ao registrar histórico.')
    });
  }

  submitAttachment(): void {
    if (this.attachmentForm.invalid) {
      this.attachmentForm.markAllAsTouched();
      return;
    }

    const payload = this.attachmentForm.getRawValue() as PropertyAttachmentPayload;
    this.propertyApi.createAttachment(this.propertyId(), payload).subscribe({
      next: () => {
        this.toast.success('Anexo registrado.');
        this.attachmentForm.reset({
          category: '',
          title: '',
          resourceLocation: '',
          notes: '',
          referenceDateUtc: ''
        });
        this.reloadAll();
      },
      error: () => this.toast.error('Falha ao registrar anexo.')
    });
  }

  editTemplate(template: PropertyChargeTemplateDto): void {
    this.editingTemplateId.set(template.id);
    this.templateForm.reset({
      kind: template.kind ?? '',
      title: template.title ?? '',
      defaultAmount: template.defaultAmount ?? 0,
      dueDay: template.dueDay ?? 1,
      defaultResponsibility: template.defaultResponsibility ?? '',
      providerInformation: template.providerInformation ?? '',
      notes: template.notes ?? '',
      isActive: template.isActive
    });
  }

  cancelTemplateEdit(): void {
    this.editingTemplateId.set(null);
    this.templateForm.reset({
      kind: '',
      title: '',
      defaultAmount: 0,
      dueDay: 1,
      defaultResponsibility: '',
      providerInformation: '',
      notes: '',
      isActive: true
    });
  }

  submitTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const payload = this.templateForm.getRawValue() as PropertyChargeTemplatePayload;
    const editingId = this.editingTemplateId();
    const request$ = editingId
      ? this.propertyApi.updateChargeTemplate(this.propertyId(), editingId, payload)
      : this.propertyApi.createChargeTemplate(this.propertyId(), payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editingId ? 'Conta-modelo atualizada.' : 'Conta-modelo cadastrada.');
        this.cancelTemplateEdit();
        this.reloadAll();
      },
      error: () => this.toast.error('Falha ao salvar conta-modelo.')
    });
  }

  newLease(): void {
    void this.router.navigate(['/app/locacoes/new'], {
      queryParams: {
        propertyId: this.propertyId(),
        returnTo: `/app/imoveis/${this.propertyId()}?tab=locacoes`
      }
    });
  }

  editLease(leaseId: string): void {
    void this.router.navigate(['/app/locacoes', leaseId, 'edit'], {
      queryParams: {
        returnTo: `/app/imoveis/${this.propertyId()}?tab=locacoes`
      }
    });
  }

  closeLease(leaseId: string): void {
    const today = new Date().toISOString().slice(0, 10);
    this.leaseApi.close(leaseId, today).subscribe({
      next: () => {
        this.toast.success('Locação encerrada com a data atual.');
        this.reloadAll();
      },
      error: () => this.toast.error('Falha ao encerrar locação.')
    });
  }

  private normalizeTab(value: string | null): PropertyDetailTab {
    return this.tabs.some((tab) => tab.id === value) ? (value as PropertyDetailTab) : 'resumo';
  }

  private withFallback<T>(request$: Observable<T>, fallback: T, label: string, partialFailures: string[]): Observable<T> {
    return request$.pipe(
      catchError(() => {
        partialFailures.push(label);
        return of(fallback);
      })
    );
  }
}
