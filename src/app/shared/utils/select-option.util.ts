import { PartyDto, PropertyDto, TenantDto } from '../../core/models/domain.model';
import { SelectOption } from '../models/select-option.model';
import { getDomainLabel } from './domain-label.util';
import { formatCpfCnpj } from './format.util';

export function toPropertySelectOption(item: PropertyDto): SelectOption {
  const stateSuffix = item.state ? `/${item.state}` : '';
  const subtitle = item.city ? `${item.city}${stateSuffix}` : undefined;

  return {
    id: item.id,
    label: item.title,
    subtitle
  };
}

export function toTenantSelectOption(item: TenantDto): SelectOption {
  const doc = formatCpfCnpj(item.documentNumber);

  return {
    id: item.id,
    label: item.name,
    subtitle: doc || undefined
  };
}

export function toPartySelectOption(item: PartyDto): SelectOption {
  const doc = formatCpfCnpj(item.documentNumber);
  const kindLabel = getDomainLabel('partyKind', item.kind, '');
  const oab = item.oab?.trim() ? `OAB ${item.oab.trim()}` : '';
  const subtitle = [kindLabel, doc, oab].filter((value) => !!value).join(' · ');

  return {
    id: item.id,
    label: item.name ?? 'Pessoa sem nome',
    subtitle: subtitle || undefined
  };
}
