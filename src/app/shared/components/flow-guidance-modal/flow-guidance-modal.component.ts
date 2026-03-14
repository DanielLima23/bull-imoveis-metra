import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-flow-guidance-modal',
  standalone: true,
  templateUrl: './flow-guidance-modal.component.html',
  styleUrl: './flow-guidance-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowGuidanceModalComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly primaryActionLabel = input('Continuar');
  readonly secondaryActionLabel = input('Cancelar');

  readonly primaryAction = output<void>();
  readonly closed = output<void>();
}
