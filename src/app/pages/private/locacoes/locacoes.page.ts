import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

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

  readonly activeMenuItem = computed(() => this.leases().find((item) => item.id === this.activeMenuId()) ?? null);
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
    this.load();
  }

  load(showLoading = true): void {
    if (showLoading) {
      this.isLoading.set(true);
    }

    this.leaseApi
      .list({
        propertyId: this.propertyId() || undefined,
        tenantId: this.tenantId() || undefined,
        status: this.status() || undefined,
        page: this.page(),
        pageSize: this.pageSize()
      })
      .subscribe({
        next: (result) => {
          this.leases.set(result.items);
          this.page.set(result.page);
          this.pageSize.set(result.pageSize);
          this.totalItems.set(result.totalItems);
          this.totalPages.set(result.totalPages);
          this.activeMenuId.set(null);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error('Falha ao carregar locações.');
          this.isLoading.set(false);
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
        this.load(false);
      },
      error: () => this.toast.error('Falha ao encerrar locação.')
    });
  }

  private mapOptionsResult<T>(result: PagedResult<T>, mapper: (item: T) => SelectOption): PagedResult<SelectOption> {
    return {
      ...result,
      items: result.items.map((item) => mapper(item))
    };
  }
}
