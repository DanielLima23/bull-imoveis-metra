import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReportsApiService } from '../../../core/services/reports-api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-relatorios-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './relatorios.page.html',
  styleUrl: './relatorios.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatoriosPage {
  private readonly fb = inject(FormBuilder);
  private readonly reportsApi = inject(ReportsApiService);
  private readonly toast = inject(ToastService);

  readonly now = new Date();
  readonly form = this.fb.nonNullable.group({
    month: [this.now.getMonth() + 1],
    year: [this.now.getFullYear()]
  });

  readonly downloading = signal(false);

  downloadFinancial(): void {
    const { month, year } = this.form.getRawValue();
    this.reportsApi.downloadFinancial(month, year);
    this.toast.success('Download de relatório financeiro iniciado.');
  }

  downloadVacancy(): void {
    const { month, year } = this.form.getRawValue();
    this.reportsApi.downloadVacancy(month, year);
    this.toast.success('Download de relatório de vacância iniciado.');
  }

  downloadPendencies(): void {
    this.reportsApi.downloadPendencies();
    this.toast.success('Download de relatório de pendências iniciado.');
  }
}

