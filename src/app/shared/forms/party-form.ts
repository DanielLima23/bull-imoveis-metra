import { FormBuilder, Validators } from '@angular/forms';
import { PartyDto } from '../../core/models/domain.model';
import { normalizeDocument, normalizePhone } from '../utils/format.util';

export interface PartyFormInitialValue {
  kind?: string;
  name?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  notes?: string;
  isActive?: boolean;
}

export function createPartyForm(fb: FormBuilder, initial: PartyFormInitialValue = {}) {
  return fb.nonNullable.group({
    kind: [initial.kind ?? '', Validators.required],
    name: [initial.name ?? '', Validators.required],
    documentNumber: [initial.documentNumber ?? ''],
    email: [initial.email ?? '', Validators.email],
    phone: [initial.phone ?? ''],
    notes: [initial.notes ?? ''],
    isActive: [initial.isActive ?? true]
  });
}

export type PartyFormGroup = ReturnType<typeof createPartyForm>;
export type PartyFormValue = ReturnType<PartyFormGroup['getRawValue']>;

export interface PartyPayloadValue {
  kind: string;
  name: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
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
    notes: value.notes.trim() || undefined
  };
}

export function mapPartyFormToUpdatePayload(value: PartyFormValue): PartyUpdatePayloadValue {
  return {
    ...mapPartyFormToPayload(value),
    isActive: value.isActive
  };
}
