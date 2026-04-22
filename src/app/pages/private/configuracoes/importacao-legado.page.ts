import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LegacyImportResultDto } from '../../../core/models/domain.model';
import { LegacyImportApiService } from '../../../core/services/legacy-import-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-importacao-legado-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './importacao-legado.page.html',
  styleUrl: './importacao-legado.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportacaoLegadoPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LegacyImportApiService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly result = signal<LegacyImportResultDto | null>(null);

  readonly form = this.fb.nonNullable.group({
    databaseUrl: [
      '',
      [
        Validators.required,
        Validators.minLength(20),
        Validators.pattern(/^(postgres|postgresql):\/\//i)
      ]
    ]
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.api
      .importFromDatabaseUrl({
        databaseUrl: this.form.controls.databaseUrl.value.trim()
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.submitting.set(false);
          this.toast.success('Importação concluída com sucesso.');
        },
        error: () => {
          this.submitting.set(false);
          this.toast.error('Falha ao importar os dados do banco legado.');
        }
      });
  }
}
