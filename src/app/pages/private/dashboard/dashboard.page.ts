import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';
import { RealEstateDashboardDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { DateOnlyBrPipe } from '../../../shared/pipes/date-only-br.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [PageHeaderComponent, BrlCurrencyPipe, DateOnlyBrPipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly toast = inject(ToastService);

  readonly data = signal<RealEstateDashboardDto | null>(null);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.dashboardApi.get().subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Falha ao carregar o painel.');
        this.isLoading.set(false);
      }
    });
  }
}

