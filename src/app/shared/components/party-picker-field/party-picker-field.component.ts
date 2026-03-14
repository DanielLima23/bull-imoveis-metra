import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { catchError, map, of, Subscription } from 'rxjs';
import { PartyDto, PagedResult } from '../../../core/models/domain.model';
import { PartyApiService } from '../../../core/services/party-api.service';
import { SelectOption } from '../../models/select-option.model';
import { getDomainLabel, resolveDomainCode } from '../../utils/domain-label.util';
import { formatCpfCnpj, formatPhoneBr } from '../../utils/format.util';
import { toPartySelectOption } from '../../utils/select-option.util';
import {
  AsyncSearchSelectComponent,
  AsyncSelectFetchById,
  AsyncSelectFetchPage
} from '../async-search-select/async-search-select.component';
import { PartyQuickCreateModalComponent } from '../party-quick-create-modal/party-quick-create-modal.component';

@Component({
  selector: 'app-party-picker-field',
  standalone: true,
  imports: [AsyncSearchSelectComponent, PartyQuickCreateModalComponent],
  templateUrl: './party-picker-field.component.html',
  styleUrl: './party-picker-field.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PartyPickerFieldComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartyPickerFieldComponent implements ControlValueAccessor, OnDestroy {
  private readonly api = inject(PartyApiService);
  private readonly partyCache = new Map<string, PartyDto>();
  private resolveSelectedSub: Subscription | null = null;

  @ViewChild(AsyncSearchSelectComponent)
  private asyncSearchSelect?: AsyncSearchSelectComponent;

  readonly allowedKinds = input<string[] | null>(null);
  readonly defaultKind = input<string | null>(null);
  readonly placeholder = input('Selecione uma pessoa');
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly allowClear = input(true);
  readonly useFloatingPanel = input(true);
  readonly showCreateButton = input(true);

  readonly partyChange = output<PartyDto | null>();

  readonly selectedPartyId = signal('');
  readonly selectedParty = signal<PartyDto | null>(null);
  readonly isCreateModalOpen = signal(false);
  readonly controlDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());
  readonly selectedKindLabel = computed(() => getDomainLabel('partyKind', this.selectedParty()?.kind, ''));
  readonly selectedDocument = computed(() => formatCpfCnpj(this.selectedParty()?.documentNumber));
  readonly selectedOab = computed(() => this.selectedParty()?.oab?.trim() ?? '');
  readonly selectedContact = computed(() => {
    const party = this.selectedParty();
    if (!party) {
      return '';
    }

    return party.phone ? formatPhoneBr(party.phone) : party.email || '';
  });

  readonly fetchPage: AsyncSelectFetchPage = (query) => {
    const kindFilter = this.resolveApiKindFilter();
    return this.api
      .list(
        {
          search: query.search,
          kind: kindFilter,
          active: true,
          page: query.page,
          pageSize: query.pageSize
        },
        { silent: true }
      )
      .pipe(map((result) => this.mapOptionsResult(result)));
  };

  readonly fetchById: AsyncSelectFetchById = (id) =>
    this.api.getById(id, { silent: true }).pipe(
      map((item) => {
        this.partyCache.set(item.id, item);
        return toPartySelectOption(item);
      }),
      catchError(() => of(null))
    );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnDestroy(): void {
    this.resolveSelectedSub?.unsubscribe();
  }

  writeValue(value: string | null): void {
    const nextValue = String(value ?? '').trim();
    this.selectedPartyId.set(nextValue);

    if (!nextValue) {
      this.selectedParty.set(null);
      return;
    }

    const cached = this.partyCache.get(nextValue) ?? null;
    if (cached) {
      this.selectedParty.set(cached);
      return;
    }

    this.resolveParty(nextValue, false);
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

  openSelector(): void {
    if (this.isDisabled()) {
      return;
    }

    this.asyncSearchSelect?.openPanel();
  }

  openCreateModal(): void {
    if (this.isDisabled()) {
      return;
    }

    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  handleCreated(party: PartyDto): void {
    this.partyCache.set(party.id, party);
    this.isCreateModalOpen.set(false);
    this.applySelectedParty(party, true);
  }

  clearSelection(): void {
    if (!this.allowClear() || this.isDisabled()) {
      return;
    }

    this.selectedPartyId.set('');
    this.selectedParty.set(null);
    this.onChange('');
    this.partyChange.emit(null);
    this.onTouched();
  }

  onValueChange(value: string): void {
    const partyId = value.trim();
    if (!partyId) {
      this.clearSelection();
      return;
    }

    const cached = this.partyCache.get(partyId) ?? null;
    if (cached) {
      this.applySelectedParty(cached, true);
      return;
    }

    this.selectedPartyId.set(partyId);
    this.resolveParty(partyId, true);
  }

  private resolveParty(partyId: string, emitChange: boolean): void {
    this.resolveSelectedSub?.unsubscribe();
    this.resolveSelectedSub = this.api.getById(partyId, { silent: true }).subscribe({
      next: (party) => {
        this.partyCache.set(party.id, party);
        this.applySelectedParty(party, emitChange);
      },
      error: () => {
        if (emitChange) {
          this.selectedPartyId.set('');
          this.selectedParty.set(null);
          this.onChange('');
          this.partyChange.emit(null);
        }
      }
    });
  }

  private applySelectedParty(party: PartyDto, emitChange: boolean): void {
    this.selectedPartyId.set(party.id);
    this.selectedParty.set(party);

    if (!emitChange) {
      return;
    }

    this.onChange(party.id);
    this.partyChange.emit(party);
    this.onTouched();
  }

  private mapOptionsResult(result: PagedResult<PartyDto>): PagedResult<SelectOption> {
    return {
      ...result,
      items: result.items.map((item) => {
        this.partyCache.set(item.id, item);
        return toPartySelectOption(item);
      })
    };
  }

  private resolveApiKindFilter(): string | string[] | undefined {
    const kinds = (this.allowedKinds() ?? [])
      .map((kind) => resolveDomainCode('partyKind', kind))
      .filter((kind): kind is string => !!kind);

    if (kinds.length === 0) {
      return undefined;
    }
    
    // Se há apenas um tipo, retorna como string
    if (kinds.length === 1) {
      return kinds[0];
    }
    
    // Se há múltiplos tipos, retorna como array
    return kinds;
  }
}
