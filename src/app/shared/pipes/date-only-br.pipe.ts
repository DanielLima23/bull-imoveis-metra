import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateOnlyBr',
  standalone: true
})
export class DateOnlyBrPipe implements PipeTransform {
  transform(value: unknown, empty = '-'): string {
    const source = String(value ?? '').trim();
    if (!source) {
      return empty;
    }

    const isoMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }

    const brMatch = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return source;
    }

    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) {
      return empty;
    }

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
