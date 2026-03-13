import { FormBuilder, Validators } from '@angular/forms';
import { PartyDto } from '../../core/models/domain.model';
import { resolveDomainCode } from '../utils/domain-label.util';
import { normalizeDocument, normalizePhone } from '../utils/format.util';

export interface PartyFormInitialValue {
  kind?: string;
  name?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  oab?: string;
  notes?: string;
  isActive?: boolean;
}

export function createPartyForm(fb: FormBuilder, initial: PartyFormInitialValue = {}) {
  const form = fb.nonNullable.group({
    kind: [initial.kind ?? '', Validators.required],
    name: [initial.name ?? '', Validators.required],
    documentNumber: [initial.documentNumber ?? ''],
    email: [initial.email ?? '', Validators.email],
    phone: [initial.phone ?? ''],
    oab: [initial.oab ?? ''],
    notes: [initial.notes ?? ''],
    isActive: [initial.isActive ?? true]
  });

  // Keep OAB aligned with the backend rule that only lawyers persist it.
  form.controls.kind.valueChanges.subscribe((kind) => {
    if (!isLawyerPartyKind(kind) && form.controls.oab.value) {
      form.controls.oab.setValue('', { emitEvent: false });
    }
  });

  if (!isLawyerPartyKind(form.controls.kind.value) && form.controls.oab.value) {
    form.controls.oab.setValue('', { emitEvent: false });
  }

  return form;
}

export type PartyFormGroup = ReturnType<typeof createPartyForm>;
export type PartyFormValue = ReturnType<PartyFormGroup['getRawValue']>;

export interface PartyPayloadValue {
  kind: string;
  name: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  oab?: string;
  notes?: string;
}

export interface PartyUpdatePayloadValue extends PartyPayloadValue {
  isActive: boolean;
}

export function patchPartyForm(form: PartyFormGroup, party: Partial<PartyDto>): void {
  form.patchValue({
    kind: party.kind ?? '',
    name: party.name ?? '',
    documentNumber: party.documentNumber ?? '',
    email: party.email ?? '',
    phone: party.phone ?? '',
    oab: party.oab ?? '',
    notes: party.notes ?? '',
    isActive: party.isActive ?? true
  });
}

export function mapPartyFormToPayload(value: PartyFormValue): PartyPayloadValue {
  return {
    kind: value.kind.trim(),
    name: value.name.trim(),
    documentNumber: normalizeDocument(value.documentNumber) || undefined,
    email: value.email.trim() || undefined,
    phone: normalizePhone(value.phone) || undefined,
    oab: isLawyerPartyKind(value.kind) ? value.oab.trim() || undefined : undefined,
    notes: value.notes.trim() || undefined
  };
}

export function mapPartyFormToUpdatePayload(value: PartyFormValue): PartyUpdatePayloadValue {
  return {
    ...mapPartyFormToPayload(value),
    isActive: value.isActive
  };
}

export function isLawyerPartyKind(kind?: string | null): boolean {
  return resolveDomainCode('partyKind', kind) === 'ADVOGADO';
}
