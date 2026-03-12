import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PartyApiService } from '../../../core/services/party-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CpfCnpjInputDirective } from '../../../shared/directives/cpf-cnpj-input.directive';
import { PhoneBrInputDirective } from '../../../shared/directives/phone-br-input.directive';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizeDocument, normalizePhone } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-pessoas-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, CpfCnpjInputDirective, PhoneBrInputDirective],
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

  readonly form = this.fb.nonNullable.group({
    kind: ['', Validators.required],
    name: ['', Validators.required],
    documentNumber: [''],
    email: ['', Validators.email],
    phone: [''],
    notes: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          kind: item.kind ?? '',
          name: item.name ?? '',
          documentNumber: item.documentNumber ?? '',
          email: item.email ?? '',
          phone: item.phone ?? '',
          notes: item.notes ?? '',
          isActive: item.isActive
        });
      },
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

    const basePayload = {
      kind: payload.kind.trim(),
      name: payload.name.trim(),
      documentNumber: normalizeDocument(payload.documentNumber),
      email: payload.email.trim() || undefined,
      phone: normalizePhone(payload.phone),
      notes: payload.notes.trim() || undefined
    };

    if (!id) {
      this.api.create(basePayload).subscribe({
        next: () => this.handleSuccess('Pessoa criada com sucesso.'),
        error: () => this.handleError('Falha ao criar pessoa.')
      });
      return;
    }

    this.api.update(id, { ...basePayload, isActive: payload.isActive }).subscribe({
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
