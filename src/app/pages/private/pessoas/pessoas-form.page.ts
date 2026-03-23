import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PartyApiService } from '../../../core/services/party-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PartyFormFieldsComponent } from '../../../shared/components/party-form-fields/party-form-fields.component';
import { createPartyForm, mapPartyFormToPayload, mapPartyFormToUpdatePayload, patchPartyForm } from '../../../shared/forms/party-form';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-pessoas-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, PartyFormFieldsComponent],
  templateUrl: './pessoas-form.page.html',
  styleUrl: './pessoas-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PessoasFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PartyApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly form = createPartyForm(this.fb);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => patchPartyForm(this.form, item),
      error: () => this.toast.error('Falha ao carregar pessoa para edição.')
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const id = this.id();
    const payload = this.form.getRawValue();

    if (!id) {
      this.api.create(mapPartyFormToPayload(payload)).subscribe({
        next: () => this.handleSuccess('Pessoa criada com sucesso.'),
        error: () => this.handleError('Falha ao criar pessoa.')
      });
      return;
    }

    this.api.update(id, mapPartyFormToUpdatePayload(payload)).subscribe({
      next: () => this.handleSuccess('Pessoa atualizada com sucesso.'),
      error: () => this.handleError('Falha ao atualizar pessoa.')
    });
  }

  back(): void {
    void this.router.navigate(['/app/pessoas']);
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.router.navigate(['/app/pessoas']);
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.toast.error(message);
  }
}
