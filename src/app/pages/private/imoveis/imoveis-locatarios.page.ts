import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';
import { LeaseApiService } from '../../../core/services/lease-api.service';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { LeaseDto, PropertyDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';

@Component({
  selector: 'app-imoveis-locatarios-page',
  standalone: true,
  imports: [PageHeaderComponent, TablePaginationComponent, BrlCurrencyPipe, DateOnlyBrPipe, RouterLink],
  templateUrl: './imoveis-locatarios.page.html',
  styleUrl: './imoveis-locatarios.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisLocatariosPage implements OnInit, OnDestroy {
  private readonly leaseApi = inject(LeaseApiService);
  private readonly propertyApi = inject(PropertyApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private listRequestSub: Subscription | null = null;
  private listRequestUsesSkeleton = false;

  readonly propertyId = signal<string | null>(null);
  readonly property = signal<PropertyDto | null>(null);
  readonly isLoading = signal(false);
  readonly items = signal<LeaseDto[]>([]);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly propertySubtitle = computed(() => {
    const current = this.property();
    if (!current) {
      return 'Histórico completo de locatários por imóvel';
    }

    return `${current.title} - ${current.city}/${current.state}`;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toast.warning('Imóvel não informado.');
      void this.router.navigate(['/app/imoveis']);
      return;
    }

    this.propertyId.set(id);
    this.loadProperty(id);
    this.load();
  }

  ngOnDestroy(): void {
    this.cancelListRequest();
  }

  load(showLoading = true): void {
    const propertyId = this.propertyId();
    if (!propertyId) {
      return;
    }

    this.cancelListRequest();
    this.listRequestUsesSkeleton = showLoading;

    if (showLoading) {
      this.isLoading.set(true);
    }

    this.listRequestSub = this.leaseApi.list(this.page(), this.pageSize(), propertyId).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.totalItems.set(result.totalItems);
        this.totalPages.set(result.totalPages);
        this.listRequestSub = null;
        if (this.listRequestUsesSkeleton) {
          this.isLoading.set(false);
        }
        this.listRequestUsesSkeleton = false;
      },
      error: () => {
        this.toast.error('Falha ao carregar locatários do imóvel.');
        this.listRequestSub = null;
        if (this.listRequestUsesSkeleton) {
          this.isLoading.set(false);
        }
        this.listRequestUsesSkeleton = false;
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

  addTenant(): void {
    const propertyId = this.propertyId();
    if (!propertyId) {
      return;
    }

    void this.router.navigate(['/app/locacoes/new'], {
      queryParams: {
        propertyId,
        returnTo: `/app/imoveis/${propertyId}/locatarios`
      }
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Ativa';
      case 'ENDED':
        return 'Encerrada';
      case 'CANCELED':
        return 'Cancelada';
      case 'DRAFT':
        return 'Rascunho';
      default:
        return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'status status--active';
      case 'ENDED':
        return 'status status--ended';
      case 'CANCELED':
        return 'status status--canceled';
      default:
        return 'status';
    }
  }

  private loadProperty(id: string): void {
    this.propertyApi.getById(id).subscribe({
      next: (item) => this.property.set(item),
      error: () => this.toast.warning('Não foi possível carregar os dados do imóvel.')
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



