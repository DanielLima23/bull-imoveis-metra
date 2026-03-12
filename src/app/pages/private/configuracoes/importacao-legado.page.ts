import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LegacyImportRequest, LegacyImportResultDto } from '../../../core/models/domain.model';
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
    payload: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    let payload: LegacyImportRequest;
    try {
      payload = this.parsePayload(this.form.controls.payload.value);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'JSON inválido para importação.');
      return;
    }

    this.submitting.set(true);
    this.api.import(payload).subscribe({
      next: (result) => {
        this.result.set(result);
        this.submitting.set(false);
        this.toast.success('Importação enviada com sucesso.');
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Falha ao executar importação legado.');
      }
    });
  }

  private parsePayload(raw: string): LegacyImportRequest {
    const parsed = JSON.parse(raw) as Partial<LegacyImportRequest>;
    const payload: LegacyImportRequest = {
      estates: Array.isArray(parsed.estates) ? parsed.estates : [],
      financialRecords: Array.isArray(parsed.financialRecords) ? parsed.financialRecords : [],
      histories: Array.isArray(parsed.histories) ? parsed.histories : [],
      pendencyAcronyms: Array.isArray(parsed.pendencyAcronyms) ? parsed.pendencyAcronyms : [],
      pendencyStates: Array.isArray(parsed.pendencyStates) ? parsed.pendencyStates : []
    };

    const missingKeys = ['estates', 'financialRecords', 'histories', 'pendencyAcronyms', 'pendencyStates'].filter(
      (key) => !(key in (parsed as Record<string, unknown>))
    );

    if (missingKeys.length > 0) {
      throw new Error(`JSON inválido. Faltam as chaves: ${missingKeys.join(', ')}.`);
    }

    return payload;
  }
}
