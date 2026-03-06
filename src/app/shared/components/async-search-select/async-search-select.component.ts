import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedResult } from '../../../core/models/domain.model';
import { SelectOption } from '../../models/select-option.model';

export interface AsyncSelectQuery {
  search: string;
  page: number;
  pageSize: number;
}

export type AsyncSelectFetchPage = (query: AsyncSelectQuery) => Observable<PagedResult<SelectOption>>;
export type AsyncSelectFetchById = (id: string) => Observable<SelectOption | null>;

@Component({
  selector: 'app-async-search-select',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './async-search-select.component.html',
  styleUrl: './async-search-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AsyncSearchSelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsyncSearchSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  readonly fetchPage = input<AsyncSelectFetchPage | null>(null);
  readonly fetchById = input<AsyncSelectFetchById | null>(null);
  readonly staticOptions = input<SelectOption[] | null>(null);
  readonly value = input<string | null | undefined>(undefined);

  readonly placeholder = input('Selecione');
  readonly searchPlaceholder = input('Buscar...');
  readonly noResultsText = input('Nenhum registro encontrado.');
  readonly loadingText = input('Carregando mais...');
  readonly clearLabel = input('Limpar seleção');
  readonly pageSize = input(15);
  readonly minSearchLength = input(2);
  readonly searchable = input(true);
  readonly compact = input(false);
  readonly useFloatingPanel = input(false);
  readonly floatingZIndex = input(150);
  readonly allowClear = input(true);
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly isOpen = signal(false);
  readonly isLoadingInitial = signal(false);
  readonly isLoadingMore = signal(false);
  readonly options = signal<SelectOption[]>([]);
  readonly selectedOption = signal<SelectOption | null>(null);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly initialError = signal('');
  readonly loadMoreError = signal('');
  readonly searchTerm = signal('');
  readonly selectedValue = signal('');
  readonly controlDisabled = signal(false);
  readonly panelPosition = signal({ top: 0, left: 0, width: 0 });

  readonly usesStaticOptions = computed(() => this.staticOptions() !== null);
  readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());
  readonly hasMore = computed(() => !this.usesStaticOptions() && this.currentPage() < this.totalPages());
  readonly showSearchHint = computed(() => {
    if (!this.searchable() || this.usesStaticOptions()) {
      return false;
    }

    const search = this.searchTerm().trim();
    return search.length > 0 && search.length < this.minSearchLength();
  });

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly subscriptions = new Subscription();
  private pageRequestSub: Subscription | null = null;
  private loadMoreRequestSub: Subscription | null = null;
  private resolveValueSub: Subscription | null = null;
  private requestVersion = 0;
  private floatingListenersBound = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  private readonly syncExternalValueEffect = effect(() => {
    const externalValue = this.value();
    if (externalValue === undefined) {
      return;
    }

    this.writeValue(externalValue);
  });

  private readonly syncStaticOptionsEffect = effect(() => {
    const staticOptions = this.staticOptions();
    if (staticOptions === null) {
      return;
    }

    this.options.set([...staticOptions]);
    this.currentPage.set(staticOptions.length > 0 ? 1 : 0);
    this.totalPages.set(1);
    this.selectedOption.set(staticOptions.find((item) => item.id === this.selectedValue()) ?? null);

    if (this.isOpen()) {
      this.applyStaticOptions();
    }
  });

  private readonly syncFloatingPanelEffect = effect(() => {
    if (!this.isOpen() || !this.useFloatingPanel()) {
      return;
    }

    this.options();
    this.isLoadingInitial();
    this.isLoadingMore();
    this.initialError();
    this.loadMoreError();

    setTimeout(() => this.updateFloatingPanelPosition(), 0);
  });

  ngOnInit(): void {
    const searchSub = this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.searchTerm.set(term);
      if (!this.isOpen()) {
        return;
      }

      if (this.usesStaticOptions()) {
        this.applyStaticOptions();
        return;
      }

      this.loadFirstPage();
    });

    this.subscriptions.add(searchSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.pageRequestSub?.unsubscribe();
    this.loadMoreRequestSub?.unsubscribe();
    this.resolveValueSub?.unsubscribe();
    this.unbindFloatingListeners();
  }

  writeValue(value: string | null): void {
    const nextValue = String(value ?? '').trim();
    this.selectedValue.set(nextValue);

    if (!nextValue) {
      this.selectedOption.set(null);
      return;
    }

    if (this.usesStaticOptions()) {
      const selected = (this.staticOptions() ?? []).find((item) => item.id === nextValue) ?? null;
      this.selectedOption.set(selected);
      return;
    }

    const existing = this.options().find((item) => item.id === nextValue);
    if (existing) {
      this.selectedOption.set(existing);
      return;
    }

    this.resolveSelectedOption(nextValue);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled.set(isDisabled);
  }

  togglePanel(): void {
    if (this.isDisabled()) {
      return;
    }

    if (this.isOpen()) {
      this.closePanel();
      return;
    }

    this.openPanel();
  }

  openPanel(): void {
    if (this.isDisabled()) {
      return;
    }

    this.isOpen.set(true);
    this.searchControl.setValue(this.searchTerm(), { emitEvent: false });

    if (this.usesStaticOptions()) {
      this.applyStaticOptions();
    } else if (this.options().length === 0) {
      this.loadFirstPage();
    }

    if (this.useFloatingPanel()) {
      this.bindFloatingListeners();
      setTimeout(() => this.updateFloatingPanelPosition(), 0);
    }

    if (this.searchable()) {
      setTimeout(() => {
        const input = this.elementRef.nativeElement.querySelector('.async-select__search-input') as HTMLInputElement | null;
        input?.focus();
      }, 0);
    }
  }

  closePanel(): void {
    if (!this.isOpen()) {
      return;
    }

    this.isOpen.set(false);
    this.unbindFloatingListeners();
    this.onTouched();
  }

  selectOption(option: SelectOption): void {
    this.selectedOption.set(option);
    this.selectedValue.set(option.id);
    this.emitValue(option.id);
    this.closePanel();
  }

  clearSelection(): void {
    this.selectedOption.set(null);
    this.selectedValue.set('');
    this.emitValue('');
    this.closePanel();
  }

  retryInitialLoad(): void {
    this.loadFirstPage();
  }

  retryLoadMore(): void {
    this.loadMoreError.set('');
    this.loadMore();
  }

  onListScroll(event: Event): void {
    if (this.usesStaticOptions()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 28;
    if (!nearBottom) {
      return;
    }

    this.loadMore();
  }

  trackByOption(_: number, item: SelectOption): string {
    return item.id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) {
      return;
    }

    this.closePanel();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  }

  private loadFirstPage(): void {
    if (this.usesStaticOptions()) {
      this.applyStaticOptions();
      return;
    }

    const fetchPage = this.fetchPage();
    if (!fetchPage) {
      this.options.set([]);
      this.currentPage.set(0);
      this.totalPages.set(0);
      this.initialError.set('Fonte de dados do select não configurada.');
      this.loadMoreError.set('');
      this.isLoadingInitial.set(false);
      return;
    }

    const query = this.buildQuery(1);
    if (!query) {
      this.options.set([]);
      this.currentPage.set(0);
      this.totalPages.set(0);
      this.initialError.set('');
      this.loadMoreError.set('');
      return;
    }

    this.requestVersion += 1;
    const requestVersion = this.requestVersion;

    this.pageRequestSub?.unsubscribe();
    this.loadMoreRequestSub?.unsubscribe();
    this.initialError.set('');
    this.loadMoreError.set('');
    this.isLoadingInitial.set(true);

    this.pageRequestSub = fetchPage(query).subscribe({
      next: (result) => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        const nextOptions = this.mergeOptions([], result.items);
        const selected = this.selectedOption();
        if (selected && !nextOptions.some((item) => item.id === selected.id)) {
          nextOptions.unshift(selected);
        }

        this.options.set(nextOptions);
        this.currentPage.set(result.page);
        this.totalPages.set(result.totalPages);
        this.isLoadingInitial.set(false);
      },
      error: () => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.options.set([]);
        this.currentPage.set(0);
        this.totalPages.set(0);
        this.initialError.set('Falha ao carregar opções. Tente novamente.');
        this.isLoadingInitial.set(false);
      }
    });
  }

  private loadMore(): void {
    if (this.usesStaticOptions()) {
      return;
    }

    if (!this.isOpen() || this.isLoadingInitial() || this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    const fetchPage = this.fetchPage();
    if (!fetchPage) {
      return;
    }

    const query = this.buildQuery(this.currentPage() + 1);
    if (!query) {
      return;
    }

    const requestVersion = this.requestVersion;
    this.loadMoreRequestSub?.unsubscribe();
    this.loadMoreError.set('');
    this.isLoadingMore.set(true);

    this.loadMoreRequestSub = fetchPage(query).subscribe({
      next: (result) => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        const merged = this.mergeOptions(this.options(), result.items);
        this.options.set(merged);
        this.currentPage.set(result.page);
        this.totalPages.set(result.totalPages);
        this.isLoadingMore.set(false);
      },
      error: () => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.loadMoreError.set('Falha ao carregar mais itens.');
        this.isLoadingMore.set(false);
      }
    });
  }

  private buildQuery(page: number): AsyncSelectQuery | null {
    const search = this.searchable() ? this.searchTerm().trim() : '';
    if (search && search.length < this.minSearchLength()) {
      return null;
    }

    return {
      search,
      page,
      pageSize: this.pageSize()
    };
  }

  private resolveSelectedOption(id: string): void {
    if (this.usesStaticOptions()) {
      const selected = (this.staticOptions() ?? []).find((item) => item.id === id) ?? null;
      this.selectedOption.set(selected);
      return;
    }

    const fetchById = this.fetchById();
    if (!fetchById) {
      return;
    }

    this.resolveValueSub?.unsubscribe();
    this.resolveValueSub = fetchById(id).subscribe({
      next: (option) => {
        if (!option || this.selectedValue() !== id) {
          return;
        }

        this.selectedOption.set(option);
        this.options.set(this.mergeOptions(this.options(), [option]));
      },
      error: () => undefined
    });
  }

  private mergeOptions(current: SelectOption[], incoming: SelectOption[]): SelectOption[] {
    const map = new Map<string, SelectOption>();
    for (const item of current) {
      map.set(item.id, item);
    }

    for (const item of incoming) {
      map.set(item.id, item);
    }

    return Array.from(map.values());
  }

  private applyStaticOptions(): void {
    const source = this.staticOptions() ?? [];
    const term = this.searchable() ? this.searchTerm().trim().toLowerCase() : '';

    const filtered =
      term.length === 0
        ? source
        : source.filter((item) => `${item.label} ${item.subtitle ?? ''}`.toLowerCase().includes(term));

    this.options.set([...filtered]);
    this.currentPage.set(filtered.length > 0 ? 1 : 0);
    this.totalPages.set(1);
    this.isLoadingInitial.set(false);
    this.isLoadingMore.set(false);
    this.initialError.set('');
    this.loadMoreError.set('');

    const selected = source.find((item) => item.id === this.selectedValue()) ?? null;
    this.selectedOption.set(selected);
  }

  private emitValue(value: string): void {
    this.onChange(value);
    this.valueChange.emit(value);
  }

  private bindFloatingListeners(): void {
    if (this.floatingListenersBound) {
      return;
    }

    this.floatingListenersBound = true;
    window.addEventListener('resize', this.handleViewportChange);
    document.addEventListener('scroll', this.handleViewportChange, true);
  }

  private unbindFloatingListeners(): void {
    if (!this.floatingListenersBound) {
      return;
    }

    this.floatingListenersBound = false;
    window.removeEventListener('resize', this.handleViewportChange);
    document.removeEventListener('scroll', this.handleViewportChange, true);
  }

  private readonly handleViewportChange = (): void => {
    if (!this.isOpen() || !this.useFloatingPanel()) {
      return;
    }

    this.updateFloatingPanelPosition();
  };

  private updateFloatingPanelPosition(): void {
    if (!this.isOpen() || !this.useFloatingPanel()) {
      return;
    }

    const trigger = this.elementRef.nativeElement.querySelector('.async-select__trigger') as HTMLElement | null;
    const panel = this.elementRef.nativeElement.querySelector('.async-select__panel') as HTMLElement | null;
    if (!trigger || !panel) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const preferredWidth = Math.max(rect.width, 120);
    const maxWidth = Math.max(120, window.innerWidth - viewportPadding * 2);
    const width = Math.min(preferredWidth, maxWidth);

    let left = rect.left;
    if (left + width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - width - viewportPadding;
    }
    left = Math.max(viewportPadding, left);

    const panelHeight = panel.offsetHeight || (this.searchable() ? 280 : 220);
    let top = rect.bottom + 8;
    if (top + panelHeight > window.innerHeight - viewportPadding) {
      top = rect.top - panelHeight - 8;
    }
    top = Math.max(viewportPadding, top);

    this.panelPosition.set({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width)
    });
  }
}
