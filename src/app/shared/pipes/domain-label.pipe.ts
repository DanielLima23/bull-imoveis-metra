import { Pipe, PipeTransform } from '@angular/core';
import { DomainLabelKey, getDomainLabel } from '../utils/domain-label.util';

@Pipe({
  name: 'domainLabel',
  standalone: true
})
export class DomainLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, domain: DomainLabelKey, emptyLabel = '-'): string {
    return getDomainLabel(domain, value, emptyLabel);
  }
}
