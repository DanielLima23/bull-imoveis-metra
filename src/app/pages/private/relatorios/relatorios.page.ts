import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReportsApiService } from '../../../core/services/reports-api.service';
import { ReportCatalogItemDto } from '../../../core/models/domain.model';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-relatorios-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './relatorios.page.html',
  styleUrl: './relatorios.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatoriosPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reportsApi = inject(ReportsApiService);
  private readonly toast = inject(ToastService);

  readonly now = new Date();
  readonly loading = signal(true);
  readonly catalog = signal<ReportCatalogItemDto[]>([]);

  readonly form = this.fb.nonNullable.group({
    month: [this.now.getMonth() + 1],
    year: [this.now.getFullYear()]
  });

  readonly normalizedCatalog = computed(() =>
    this.catalog().map((item) => ({
      slug: item.slug ?? '',
      name: item.name ?? 'Relatório',
      description: item.description ?? 'Exportação sob demanda',
      requiresMonth: item.requiresMonth,
      requiresYear: item.requiresYear
    }))
  );

  ngOnInit(): void {
    this.reportsApi.listCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Falha ao carregar catálogo de relatórios.');
        this.loading.set(false);
      }
    });
  }

  download(report: { slug: string; name: string; requiresMonth: boolean; requiresYear: boolean }): void {
    if (!report.slug) {
      this.toast.error('Relatório sem slug configurado.');
      return;
    }

    const { month, year } = this.form.getRawValue();
    const fileName = `${report.slug}-${report.requiresYear ? year : 'geral'}${report.requiresMonth ? `-${String(month).padStart(2, '0')}` : ''}.csv`;

    this.reportsApi.downloadBySlug(
      report.slug,
      {
        mes: report.requiresMonth ? month : undefined,
        ano: report.requiresYear ? year : undefined
      },
      fileName
    );

    this.toast.success(`Download do relatório "${report.name}" iniciado.`);
  }
}
