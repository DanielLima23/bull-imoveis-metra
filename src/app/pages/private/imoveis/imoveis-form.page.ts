import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PropertyApiService } from '../../../core/services/property-api.service';
import { CepService } from '../../../core/services/cep.service';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-imoveis-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, AsyncSearchSelectComponent],
  templateUrl: './imoveis-form.page.html',
  styleUrl: './imoveis-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PropertyApiService);
  private readonly cepService = inject(CepService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly invalidSubmitPulse = signal(false);
  readonly propertyTypeOptions: SelectOption[] = [
    { id: 'Casa', label: 'Casa' },
    { id: 'Apartamento', label: 'Apartamento' }
  ];
  readonly propertyStatusOptions: SelectOption[] = [
    { id: 'AVAILABLE', label: 'Disponível' },
    { id: 'LEASED', label: 'Locado' },
    { id: 'PREPARATION', label: 'Preparação' }
  ];

  private invalidSubmitTimer: number | null = null;

  readonly isCepLoading = signal(false);
  readonly cepStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly lastLookupCep = signal('');
  readonly cepStatusText = computed(() => {
    switch (this.cepStatus()) {
      case 'loading':
        return 'Buscando endereço do CEP...';
      case 'success':
        return 'Endereço preenchido automaticamente. Confira número e complemento.';
      case 'error':
        return 'Não foi possível localizar o CEP. Preencha o endereço manualmente.';
      default:
        return 'Digite o CEP para preencher rua, bairro, cidade e UF automaticamente.';
    }
  });

  readonly form = this.fb.nonNullable.group({
    alias: ['', Validators.required],
    status: ['AVAILABLE', Validators.required],
    zipCode: ['', [Validators.required, Validators.minLength(8)]],
    street: ['', Validators.required],
    number: ['', Validators.required],
    complement: [''],
    district: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    propertyType: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.invalidSubmitTimer) {
        window.clearTimeout(this.invalidSubmitTimer);
      }
    });

    this.lockAutoAddressFields();
    this.watchZipCode();

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      return;
    }

    this.api.getById(id).subscribe({
      next: (item) => {
        const parsedAddress = this.parseAddressLine(item.addressLine1);
        const formattedZip = this.formatZip(this.onlyDigits(item.zipCode));

        this.form.patchValue({
          alias: item.title,
          status: item.status,
          zipCode: formattedZip,
          street: parsedAddress.street,
          number: parsedAddress.number,
          complement: parsedAddress.complement,
          district: parsedAddress.district,
          city: item.city,
          state: item.state,
          propertyType: item.propertyType,
          notes: item.notes ?? ''
        });

        this.lastLookupCep.set(this.onlyDigits(item.zipCode));
      },
      error: () => this.toast.error('Falha ao carregar cadastro para edição.')
    });
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.triggerInvalidSubmitFeedback();
      return;
    }

    const payload = this.form.getRawValue();
    const zipCodeDigits = this.onlyDigits(payload.zipCode);
    if (zipCodeDigits.length !== 8) {
      this.form.controls.zipCode.markAsTouched();
      this.triggerInvalidSubmitFeedback('Informe um CEP válido com 8 dígitos.');
      return;
    }

    if (!payload.street.trim() || !payload.district.trim() || !payload.city.trim() || !payload.state.trim()) {
      this.cepStatus.set('error');
      this.form.controls.zipCode.markAsTouched();
      this.triggerInvalidSubmitFeedback('Busque um CEP válido para preencher o endereço automaticamente.');
      return;
    }

    this.submitting.set(true);
    const id = this.id();
    const addressLine1 = this.composeAddressLine();

    if (!id) {
      this.api
        .create({
          title: payload.alias,
          addressLine1,
          city: payload.city,
          state: payload.state.toUpperCase(),
          zipCode: zipCodeDigits,
          propertyType: payload.propertyType,
          status: payload.status,
          notes: payload.notes
        })
        .subscribe({
          next: () => this.handleSuccess('Imóvel criado com sucesso.'),
          error: () => this.handleError('Falha ao criar imóvel.')
        });
      return;
    }

    this.api
      .update(id, {
        title: payload.alias,
        addressLine1,
        city: payload.city,
        state: payload.state.toUpperCase(),
        zipCode: zipCodeDigits,
        propertyType: payload.propertyType,
        status: payload.status,
        notes: payload.notes
      })
      .subscribe({
        next: () => this.handleSuccess('Imóvel atualizado com sucesso.'),
        error: () => this.handleError('Falha ao atualizar imóvel.')
      });
  }

  searchCep(): void {
    const zip = this.onlyDigits(this.form.controls.zipCode.value);
    if (zip.length !== 8) {
      this.cepStatus.set('error');
      this.toast.error('Digite um CEP válido para buscar o endereço.');
      return;
    }

    this.lookupCep(zip);
  }

  back(): void {
    void this.router.navigate(['/app/imoveis']);
  }

  private watchZipCode(): void {
    this.form.controls.zipCode.valueChanges
      .pipe(
        map((value) => this.onlyDigits(value)),
        debounceTime(320),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((zipDigits) => {
        const formattedZip = this.formatZip(zipDigits);
        if (formattedZip !== this.form.controls.zipCode.value) {
          this.form.controls.zipCode.patchValue(formattedZip, { emitEvent: false });
        }

        if (zipDigits.length < 8) {
          this.cepStatus.set('idle');
          return;
        }

        this.lookupCep(zipDigits);
      });
  }

  private lockAutoAddressFields(): void {
    this.form.controls.street.disable({ emitEvent: false });
    this.form.controls.district.disable({ emitEvent: false });
    this.form.controls.city.disable({ emitEvent: false });
    this.form.controls.state.disable({ emitEvent: false });
  }

  private lookupCep(zipDigits: string): void {
    if (this.lastLookupCep() === zipDigits || this.isCepLoading()) {
      return;
    }

    this.isCepLoading.set(true);
    this.cepStatus.set('loading');

    this.cepService
      .lookup(zipDigits)
      .pipe(finalize(() => this.isCepLoading.set(false)))
      .subscribe({
        next: (address) => {
          this.form.patchValue({
            street: address.street,
            district: address.district,
            city: address.city,
            state: address.state,
            complement: this.form.controls.complement.value || address.complement || ''
          });

          this.lastLookupCep.set(zipDigits);
          this.cepStatus.set('success');
        },
        error: () => {
          this.cepStatus.set('error');
        }
      });
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 8);
  }

  private formatZip(digits: string): string {
    const trimmed = digits.slice(0, 8);
    if (trimmed.length <= 5) {
      return trimmed;
    }

    return `${trimmed.slice(0, 5)}-${trimmed.slice(5)}`;
  }

  private composeAddressLine(): string {
    const payload = this.form.getRawValue();
    const complementPart = payload.complement.trim() ? ` - ${payload.complement.trim()}` : '';
    return `${payload.street.trim()}, ${payload.number.trim()}${complementPart} (${payload.district.trim()})`;
  }

  private parseAddressLine(addressLine1: string): { street: string; number: string; complement: string; district: string } {
    const regex = /^(.*?),\s*(\S+)(?:\s*-\s*(.*?))?\s*\((.*?)\)\s*$/;
    const parsed = addressLine1.match(regex);

    if (!parsed) {
      return {
        street: addressLine1,
        number: '',
        complement: '',
        district: ''
      };
    }

    return {
      street: parsed[1] ?? '',
      number: parsed[2] ?? '',
      complement: parsed[3] ?? '',
      district: parsed[4] ?? ''
    };
  }

  private triggerInvalidSubmitFeedback(message = 'Faltam campos obrigatórios para concluir o cadastro.'): void {
    this.toast.warning(message);

    this.invalidSubmitPulse.set(false);
    window.setTimeout(() => this.invalidSubmitPulse.set(true), 0);

    if (this.invalidSubmitTimer) {
      window.clearTimeout(this.invalidSubmitTimer);
    }

    this.invalidSubmitTimer = window.setTimeout(() => {
      this.invalidSubmitPulse.set(false);
      this.invalidSubmitTimer = null;
    }, 520);
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.toast.success(message);
    void this.router.navigate(['/app/imoveis']);
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.toast.error(message);
  }
}


