import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CepService } from '../../../core/services/cep.service';
import { PropertyApiService, PropertyCreatePayload, PropertyUpdatePayload } from '../../../core/services/property-api.service';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import { getDomainOptions } from '../../../shared/utils/domain-label.util';
import { inferPropertyStatus, mapPropertyStatusToPayload } from '../../../shared/utils/property-status.util';

@Component({
  selector: 'app-imoveis-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, AsyncSearchSelectComponent, DateBrInputDirective, BrlCurrencyInputDirective],
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
  readonly propertyTypeOptions: SelectOption[] = [
    { id: 'Casa', label: 'Casa' },
    { id: 'Apartamento', label: 'Apartamento' },
    { id: 'Comercial', label: 'Comercial' },
    { id: 'Terreno', label: 'Terreno' }
  ];
  readonly propertyStatusOptions: SelectOption[] = getDomainOptions('propertyStatus');

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
    identity: this.fb.nonNullable.group({
      title: ['', Validators.required],
      propertyType: ['', Validators.required],
      status: ['AVAILABLE', Validators.required],
      zipCode: ['', [Validators.required, Validators.minLength(8)]],
      street: ['', Validators.required],
      number: ['', Validators.required],
      complement: [''],
      district: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]]
    }),
    documentation: this.fb.nonNullable.group({
      registration: [''],
      scripture: [''],
      registrationCertification: ['']
    }),
    characteristics: this.fb.nonNullable.group({
      numOfRooms: [0],
      cleaningIncluded: [false],
      elevator: [false],
      garage: [false],
      unoccupiedSince: ['']
    }),
    administration: this.fb.nonNullable.group({
      proprietary: [''],
      administrator: [''],
      administratorPhone: [''],
      administratorEmail: ['', Validators.email],
      administrateTax: [''],
      lawyer: [''],
      lawyerData: [''],
      observation: ['']
    }),
    initialRentAmount: [0],
    initialRentEffectiveFrom: [new Date().toISOString().slice(0, 10)]
  });

  ngOnInit(): void {
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
          identity: {
            title: item.title,
            propertyType: item.propertyType,
            status: inferPropertyStatus(item),
            zipCode: formattedZip,
            street: parsedAddress.street,
            number: parsedAddress.number,
            complement: parsedAddress.complement,
            district: parsedAddress.district,
            city: item.city,
            state: item.state
          },
          documentation: {
            registration: item.documentation?.registration ?? '',
            scripture: item.documentation?.scripture ?? '',
            registrationCertification: item.documentation?.registrationCertification ?? ''
          },
          characteristics: {
            numOfRooms: item.characteristics?.numOfRooms ?? 0,
            cleaningIncluded: !!item.characteristics?.cleaningIncluded,
            elevator: !!item.characteristics?.elevator,
            garage: !!item.characteristics?.garage,
            unoccupiedSince: item.characteristics?.unoccupiedSince ?? ''
          },
          administration: {
            proprietary: item.administration?.proprietary ?? item.proprietary ?? '',
            administrator: item.administration?.administrator ?? item.administrator ?? '',
            administratorPhone: item.administration?.administratorPhone ?? '',
            administratorEmail: item.administration?.administratorEmail ?? '',
            administrateTax: item.administration?.administrateTax ?? '',
            lawyer: item.administration?.lawyer ?? '',
            lawyerData: item.administration?.lawyerData ?? '',
            observation: item.administration?.observation ?? ''
          }
        });

        this.lastLookupCep.set(this.onlyDigits(item.zipCode));
      },
      error: () => this.toast.error('Falha ao carregar cadastro para edição.')
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const zipCodeDigits = this.onlyDigits(raw.identity.zipCode);
    if (zipCodeDigits.length !== 8) {
      this.toast.warning('Informe um CEP válido com 8 dígitos.');
      return;
    }

    this.submitting.set(true);
    const addressLine1 = this.composeAddressLine();
    const statusPayload = mapPropertyStatusToPayload(raw.identity.status);
    const basePayload: PropertyUpdatePayload = {
      identity: {
        title: raw.identity.title.trim(),
        propertyType: raw.identity.propertyType.trim(),
        occupancyStatus: statusPayload.occupancyStatus,
        assetState: statusPayload.assetState,
        addressLine1,
        city: raw.identity.city.trim(),
        state: raw.identity.state.trim().toUpperCase(),
        zipCode: zipCodeDigits
      },
      documentation: {
        registration: raw.documentation.registration.trim() || undefined,
        scripture: raw.documentation.scripture.trim() || undefined,
        registrationCertification: raw.documentation.registrationCertification.trim() || undefined
      },
      characteristics: {
        numOfRooms: raw.characteristics.numOfRooms || undefined,
        cleaningIncluded: raw.characteristics.cleaningIncluded,
        elevator: raw.characteristics.elevator,
        garage: raw.characteristics.garage,
        unoccupiedSince: raw.characteristics.unoccupiedSince || undefined
      },
      administration: {
        proprietary: raw.administration.proprietary.trim() || undefined,
        administrator: raw.administration.administrator.trim() || undefined,
        administratorPhone: raw.administration.administratorPhone.trim() || undefined,
        administratorEmail: raw.administration.administratorEmail.trim() || undefined,
        administrateTax: raw.administration.administrateTax.trim() || undefined,
        lawyer: raw.administration.lawyer.trim() || undefined,
        lawyerData: raw.administration.lawyerData.trim() || undefined,
        observation: raw.administration.observation.trim() || undefined
      }
    };

    if (!this.isEdit()) {
      const createPayload: PropertyCreatePayload = {
        ...basePayload,
        initialRentAmount: raw.initialRentAmount || undefined,
        initialRentEffectiveFrom: raw.initialRentAmount ? raw.initialRentEffectiveFrom : undefined
      };

      this.api.create(createPayload).subscribe({
        next: () => this.handleSuccess('Imóvel criado com sucesso.'),
        error: () => this.handleError('Falha ao criar imóvel.')
      });
      return;
    }

    this.api.update(this.id()!, basePayload).subscribe({
      next: () => this.handleSuccess('Imóvel atualizado com sucesso.'),
      error: () => this.handleError('Falha ao atualizar imóvel.')
    });
  }

  searchCep(): void {
    const zip = this.onlyDigits(this.form.controls.identity.controls.zipCode.value);
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
    this.form.controls.identity.controls.zipCode.valueChanges
      .pipe(
        map((value) => this.onlyDigits(value)),
        debounceTime(320),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((zipDigits) => {
        const formattedZip = this.formatZip(zipDigits);
        if (formattedZip !== this.form.controls.identity.controls.zipCode.value) {
          this.form.controls.identity.controls.zipCode.patchValue(formattedZip, { emitEvent: false });
        }

        if (zipDigits.length < 8) {
          this.cepStatus.set('idle');
          return;
        }

        this.lookupCep(zipDigits);
      });
  }

  private lockAutoAddressFields(): void {
    this.form.controls.identity.controls.street.disable({ emitEvent: false });
    this.form.controls.identity.controls.district.disable({ emitEvent: false });
    this.form.controls.identity.controls.city.disable({ emitEvent: false });
    this.form.controls.identity.controls.state.disable({ emitEvent: false });
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
          this.form.controls.identity.patchValue({
            street: address.street,
            district: address.district,
            city: address.city,
            state: address.state,
            complement: this.form.controls.identity.controls.complement.value || address.complement || ''
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
    const payload = this.form.getRawValue().identity;
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
