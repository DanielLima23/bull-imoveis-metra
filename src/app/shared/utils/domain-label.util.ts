import { SelectOption } from '../models/select-option.model';

export type DomainLabelKey =
  | 'propertyStatus'
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
    AVAILABLE: 'Disponível',
    LEASED: 'Alugado',
    UNAVAILABLE: 'Indisponível',
    INACTIVE: 'Inativo'
  },
  occupancyStatus: {
    VACANT: 'Desocupado',
    OCCUPIED: 'Ocupado',
    RESERVED: 'Reservado',
    PARTIALLY_OCCUPIED: 'Parcialmente ocupado'
  },
  assetState: {
    READY: 'Pronto para locação',
    PREPARATION: 'Em preparação',
    UNDER_MAINTENANCE: 'Em manutenção',
    MAINTENANCE: 'Em manutenção',
    BLOCKED: 'Bloqueado'
  },
  propertyType: {
    CASA: 'Casa',
    APARTAMENTO: 'Apartamento',
    COMERCIAL: 'Comercial',
    TERRENO: 'Terreno',
    GALPAO: 'Galpão',
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
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica'
  },
  visitStatus: {
    SCHEDULED: 'Agendada',
    DONE: 'Realizada',
    CANCELED: 'Cancelada',
    NO_SHOW: 'Não compareceu'
  },
  maintenanceStatus: {
    OPEN: 'Aberta',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Concluída',
    CANCELED: 'Cancelada'
  },
  maintenancePriority: {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente'
  },
  partyKind: {
    OWNER: 'Proprietário',
    ADMINISTRATOR: 'Administrador',
    GUARANTOR: 'Fiador',
    TENANT: 'Locatário',
    BROKER: 'Corretor',
    LAWYER: 'Advogado',
    LEGAL_REPRESENTATIVE: 'Representante legal',
    WITNESS: 'Testemunha',
    OTHER: 'Outro'
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
