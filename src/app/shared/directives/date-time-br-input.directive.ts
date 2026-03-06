import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appDateTimeBrInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimeBrInputDirective),
      multi: true
    }
  ]
})
export class DateTimeBrInputDirective implements ControlValueAccessor {
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLInputElement>) {}

  writeValue(value: unknown): void {
    this.elementRef.nativeElement.value = this.toDisplay(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.elementRef.nativeElement.disabled = isDisabled;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const rawValue = (event.target as HTMLInputElement | null)?.value ?? '';
    const digits = rawValue.replace(/\D/g, '').slice(0, 12);
    const formatted = this.formatDigits(digits);
    this.elementRef.nativeElement.value = formatted;

    const iso = this.toIsoDateTime(digits);
    this.onChange(iso ?? '');
  }

  @HostListener('blur')
  onBlur(): void {
    const rawValue = this.elementRef.nativeElement.value;
    const digits = rawValue.replace(/\D/g, '').slice(0, 12);
    const iso = this.toIsoDateTime(digits);

    this.elementRef.nativeElement.value = iso ? this.toDisplay(iso) : this.formatDigits(digits);
    this.onTouched();
  }

  private toDisplay(value: unknown): string {
    const source = String(value ?? '').trim();
    if (!source) {
      return '';
    }

    const isoMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]} ${isoMatch[4]}:${isoMatch[5]}`;
    }

    return this.formatDigits(source.replace(/\D/g, '').slice(0, 12));
  }

  private formatDigits(digits: string): string {
    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    if (digits.length <= 8) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    if (digits.length <= 10) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
  }

  private toIsoDateTime(digits: string): string | null {
    if (digits.length !== 12) {
      return null;
    }

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    const hour = Number(digits.slice(8, 10));
    const minute = Number(digits.slice(10, 12));

    if (!this.isValidDateTime(day, month, year, hour, minute)) {
      return null;
    }

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const min = String(minute).padStart(2, '0');

    return `${year}-${mm}-${dd}T${hh}:${min}`;
  }

  private isValidDateTime(day: number, month: number, year: number, hour: number, minute: number): boolean {
    if (!this.isValidDate(day, month, year)) {
      return false;
    }

    return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  private isValidDate(day: number, month: number, year: number): boolean {
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
      return false;
    }

    if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1) {
      return false;
    }

    const test = new Date(year, month - 1, day);
    return test.getFullYear() === year && test.getMonth() === month - 1 && test.getDate() === day;
  }
}
