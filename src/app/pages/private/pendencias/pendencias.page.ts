import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { PendencyDto, PendencyTypeDto, PropertyDto } from '../../../core/models/domain.model';
import { PendencyApiService } from '../../../core/services/pendency-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { getDomainLabel, getDomainOptions } from '../../../shared/utils/domain-label.util';
import { getFloatingMenuPosition } from '../../../shared/utils/floating-menu.util';

@Component({
  selector: 'app-pendencias-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, TablePaginationComponent, DatePipe, RouterLink, AsyncSearchSelectComponent, DomainLabelPipe],
  templateUrl: './pendencias.page.html',
  styleUrl: './pendencias.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PendenciasPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly api = inject(PendencyApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly propertyId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly scopedProperty = signal<PropertyDto | null>(null);
  readonly isLoading = signal(false);
  readonly items = signal<PendencyDto[]>([]);
  readonly types = signal<PendencyTypeDto[]>([]);
  readonly search = signal('');
  readonly status = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly showTypeForm = signal(false);
  readonly editingTypeId = signal<string | null>(null);

  readonly isPropertyScoped = computed(() => !!this.propertyId());
  readonly headerTitle = computed(() => (this.isPropertyScoped() ? 'Pendências do imóvel' : 'Pendências'));
  readonly headerSubtitle = computed(() => {
    const property = this.scopedProperty();
    if (property) {
      return `Listagem de pendências vinculadas a ${property.title}`;
    }

    return this.isPropertyScoped() ? 'Listagem de pendências vinculadas ao imóvel selecionado' : 'Listagem, resolução e manutenção dos tipos de pendência';
  });
  readonly breadcrumbs = computed(() => {
    const items = [{ label: 'Painel', route: '/app/dashboard' }, { label: 'Imóveis', route: '/app/imoveis' }];
    if (!this.isPropertyScoped()) {
      return [...items, { label: 'Pendências' }];
    }

    return [...items, { label: this.scopedProperty()?.title ?? 'Imóvel' }, { label: 'Pendências' }];
  });
  readonly actionQueryParams = computed<Params | null>(() =>
    this.isPropertyScoped() ? { propertyId: this.propertyId(), context: 'property-pendencies' } : null
  );
  readonly statusOptions = getDomainOptions('pendencyStatus', { includeEmptyOption: true, emptyLabel: 'Todos' });
  readonly listColumnCount = computed(() => (this.isPropertyScoped() ? 6 : 7));
  readonly showManagementPanels = computed(() => !this.isPropertyScoped());

  readonly typeForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    defaultSlaDays: [1, [Validators.required, Validators.min(1)]]
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.items();
    }

    return this.items().filter((item) =>
      [
        item.propertyTitle,
        item.title,
        item.pendencyTypeName,
        item.status,
        item.severity,
        getDomainLabel('pendencyStatus', item.status),
        getDomainLabel('pendencySeverity', item.severity)
      ].some((value) => value.toLowerCase().includes(term))
    );
  });

  readonly activeMenuItem = computed(() => this.items().find((item) => item.id === this.activeMenuId()) ?? null);

  ngOnInit(): void {
    if (this.isPropertyScoped()) {
      this.loadScopedProperty();
    }

    this.loadTypes();
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.api
      .list({
        propertyId: this.propertyId() || undefined,
        status: this.status() || undefined,
        page: this.page(),
        pageSize: this.pageSize()
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.page.set(result.page);
          this.pageSize.set(result.pageSize);
          this.totalItems.set(result.totalItems);
          this.totalPages.set(result.totalPages);
          this.activeMenuId.set(null);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error('Falha ao carregar pendências.');
          this.isLoading.set(false);
        }
      });
  }

  loadTypes(): void {
    this.api.listTypes().subscribe({ next: (items) => this.types.set(items) });
  }

  onStatusChange(value: string): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
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

  toggleRowMenu(event: MouseEvent, id: string): void {
    if (this.activeMenuId() === id) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    this.menuPosition.set(getFloatingMenuPosition(trigger, 230, 150));
    this.activeMenuId.set(id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  resolve(item: PendencyDto): void {
    this.api.resolve(item.id).subscribe({
      next: () => {
        this.toast.success('Pendência resolvida.');
        this.activeMenuId.set(null);
        this.load();
      },
      error: () => this.toast.error('Falha ao resolver pendência.')
    });
  }

  toggleTypeForm(): void {
    this.showTypeForm.update((value) => !value);
    if (!this.showTypeForm()) {
      this.cancelTypeEdit();
    }
  }

  editType(item: PendencyTypeDto): void {
    this.showTypeForm.set(true);
    this.editingTypeId.set(item.id);
    this.typeForm.reset({
      code: item.code ?? '',
      name: item.name,
      description: item.description ?? '',
      defaultSlaDays: item.defaultSlaDays
    });
  }

  cancelTypeEdit(): void {
    this.editingTypeId.set(null);
    this.typeForm.reset({
      code: '',
      name: '',
      description: '',
      defaultSlaDays: 1
    });
  }

  saveType(): void {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    const id = this.editingTypeId();
    const request$ = id ? this.api.updateType(id, this.typeForm.getRawValue()) : this.api.createType(this.typeForm.getRawValue());
    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Tipo de pendência atualizado.' : 'Tipo de pendência criado.');
        this.cancelTypeEdit();
        this.showTypeForm.set(false);
        this.loadTypes();
      },
      error: () => this.toast.error('Falha ao salvar tipo de pendência.')
    });
  }

  getFormQueryParams(propertyId: string): Params | null {
    return this.isPropertyScoped() ? { propertyId, context: 'property-pendencies' } : null;
  }

  private loadScopedProperty(): void {
    this.propertyApi.getById(this.propertyId(), { silent: true }).subscribe({
      next: (property) => this.scopedProperty.set(property),
      error: () => undefined
    });
  }
}
