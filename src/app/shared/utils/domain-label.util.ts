import { SelectOption } from '../models/select-option.model';

export type DomainLabelKey =
  | 'propertyStatus'
  | 'propertyIdleReason'
  | 'occupancyStatus'
  | 'assetState'
  | 'propertyType'
  | 'leaseStatus'
  | 'expenseStatus'
  | 'expenseFrequency'
  | 'pendencyStatus'
  | 'pendencySeverity'
  | 'visitStatus'
  | 'maintenanceStatus'
  | 'maintenancePriority'
  | 'partyKind';

type DomainLabelMap = Record<DomainLabelKey, Record<string, string>>;

const DOMAIN_LABELS: DomainLabelMap = {
  propertyStatus: {
    AVAILABLE: 'Dispon\u00edvel',
    LEASED: 'Alugado',
    INACTIVE: 'Inativo',
    FOR_SALE: '\u00c0 venda',
    DEMANDS: 'Demandas',
    IDLE: 'Ocioso',
    UNAVAILABLE: 'Demandas'
  },
  propertyIdleReason: {
    RENOVATION: 'Reforma',
    TERMINATION: 'Rescis\u00e3o',
    LEGAL_PENDING: 'Pend\u00eancia jur\u00eddica'
  },
  occupancyStatus: {
    VACANT: 'Desocupado',
    OCCUPIED: 'Ocupado',
    RESERVED: 'Reservado',
    PARTIALLY_OCCUPIED: 'Parcialmente ocupado'
  },
  assetState: {
    READY: 'Pronto para loca\u00e7\u00e3o',
    PREPARATION: 'Em prepara\u00e7\u00e3o',
    UNDER_MAINTENANCE: 'Em manuten\u00e7\u00e3o',
    MAINTENANCE: 'Em manuten\u00e7\u00e3o',
    BLOCKED: 'Bloqueado'
  },
  propertyType: {
    CASA: 'Casa',
    APARTAMENTO: 'Apartamento',
    COMERCIAL: 'Comercial',
    TERRENO: 'Terreno',
    GALPAO: 'Galp\u00e3o',
    SALA: 'Sala',
    SOBRADO: 'Sobrado'
  },
  leaseStatus: {
    DRAFT: 'Rascunho',
    ACTIVE: 'Ativa',
    ENDED: 'Encerrada',
    CLOSED: 'Encerrada',
    CANCELED: 'Cancelada'
  },
  expenseStatus: {
    PENDING: 'Pendente',
    PAID: 'Paga',
    OVERDUE: 'Atrasada',
    CANCELED: 'Cancelada'
  },
  expenseFrequency: {
    ONE_TIME: 'Eventual',
    MONTHLY: 'Mensal',
    YEARLY: 'Anual'
  },
  pendencyStatus: {
    OPEN: 'Aberta',
    RESOLVED: 'Resolvida',
    OVERDUE: 'Atrasada'
  },
  pendencySeverity: {
    LOW: 'Baixa',
    MEDIUM: 'M\u00e9dia',
    HIGH: 'Alta',
    CRITICAL: 'Cr\u00edtica'
  },
  visitStatus: {
    SCHEDULED: 'Agendada',
    DONE: 'Realizada',
    CANCELED: 'Cancelada',
    NO_SHOW: 'N\u00e3o compareceu'
  },
  maintenanceStatus: {
    OPEN: 'Aberta',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Conclu\u00edda',
    CANCELED: 'Cancelada'
  },
  maintenancePriority: {
    LOW: 'Baixa',
    MEDIUM: 'M\u00e9dia',
    HIGH: 'Alta',
    URGENT: 'Urgente'
  },
  partyKind: {
    PERSON: 'Pessoa f\u00edsica',
    COMPANY: 'Pessoa jur\u00eddica'
  }
};

export interface DomainOptionsConfig {
  includeEmptyOption?: boolean;
  emptyLabel?: string;
}

export function getDomainLabel(domain: DomainLabelKey, value?: string | null, emptyLabel = '-'): string {
  if (!value) {
    return emptyLabel;
  }

  const normalized = normalizeDomainValue(value);
  return DOMAIN_LABELS[domain][normalized] ?? humanizeDomainValue(value);
}

export function getDomainOptions(domain: DomainLabelKey, config: DomainOptionsConfig = {}): SelectOption[] {
  const options = Object.entries(DOMAIN_LABELS[domain]).map(([id, label]) => ({ id, label }));

  if (!config.includeEmptyOption) {
    return options;
  }

  return [{ id: '', label: config.emptyLabel ?? 'Todos' }, ...options];
}

function normalizeDomainValue(value: string): string {
  return value.trim().replace(/\s+/g, '_').replace(/-/g, '_').toUpperCase();
}

function humanizeDomainValue(value: string): string {
  const normalized = value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
