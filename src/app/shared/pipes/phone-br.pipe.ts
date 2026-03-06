import { Pipe, PipeTransform } from '@angular/core';
import { formatPhoneBr } from '../utils/format.util';

@Pipe({
  name: 'phoneBr',
  standalone: true
})
export class PhoneBrPipe implements PipeTransform {
  transform(value: unknown): string {
    return formatPhoneBr(value);
  }
}
