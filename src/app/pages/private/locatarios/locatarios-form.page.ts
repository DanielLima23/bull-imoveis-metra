import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TenantApiService } from '../../../core/services/tenant-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CpfCnpjInputDirective } from '../../../shared/directives/cpf-cnpj-input.directive';
import { PhoneBrInputDirective } from '../../../shared/directives/phone-br-input.directive';
import { normalizeDocument, normalizePhone } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-locatarios-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, CpfCnpjInputDirective, PhoneBrInputDirective],
  templateUrl: './locatarios-form.page.html',
  styleUrl: './locatarios-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocatariosFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TenantApiService);
  private readonly toast = inject(ToastService);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly returnTo = signal<string | null>(null);
  readonly returnPropertyId = signal<string | null>(null);
  readonly leaseReturnTo = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    documentNumber: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    isActive: [true]
  });

  ngOnInit(): void {
    this.returnTo.set(this.normalizeReturnTo(this.route.snapshot.queryParamMap.get('returnTo')));
    this.returnPropertyId.set(this.route.snapshot.queryParamMap.get('propertyId'));
    this.leaseReturnTo.set(this.normalizeReturnTo(this.route.snapshot.queryParamMap.get('leaseReturnTo')));

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          name: item.name,
          documentNumber: item.documentNumber,
          email: item.email,
          phone: item.phone,
          isActive: item.isActive
        });
      },
      error: () => this.toast.error('Falha ao carregar locatário para edição.')
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
    const documentNumber = normalizeDocument(payload.documentNumber);
    const phone = normalizePhone(payload.phone);

    if (!id) {
      this.api
        .create({
          name: payload.name,
          documentNumber,
          email: payload.email,
          phone
        })
        .subscribe({
          next: (created) => this.handleCreateSuccess(created.id),
          error: () => this.handleError('Falha ao cadastrar locatário.')
        });
      return;
    }

    this.api
      .update(id, {
        ...payload,
        documentNumber,
        phone
      })
      .subscribe({
        next: () => this.handleSuccess('Locatário atualizado com sucesso.'),
        error: () => this.handleError('Falha ao atualizar locatário.')
      });
  }

  back(): void {
    if (!this.isEdit() && this.returnTo()) {
      this.navigateToReturnFlow();
      return;
    }

    void this.router.navigate(['/app/locatarios']);
  }

  private handleCreateSuccess(createdTenantId: string): void {
    this.submitting.set(false);
    this.toast.success('Locatário cadastrado com sucesso.');

    if (!this.isEdit() && this.returnTo()) {
      this.navigateToReturnFlow(createdTenantId);
      return;
    }

    void this.router.navigate(['/app/locatarios']);
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.router.navigate(['/app/locatarios']);
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.toast.error(message);
  }

  private navigateToReturnFlow(tenantId?: string): void {
    const returnTo = this.returnTo();
    if (!returnTo) {
      void this.router.navigate(['/app/locatarios']);
      return;
    }

    const queryParams: Record<string, string> = {};

    const propertyId = this.returnPropertyId();
    if (propertyId) {
      queryParams['propertyId'] = propertyId;
    }

    const leaseReturnTo = this.leaseReturnTo();
    if (leaseReturnTo) {
      queryParams['returnTo'] = leaseReturnTo;
    }

    if (tenantId) {
      queryParams['tenantId'] = tenantId;
    }

    void this.router.navigate([returnTo], { queryParams });
  }

  private normalizeReturnTo(value: string | null): string | null {
    if (!value || !value.startsWith('/app/')) {
      return null;
    }

    return value;
  }
}

