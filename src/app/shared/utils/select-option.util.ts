import { PropertyDto, TenantDto } from '../../core/models/domain.model';
import { SelectOption } from '../models/select-option.model';
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
