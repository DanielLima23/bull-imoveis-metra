import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { MaintenanceApiService } from '../../../core/services/maintenance-api.service';
import { MaintenanceDto } from '../../../core/models/domain.model';
import { DomainLabelPipe } from '../../../shared/pipes/domain-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { getDomainLabel } from '../../../shared/utils/domain-label.util';

@Component({
  selector: 'app-manutencoes-page',
  standalone: true,
  imports: [PageHeaderComponent, TablePaginationComponent, BrlCurrencyPipe, RouterLink, DomainLabelPipe],
  templateUrl: './manutencoes.page.html',
  styleUrl: './manutencoes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManutencoesPage implements OnInit {
  private readonly api = inject(MaintenanceApiService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly items = signal<MaintenanceDto[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.items();
    }

    return this.items().filter((item) =>
      [
        item.propertyTitle,
        item.title,
        item.priority,
        item.status,
        getDomainLabel('maintenancePriority', item.priority),
        getDomainLabel('maintenanceStatus', item.status)
      ].some((value) => value.toLowerCase().includes(term))
    );
  });

  readonly activeMenuItem = computed(() => {
    const id = this.activeMenuId();
    if (!id) {
      return null;
    }

    return this.items().find((item) => item.id === id) ?? null;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.api.list(this.page(), this.pageSize()).subscribe({
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
        this.toast.error('Falha ao carregar manutenções.');
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

  toggleRowMenu(event: MouseEvent, id: string): void {
    if (this.activeMenuId() === id) {
      this.closeRowMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 236;
    const menuHeight = 182;

    let x = rect.right - menuWidth;
    x = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));

    let y = rect.bottom + 8;
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, rect.top - menuHeight - 8);
    }

    this.menuPosition.set({ x, y });
    this.activeMenuId.set(id);
  }

  closeRowMenu(): void {
    this.activeMenuId.set(null);
  }

  updateStatus(item: MaintenanceDto, status: string): void {
    this.api.updateStatus(item.id, status).subscribe({
      next: () => {
        this.toast.success('Status de manutenção atualizado.');
        this.activeMenuId.set(null);
        this.load();
      },
      error: () => this.toast.error('Falha ao atualizar manutenção.')
    });
  }
}

