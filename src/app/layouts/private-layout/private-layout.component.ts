import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';

type MenuIcon =
  | 'dashboard'
  | 'imoveis'
  | 'locatarios'
  | 'pessoas'
  | 'locacoes'
  | 'despesas'
  | 'pendencias'
  | 'visitas'
  | 'manutencoes'
  | 'relatorios'
  | 'configuracoes';

interface MenuItem {
  label: string;
  route: string;
  icon: MenuIcon;
}

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivateLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly systemSettings = inject(SystemSettingsService);
  private readonly router = inject(Router);

  readonly isMobileOpen = signal(false);
  readonly isCollapsed = signal(false);
  readonly user = this.authService.currentUser;
  readonly brandName = this.systemSettings.brandName;
  readonly brandShortName = this.systemSettings.brandShortName;

  readonly menuItems = computed<MenuItem[]>(() => [
    { label: 'Painel', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Imóveis', route: '/app/imoveis', icon: 'imoveis' },
    { label: 'Locatários', route: '/app/locatarios', icon: 'locatarios' },
    { label: 'Pessoas', route: '/app/pessoas', icon: 'pessoas' },
    { label: 'Locações', route: '/app/locacoes', icon: 'locacoes' },
    { label: 'Contas', route: '/app/despesas', icon: 'despesas' },
    { label: 'Pendências', route: '/app/pendencias', icon: 'pendencias' },
    { label: 'Visitas', route: '/app/visitas', icon: 'visitas' },
    { label: 'Manutenções', route: '/app/manutencoes', icon: 'manutencoes' },
    { label: 'Relatórios', route: '/app/relatorios', icon: 'relatorios' },
    { label: 'Configurações', route: '/app/configuracoes', icon: 'configuracoes' }
  ]);

  logout(): void {
    this.authService.logout();
  }

  closeMobileMenu(): void {
    this.isMobileOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileOpen.update((value) => !value);
  }

  toggleCollapse(): void {
    this.isCollapsed.update((value) => !value);
  }

  onBrandClick(): void {
    if (this.isCollapsed()) {
      this.isCollapsed.set(false);
      return;
    }

    void this.router.navigate(['/app/dashboard']);
  }

  onMenuItemClick(event: MouseEvent): void {
    if (this.isCollapsed()) {
      event.preventDefault();
      this.isCollapsed.set(false);
      return;
    }

    this.closeMobileMenu();
  }
}


