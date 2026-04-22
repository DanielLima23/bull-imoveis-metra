import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeaseDto, PartyDto } from '../../../core/models/domain.model';
import {
  PropertyStatusTransitionResult,
  PropertyStatusTransitionService
} from '../../../core/services/property-status-transition.service';
import { AsyncSearchSelectComponent } from '../../../shared/components/async-search-select/async-search-select.component';
import { FlowGuidanceModalComponent } from '../../../shared/components/flow-guidance-modal/flow-guidance-modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PartyPickerFieldComponent } from '../../../shared/components/party-picker-field/party-picker-field.component';
import { PartyQuickCreateModalComponent } from '../../../shared/components/party-quick-create-modal/party-quick-create-modal.component';
import { CepService } from '../../../core/services/cep.service';
import { PropertyApiService, PropertyCreatePayload, PropertyUpdatePayload } from '../../../core/services/property-api.service';
import { SelectOption } from '../../../shared/models/select-option.model';
import { ToastService } from '../../../shared/services/toast.service';
import { DateBrInputDirective } from '../../../shared/directives/date-br-input.directive';
import { BrlCurrencyInputDirective } from '../../../shared/directives/brl-currency-input.directive';
import {
  getPropertyIdleReasonOptions,
  getPropertyStatusOptions,
  inferPropertyIdleReason,
  inferPropertyStatus,
  mapPropertyStatusToPayload,
  requiresPropertyIdleReason
} from '../../../shared/utils/property-status.util';

@Component({
  selector: 'app-imoveis-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    AsyncSearchSelectComponent,
    PartyPickerFieldComponent,
    PartyQuickCreateModalComponent,
    DateBrInputDirective,
    BrlCurrencyInputDirective,
    FlowGuidanceModalComponent
  ],
  providers: [PropertyStatusTransitionService],
  templateUrl: './imoveis-form.page.html',
  styleUrl: './imoveis-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PropertyApiService);
  private readonly propertyStatusTransition = inject(PropertyStatusTransitionService);
  private readonly cepService = inject(CepService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private statusValidationToken = 0;
  private restoringIdentityStatus = false;
  private identityStatusGuardReady = false;
  private identityStableSelection = { status: 'AVAILABLE', idleReason: '' };

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly submitting = signal(false);
  readonly isProprietaryCreateModalOpen = signal(false);
  readonly isAdministratorCreateModalOpen = signal(false);
  readonly isLawyerCreateModalOpen = signal(false);
  readonly propertyTypeOptions: SelectOption[] = [
    { id: 'Casa', label: 'Casa' },
    { id: 'Apartamento', label: 'Apartamento' },
    { id: 'Comercial', label: 'Comercial' },
    { id: 'Terreno', label: 'Terreno' }
  ];
  readonly propertyStatusOptions: SelectOption[] = getPropertyStatusOptions();
  readonly propertyIdleReasonOptions: SelectOption[] = getPropertyIdleReasonOptions(true);
  readonly lastLeaseEndDate = signal('');
  readonly flowGuidanceModal = signal<{ title: string; message: string; queryParams: Params } | null>(null);

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
      idleReason: [''],
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
      numOfGarage: [0],
      elevator: [false],
      garage: [false],
      unoccupiedSince: ['']
    }),
    administration: this.fb.nonNullable.group({
      proprietary: [''],
      proprietaryPartyId: [''],
      administrator: [''],
      administratorPartyId: [''],
      administratorPhone: [''],
      administratorEmail: [''],
      administrateTax: [''],
      lawyer: [''],
      lawyerPartyId: [''],
      lawyerData: [''],
      observation: ['']
    }),
    initialRentAmount: [0],
    initialRentEffectiveFrom: [new Date().toISOString().slice(0, 10)]
  });

  ngOnInit(): void {
    this.lockAutoAddressFields();
    this.watchZipCode();
    this.watchStatus();

    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);

    if (!id) {
      this.syncUnoccupiedSinceField(this.form.controls.identity.controls.status.value);
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
            idleReason: inferPropertyIdleReason(item),
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
            numOfGarage: item.characteristics?.numOfGarage ?? 0,
            elevator: !!item.characteristics?.elevator,
            garage: !!item.characteristics?.garage,
            unoccupiedSince: item.characteristics?.unoccupiedSince ?? ''
          },
          administration: {
            proprietary: item.administration?.proprietary ?? item.proprietary ?? '',
            proprietaryPartyId: item.administration?.proprietaryPartyId ?? item.proprietaryPartyId ?? '',
            administrator: item.administration?.administrator ?? item.administrator ?? '',
            administratorPartyId: item.administration?.administratorPartyId ?? item.administratorPartyId ?? '',
            administratorPhone: item.administration?.administratorPhone ?? '',
            administratorEmail: item.administration?.administratorEmail ?? '',
            administrateTax: item.administration?.administrateTax ?? '',
            lawyer: item.administration?.lawyer ?? item.lawyer ?? '',
            lawyerPartyId: item.administration?.lawyerPartyId ?? item.lawyerPartyId ?? '',
            lawyerData: item.administration?.lawyerData ?? '',
            observation: item.administration?.observation ?? ''
          }
        });

        this.lastLookupCep.set(this.onlyDigits(item.zipCode));
        this.syncIdleReasonValidator(this.form.controls.identity.controls.status.value);
        this.syncUnoccupiedSinceField(this.form.controls.identity.controls.status.value);
        this.identityStableSelection = {
          status: this.form.controls.identity.controls.status.value,
          idleReason: this.form.controls.identity.controls.idleReason.value
        };
        this.identityStatusGuardReady = true;

        if (!this.isLeasedStatus(inferPropertyStatus(item))) {
          this.loadLastLeaseEndDate(id);
        }
      },
      error: () => this.toast.error('Falha ao carregar cadastro para edição.')
    });
  }

  submit(): void {
    this.syncIdleReasonValidator(this.form.controls.identity.controls.status.value);

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
    const statusPayload = mapPropertyStatusToPayload(raw.identity.status, raw.identity.idleReason);
    const basePayload: PropertyUpdatePayload = {
      identity: {
        title: raw.identity.title.trim(),
        propertyType: raw.identity.propertyType.trim(),
        status: statusPayload.status,
        idleReason: statusPayload.idleReason,
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
        numOfGarage: raw.characteristics.numOfGarage || undefined,
        elevator: raw.characteristics.elevator,
        garage: raw.characteristics.garage,
        unoccupiedSince: raw.characteristics.unoccupiedSince || undefined
      },
      administration: {
        proprietary: raw.administration.proprietary.trim() || undefined,
        proprietaryPartyId: raw.administration.proprietaryPartyId.trim() || undefined,
        administrator: raw.administration.administrator.trim() || undefined,
        administratorPartyId: raw.administration.administratorPartyId.trim() || undefined,
        administratorPhone: raw.administration.administratorPhone.trim() || undefined,
        administratorEmail: raw.administration.administratorEmail.trim() || undefined,
        administrateTax: raw.administration.administrateTax.trim() || undefined,
        lawyer: raw.administration.lawyer.trim() || undefined,
        lawyerPartyId: raw.administration.lawyerPartyId.trim() || undefined,
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

  navigateToPartyRegistration(): void {
    this.isProprietaryCreateModalOpen.set(true);
  }

  openAdministratorCreateModal(): void {
    this.isAdministratorCreateModalOpen.set(true);
  }

  openLawyerCreateModal(): void {
    this.isLawyerCreateModalOpen.set(true);
  }

  closeProprietaryCreateModal(): void {
    this.isProprietaryCreateModalOpen.set(false);
  }

  closeAdministratorCreateModal(): void {
    this.isAdministratorCreateModalOpen.set(false);
  }

  closeLawyerCreateModal(): void {
    this.isLawyerCreateModalOpen.set(false);
  }

  handleProprietaryCreated(party: PartyDto): void {
    this.isProprietaryCreateModalOpen.set(false);
    this.form.controls.administration.controls.proprietaryPartyId.setValue(party.id);
    this.onProprietaryPartyChange(party);
  }

  handleAdministratorCreated(party: PartyDto): void {
    this.isAdministratorCreateModalOpen.set(false);
    this.form.controls.administration.controls.administratorPartyId.setValue(party.id);
    this.onAdministratorPartyChange(party);
  }

  handleLawyerCreated(party: PartyDto): void {
    this.isLawyerCreateModalOpen.set(false);
    this.form.controls.administration.controls.lawyerPartyId.setValue(party.id);
    this.onLawyerPartyChange(party);
  }

  closeFlowGuidanceModal(): void {
    this.flowGuidanceModal.set(null);
  }

  navigateFromFlowGuidanceModal(): void {
    const modal = this.flowGuidanceModal();
    if (!modal) {
      return;
    }

    this.flowGuidanceModal.set(null);
    void this.router.navigate(['/app/locacoes'], { queryParams: modal.queryParams });
  }

  shouldShowIdleReason(value?: string | null): boolean {
    return requiresPropertyIdleReason(value);
  }

  shouldShowUnoccupiedSince(value?: string | null): boolean {
    return !this.isLeasedStatus(value);
  }

  onProprietaryPartyChange(party: PartyDto | null): void {
    this.form.controls.administration.controls.proprietary.setValue(party?.name ?? '');
  }

  onAdministratorPartyChange(party: PartyDto | null): void {
    this.form.controls.administration.patchValue({
      administrator: party?.name ?? '',
      administratorPhone: party?.phone ?? '',
      administratorEmail: party?.email ?? ''
    });
  }

  onLawyerPartyChange(party: PartyDto | null): void {
    this.form.controls.administration.patchValue({
      lawyer: party?.name ?? '',
      lawyerData: party?.oab ?? ''
    });
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

  private watchStatus(): void {
    this.form.controls.identity.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((status) => {
      if (this.restoringIdentityStatus) {
        return;
      }

      this.syncIdleReasonValidator(status);
      this.syncUnoccupiedSinceField(status);

      if (!this.isEdit() || !this.identityStatusGuardReady) {
        return;
      }

      this.handleIdentityStatusSelectionChange(status);
    });

    this.form.controls.identity.controls.idleReason.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((idleReason) => {
      if (this.restoringIdentityStatus || !this.identityStatusGuardReady) {
        return;
      }

      if (this.normalizeStatus(this.form.controls.identity.controls.status.value) !== this.normalizeStatus(this.identityStableSelection.status)) {
        return;
      }

      this.identityStableSelection = {
        ...this.identityStableSelection,
        idleReason
      };
    });

    this.syncIdleReasonValidator(this.form.controls.identity.controls.status.value);
    this.syncUnoccupiedSinceField(this.form.controls.identity.controls.status.value);
  }

  private syncIdleReasonValidator(status?: string | null): void {
    const idleReasonControl = this.form.controls.identity.controls.idleReason;
    const isRequired = requiresPropertyIdleReason(status);

    if (isRequired) {
      idleReasonControl.setValidators([Validators.required]);
    } else {
      idleReasonControl.setValidators([]);
      if (idleReasonControl.value) {
        idleReasonControl.patchValue('', { emitEvent: false });
      }
    }

    idleReasonControl.updateValueAndValidity({ emitEvent: false });
  }

  private syncUnoccupiedSinceField(status?: string | null): void {
    const control = this.form.controls.characteristics.controls.unoccupiedSince;

    if (this.isLeasedStatus(status)) {
      if (control.value) {
        control.patchValue('', { emitEvent: false });
      }
      return;
    }

    if (this.lastLeaseEndDate()) {
      control.patchValue(this.lastLeaseEndDate(), { emitEvent: false });
    }
  }

  private loadLastLeaseEndDate(propertyId: string): void {
    this.api.getLeaseHistory(propertyId, { silent: true }).subscribe({
      next: (leases) => {
        const lastEndedLease = this.resolveLastEndedLease(leases);
        this.lastLeaseEndDate.set(lastEndedLease?.endDate ?? '');
        this.syncUnoccupiedSinceField(this.form.controls.identity.controls.status.value);
      },
      error: () => {
        this.lastLeaseEndDate.set('');
      }
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

  private handleIdentityStatusSelectionChange(nextStatus: string): void {
    const propertyId = this.id();
    if (!propertyId) {
      return;
    }

    const currentSelection = { ...this.identityStableSelection };
    if (this.normalizeStatus(nextStatus) === this.normalizeStatus(currentSelection.status)) {
      return;
    }

    const token = ++this.statusValidationToken;
    this.propertyStatusTransition.validateTransition(propertyId, currentSelection.status, nextStatus).subscribe((result) => {
      if (token !== this.statusValidationToken) {
        return;
      }

      if (result === 'allowed') {
        this.identityStableSelection = {
          status: nextStatus,
          idleReason: this.form.controls.identity.controls.idleReason.value
        };
        return;
      }

      this.restoreIdentityStatusSelection(currentSelection);
      this.openBlockedStatusModal(propertyId, result);
    });
  }

  private restoreIdentityStatusSelection(selection: { status: string; idleReason: string }): void {
    this.restoringIdentityStatus = true;
    this.form.controls.identity.patchValue(
      {
        status: selection.status,
        idleReason: selection.idleReason
      },
      { emitEvent: false }
    );
    this.restoringIdentityStatus = false;
    this.syncIdleReasonValidator(selection.status);
    this.syncUnoccupiedSinceField(selection.status);
    this.identityStableSelection = selection;
  }

  private openBlockedStatusModal(propertyId: string, result: PropertyStatusTransitionResult): void {
    if (result === 'blocked_requires_active_lease') {
      this.flowGuidanceModal.set({
        title: 'Para marcar este imóvel como alugado',
        message: 'É necessário existir uma locação ativa vinculada a este imóvel antes de definir o status como alugado.',
        queryParams: {
          propertyId,
          guideMode: 'activate-lease'
        }
      });
      return;
    }

    this.flowGuidanceModal.set({
      title: 'Para alterar o status deste imóvel',
      message: 'Existe uma locação ativa vinculada a este imóvel. Encerre o contrato antes de alterar o status manualmente.',
      queryParams: {
        propertyId,
        status: 'ACTIVE',
        guideMode: 'close-active-lease'
      }
    });
  }

  private isLeasedStatus(status?: string | null): boolean {
    return String(status ?? '').trim().toUpperCase() === 'LEASED';
  }

  private resolveLastEndedLease(leases: LeaseDto[]): LeaseDto | null {
    return [...leases]
      .filter((lease) => !!lease.endDate)
      .sort((left, right) => String(right.endDate).localeCompare(String(left.endDate)))[0] ?? null;
  }

  private normalizeStatus(value?: string | null): string {
    return String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .toUpperCase();
  }
}
