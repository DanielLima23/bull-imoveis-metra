import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PartyDto } from '../../../core/models/domain.model';
import { PartyApiService } from '../../../core/services/party-api.service';
import { createPartyForm, mapPartyFormToPayload } from '../../forms/party-form';
import { ToastService } from '../../services/toast.service';
import { PartyFormFieldsComponent } from '../party-form-fields/party-form-fields.component';

@Component({
  selector: 'app-party-quick-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, PartyFormFieldsComponent],
  templateUrl: './party-quick-create-modal.component.html',
  styleUrl: './party-quick-create-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartyQuickCreateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PartyApiService);
  private readonly toast = inject(ToastService);

  readonly defaultKind = input<string | null>(null);
  readonly cancelled = output<void>();
  readonly created = output<PartyDto>();

  readonly submitting = signal(false);
  readonly form = createPartyForm(this.fb, { isActive: true });

  private readonly applyDefaultKindEffect = effect(() => {
    const kind = this.defaultKind();
    if (!kind || this.form.controls.kind.dirty || this.form.controls.kind.value) {
      return;
    }

    this.form.controls.kind.setValue(kind);
  });

  close(): void {
    if (this.submitting()) {
      return;
    }

    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload = this.form.getRawValue();

    this.api.create(mapPartyFormToPayload(payload)).subscribe({
      next: (party) => {
        this.submitting.set(false);
        this.toast.success('Pessoa cadastrada com sucesso.');
        this.created.emit(party);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Falha ao cadastrar pessoa.');
      }
    });
  }
}
