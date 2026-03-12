import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PartyDto } from '../../../core/models/domain.model';
import { PartyApiService } from '../../../core/services/party-api.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { SelectOption } from '../../../shared/models/select-option.model';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';

@Component({
  selector: 'app-pessoas-page',
  standalone: true,
  imports: [PageHeaderComponent, TablePaginationComponent, RouterLink, AsyncSearchSelectComponent, DomainLabelPipe],
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
  readonly deletingPerson = signal<PartyDto | null>(null);
  readonly isDeleting = signal(false);
  readonly kindOptions: SelectOption[] = getDomainOptions('partyKind', { includeEmptyOption: true, emptyLabel: 'Todos' });
  readonly columnCount = 3;

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

  openDeleteDialog(item: PartyDto): void {
    this.deletingPerson.set(item);
  }

  closeDeleteDialog(): void {
    if (this.isDeleting()) {
      return;
    }

    this.deletingPerson.set(null);
  }

  confirmDelete(): void {
    const item = this.deletingPerson();
    if (!item || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.api
      .update(item.id, {
        kind: item.kind ?? undefined,
        name: item.name ?? undefined,
        documentNumber: item.documentNumber ?? undefined,
        email: item.email ?? undefined,
        phone: item.phone ?? undefined,
        notes: item.notes ?? undefined,
        isActive: false
      })
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deletingPerson.set(null);
          this.toast.success('Pessoa inativada com sucesso.');
          this.load(false);
        },
        error: () => {
          this.isDeleting.set(false);
          this.toast.error('Falha ao excluir pessoa.');
        }
      });
  }
}
