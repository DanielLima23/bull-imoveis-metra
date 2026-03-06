import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrencyBr } from '../utils/format.util';

@Pipe({
  name: 'brlCurrency',
  standalone: true
})
export class BrlCurrencyPipe implements PipeTransform {
  transform(value: unknown, empty = '-'): string {
    const formatted = formatCurrencyBr(value, true);
    return formatted || empty;
  }
}
