import { SelectOption } from '../models/select-option.model';

export interface PropertyStatusSource {
  status?: string | null;
  motivoOciosidade?: string | null;
  idleReason?: string | null;
  occupancyStatus?: string | null;
  assetState?: string | null;
}

export interface PropertyStatusPayload {
  status: string;
  idleReason?: string | null;
}

const DEFAULT_PROPERTY_STATUS = 'AVAILABLE';
const IDLE_PROPERTY_STATUS = 'IDLE';

const PROPERTY_STATUS_OPTIONS: SelectOption[] = [
  { id: 'AVAILABLE', label: 'Disponivel' },
  { id: 'LEASED', label: 'Alugado' },
  { id: 'INACTIVE', label: 'Inativo' },
  { id: 'FOR_SALE', label: 'A venda' },
  { id: 'DEMANDS', label: 'Demandas' },
  { id: 'IDLE', label: 'Ocioso' }
];

const PROPERTY_IDLE_REASON_OPTIONS: SelectOption[] = [
  { id: 'RENOVATION', label: 'Reforma' },
  { id: 'TERMINATION', label: 'Rescisao' },
  { id: 'LEGAL_PENDING', label: 'Pendencia juridica' }
];

const STATUS_PT_BR_TO_LEGACY: Record<string, string> = {
  DISPONIVEL: 'AVAILABLE',
  ALUGADO: 'LEASED',
  INATIVO: 'INACTIVE',
  A_VENDA: 'FOR_SALE',
  DEMANDAS: 'DEMANDS',
  OCIOSO: 'IDLE'
};

const IDLE_REASON_PT_BR_TO_LEGACY: Record<string, string> = {
  REFORMA: 'RENOVATION',
  RESCISAO: 'TERMINATION',
  PENDENCIA_JURIDICA: 'LEGAL_PENDING'
};

export function getPropertyStatusOptions(includeEmptyOption = false, emptyLabel = 'Todos'): SelectOption[] {
  if (!includeEmptyOption) {
    return [...PROPERTY_STATUS_OPTIONS];
  }

  return [{ id: '', label: emptyLabel }, ...PROPERTY_STATUS_OPTIONS];
}

export function getPropertyIdleReasonOptions(includeEmptyOption = false, emptyLabel = 'Selecione'): SelectOption[] {
  if (!includeEmptyOption) {
    return [...PROPERTY_IDLE_REASON_OPTIONS];
  }

  return [{ id: '', label: emptyLabel }, ...PROPERTY_IDLE_REASON_OPTIONS];
}

export function requiresPropertyIdleReason(status?: string | null): boolean {
  return normalizeValue(status) === IDLE_PROPERTY_STATUS;
}

export function inferPropertyStatus(source: PropertyStatusSource): string {
  const status = mapStatusToLegacy(normalizeValue(source.status));
  if (status && PROPERTY_STATUS_OPTIONS.some((option) => option.id === status)) {
    return status;
  }

  if (status === 'UNAVAILABLE') {
    return 'DEMANDS';
  }

  const occupancyStatus = normalizeValue(source.occupancyStatus);
  const assetState = normalizeValue(source.assetState);

  if (occupancyStatus === 'OCCUPIED' || occupancyStatus === 'PARTIALLY_OCCUPIED') {
    return 'LEASED';
  }

  if (
    assetState === 'BLOCKED'
    || assetState === 'UNDER_MAINTENANCE'
    || assetState === 'MAINTENANCE'
    || assetState === 'PREPARATION'
  ) {
    return 'DEMANDS';
  }

  if (status === 'INACTIVE') {
    return 'INACTIVE';
  }

  return DEFAULT_PROPERTY_STATUS;
}

export function inferPropertyIdleReason(source: PropertyStatusSource): string {
  const idleReason = mapIdleReasonToLegacy(
    normalizeValue(source.idleReason) ?? normalizeValue(source.motivoOciosidade)
  );

  if (idleReason && PROPERTY_IDLE_REASON_OPTIONS.some((option) => option.id === idleReason)) {
    return idleReason;
  }

  return '';
}

export function mapPropertyStatusToPayload(status?: string | null, idleReason?: string | null): PropertyStatusPayload {
  const normalizedStatus = normalizeValue(status) ?? DEFAULT_PROPERTY_STATUS;
  const normalizedIdleReason = normalizeValue(idleReason);

  return {
    status: normalizedStatus,
    idleReason: requiresPropertyIdleReason(normalizedStatus) ? normalizedIdleReason ?? null : null
  };
}

function normalizeValue(value?: string | null): string | null {
  const normalized = value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .toUpperCase();

  return normalized || null;
}

function mapStatusToLegacy(status?: string | null): string | null {
  if (!status) {
    return null;
  }

  return STATUS_PT_BR_TO_LEGACY[status] ?? status;
}

function mapIdleReasonToLegacy(reason?: string | null): string | null {
  if (!reason) {
    return null;
  }

  return IDLE_REASON_PT_BR_TO_LEGACY[reason] ?? reason;
}
