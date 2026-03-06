import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatPhoneBr, normalizePhone } from '../utils/format.util';

@Directive({
  selector: 'input[appPhoneBrInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneBrInputDirective),
      multi: true
    }
  ]
})
export class PhoneBrInputDirective implements ControlValueAccessor {
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLInputElement>) {}

  writeValue(value: unknown): void {
    this.elementRef.nativeElement.value = formatPhoneBr(value);
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
    const normalized = normalizePhone(rawValue);
    this.elementRef.nativeElement.value = formatPhoneBr(normalized);
    this.onChange(normalized);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }
}
