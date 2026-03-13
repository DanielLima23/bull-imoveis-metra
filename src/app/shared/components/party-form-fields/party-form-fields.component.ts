import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AsyncSearchSelectComponent } from '../async-search-select/async-search-select.component';
import { CpfCnpjInputDirective } from '../../directives/cpf-cnpj-input.directive';
import { PhoneBrInputDirective } from '../../directives/phone-br-input.directive';
import { SelectOption } from '../../models/select-option.model';
import { isLawyerPartyKind, PartyFormGroup } from '../../forms/party-form';
import { getDomainOptions } from '../../utils/domain-label.util';

@Component({
  selector: 'app-party-form-fields',
  standalone: true,
  imports: [ReactiveFormsModule, AsyncSearchSelectComponent, CpfCnpjInputDirective, PhoneBrInputDirective],
  templateUrl: './party-form-fields.component.html',
  styleUrl: './party-form-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartyFormFieldsComponent {
  readonly form = input.required<PartyFormGroup>();
  readonly showActiveToggle = input(false);
  readonly compact = input(false);
  readonly kindOptions: SelectOption[] = getDomainOptions('partyKind');

  shouldShowOab(): boolean {
    return isLawyerPartyKind(this.form().controls.kind.value);
  }
}
