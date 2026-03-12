import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PartyDto } from '../../../core/models/domain.model';
import { PartyApiService } from '../../../core/services/party-api.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { CpfCnpjPipe } from '../../../shared/pipes/cpf-cnpj.pipe';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { PhoneBrPipe } from '../../../shared/pipes/phone-br.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { SelectOption } from '../../../shared/models/select-option.model';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';
import { getFloatingMenuPosition } from '../../../shared/utils/floating-menu.util';

@Component({
  selector: 'app-pessoas-page',
  standalone: true,
  imports: [PageHeaderComponent, TablePaginationComponent, RouterLink, CpfCnpjPipe, PhoneBrPipe, AsyncSearchSelectComponent, DomainLabelPipe],
  templateUrl: './pessoas.page.html',
  styleUrl: './pessoas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PessoasPage implements OnInit, OnDestroy {
  private readonly api = inject(PartyApiService);
  private readonly toast = inject(ToastService);
  private requestSub: Subscription | null = null;

  readonly isLoading = signal(false);
  readonly items = signal<PartyDto[]>([]);
  readonly search = signal('');
  readonly kind = signal('');
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });
  readonly kindOptions: SelectOption[] = getDomainOptions('partyKind', { includeEmptyOption: true, emptyLabel: 'Todos' });

  readonly activeMenuItem = computed(() => this.items().find((item) => item.id === this.activeMenuId()) ?? null);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
  }

  load(showLoading = true): void {
    this.requestSub?.unsubscribe();
    if (showLoading) {
      this.isLoading.set(true);
    }

    const active = this.activeFilter() === 'all' ? undefined : this.activeFilter() === 'active';
    this.requestSub = this.api
      .list({
        search: this.search().trim(),
        kind: this.kind().trim() || undefined,
        active,
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
          this.requestSub = null;
        },
        error: () => {
          this.toast.error('Falha ao carregar pessoas.');
          this.isLoading.set(false);
          this.requestSub = null;
        }
      });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load(false);
  }

  onKindChange(value: string): void {
    this.kind.set(value);
    this.page.set(1);
    this.load(false);
  }

  onActiveChange(value: 'all' | 'active' | 'inactive'): void {
    this.activeFilter.set(value);
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

  toggleRowMenu(event: MouseEvent, id: string): void {
    if (this.activeMenuId() === id) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    this.menuPosition.set(getFloatingMenuPosition(trigger, 220, 116));
    this.activeMenuId.set(id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }
}
