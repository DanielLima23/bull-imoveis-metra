import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { LeaseApiService } from '../../../core/services/lease-api.service';
import { LeaseDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';

@Component({
  selector: 'app-locacoes-page',
  standalone: true,
  imports: [PageHeaderComponent, TablePaginationComponent, BrlCurrencyPipe, DateOnlyBrPipe, RouterLink],
  templateUrl: './locacoes.page.html',
  styleUrl: './locacoes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocacoesPage implements OnInit {
  private readonly leaseApi = inject(LeaseApiService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly leases = signal<LeaseDto[]>([]);
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
      return this.leases();
    }

    return this.leases().filter((item) => [item.propertyTitle, item.tenantName, item.status].some((value) => value.toLowerCase().includes(term)));
  });

  readonly activeMenuItem = computed(() => {
    const id = this.activeMenuId();
    if (!id) {
      return null;
    }

    return this.leases().find((item) => item.id === id) ?? null;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.leaseApi.list(this.page(), this.pageSize()).subscribe({
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
    const menuWidth = 230;
    const menuHeight = 150;

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

  closeLease(lease: LeaseDto): void {
    const rawValue = prompt('Data de encerramento (dd/mm/yyyy):', this.currentDateBr());
    if (!rawValue) {
      return;
    }

    const endDate = this.parseBrDate(rawValue);
    if (!endDate) {
      this.toast.warning('Informe a data no formato dd/mm/yyyy.');
      return;
    }

    this.leaseApi.close(lease.id, endDate).subscribe({
      next: () => {
        this.toast.success('Locação encerrada.');
        this.activeMenuId.set(null);
        this.load();
      },
      error: () => this.toast.error('Falha ao encerrar locação.')
    });
  }

  private currentDateBr(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseBrDate(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) {
      return null;
    }

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));

    const test = new Date(year, month - 1, day);
    if (test.getFullYear() !== year || test.getMonth() !== month - 1 || test.getDate() !== day) {
      return null;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}


