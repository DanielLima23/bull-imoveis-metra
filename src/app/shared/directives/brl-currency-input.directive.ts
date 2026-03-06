import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { coerceCurrency, formatCurrencyBr } from '../utils/format.util';

@Directive({
  selector: 'input[appBrlCurrencyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BrlCurrencyInputDirective),
      multi: true
    }
  ]
})
export class BrlCurrencyInputDirective implements ControlValueAccessor {
  private onChange: (value: number) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLInputElement>) {}

  writeValue(value: unknown): void {
    this.elementRef.nativeElement.value = formatCurrencyBr(value);
  }

  registerOnChange(fn: (value: number) => void): void {
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
    const value = coerceCurrency(rawValue) ?? 0;
    this.elementRef.nativeElement.value = value === 0 && rawValue.trim() === '' ? '' : formatCurrencyBr(value);
    this.onChange(value);
  }

  @HostListener('blur')
  onBlur(): void {
    const value = coerceCurrency(this.elementRef.nativeElement.value);
    this.elementRef.nativeElement.value = value === null ? '' : formatCurrencyBr(value);
    this.onTouched();
  }
}
