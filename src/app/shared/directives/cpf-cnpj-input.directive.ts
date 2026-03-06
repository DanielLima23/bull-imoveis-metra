import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatCpfCnpj, normalizeDocument } from '../utils/format.util';

@Directive({
  selector: 'input[appCpfCnpjInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CpfCnpjInputDirective),
      multi: true
    }
  ]
})
export class CpfCnpjInputDirective implements ControlValueAccessor {
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLInputElement>) {}

  writeValue(value: unknown): void {
    this.elementRef.nativeElement.value = formatCpfCnpj(value);
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
    const normalized = normalizeDocument(rawValue);
    this.elementRef.nativeElement.value = formatCpfCnpj(normalized);
    this.onChange(normalized);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }
}
