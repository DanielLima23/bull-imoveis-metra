import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { TenantApiService } from '../../../core/services/tenant-api.service';
import { TenantDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';
import { CpfCnpjPipe } from '../../../shared/pipes/cpf-cnpj.pipe';
import { PhoneBrPipe } from '../../../shared/pipes/phone-br.pipe';
import { normalizeDocument, normalizePhone } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-locatarios-page',
  standalone: true,
  imports: [PageHeaderComponent, TablePaginationComponent, RouterLink, CpfCnpjPipe, PhoneBrPipe],
  templateUrl: './locatarios.page.html',
  styleUrl: './locatarios.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocatariosPage implements OnInit, OnDestroy {
  private readonly api = inject(TenantApiService);
  private readonly toast = inject(ToastService);
  private listRequestSub: Subscription | null = null;
  private listRequestUsesSkeleton = false;

  readonly isLoading = signal(false);
  readonly items = signal<TenantDto[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly activeMenuId = signal<string | null>(null);
  readonly menuPosition = signal({ x: 0, y: 0 });

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

  ngOnDestroy(): void {
    this.cancelListRequest();
  }

  load(showLoading = true): void {
    this.cancelListRequest();
    this.listRequestUsesSkeleton = showLoading;

    if (showLoading) {
      this.isLoading.set(true);
    }

    this.listRequestSub = this.api.list(this.search().trim(), this.page(), this.pageSize(), showLoading ? undefined : { silent: true }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.totalItems.set(result.totalItems);
        this.totalPages.set(result.totalPages);
        this.activeMenuId.set(null);
        this.listRequestSub = null;
        if (this.listRequestUsesSkeleton) {
          this.isLoading.set(false);
        }
        this.listRequestUsesSkeleton = false;
      },
      error: () => {
        this.toast.error('Falha ao carregar locatários.');
        this.listRequestSub = null;
        if (this.listRequestUsesSkeleton) {
          this.isLoading.set(false);
        }
        this.listRequestUsesSkeleton = false;
      }
    });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
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

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 148;

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

  toggleActive(item: TenantDto): void {
    this.api
      .update(item.id, {
        name: item.name,
        documentNumber: normalizeDocument(item.documentNumber),
        email: item.email,
        phone: normalizePhone(item.phone),
        isActive: !item.isActive
      })
      .subscribe({
        next: () => {
          this.toast.success(item.isActive ? 'Locatário inativado.' : 'Locatário reativado.');
          this.activeMenuId.set(null);
          this.load();
        },
        error: () => this.toast.error('Falha ao atualizar status do locatário.')
      });
  }

  private cancelListRequest(): void {
    if (!this.listRequestSub) {
      return;
    }

    this.listRequestSub.unsubscribe();
    this.listRequestSub = null;
    if (this.listRequestUsesSkeleton) {
      this.isLoading.set(false);
    }
    this.listRequestUsesSkeleton = false;
  }
}

