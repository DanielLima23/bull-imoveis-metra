import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SystemSettingsService } from '../../core/services/system-settings.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicLayoutComponent {
  private readonly systemSettings = inject(SystemSettingsService);

  readonly brandName = this.systemSettings.brandName;
}
