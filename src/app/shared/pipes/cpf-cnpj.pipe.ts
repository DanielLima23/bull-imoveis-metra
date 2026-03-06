import { Pipe, PipeTransform } from '@angular/core';
import { formatCpfCnpj } from '../utils/format.util';

@Pipe({
  name: 'cpfCnpj',
  standalone: true
})
export class CpfCnpjPipe implements PipeTransform {
  transform(value: unknown): string {
    return formatCpfCnpj(value);
  }
}
