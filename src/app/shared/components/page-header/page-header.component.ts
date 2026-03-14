import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

export interface HeaderBreadcrumb {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly breadcrumbs = input<HeaderBreadcrumb[]>([]);
  readonly actionLabel = input<string>('');
  readonly actionRoute = input<string>('');
  readonly actionQueryParams = input<Params | null>(null);
  readonly actionClass = input<string>('');
}
