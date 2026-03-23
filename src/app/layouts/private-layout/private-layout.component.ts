import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';

type MenuIcon = 'painel' | 'cadastros' | 'operacoes' | 'relatorios' | 'configuracoes';

interface MenuItem {
  label: string;
  route: string;
}

interface MenuGroup {
  label: string;
  icon: MenuIcon;
  items: MenuItem[];
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
  readonly user = this.authService.currentUser;
  readonly brandName = this.systemSettings.brandName;
  readonly brandShortName = this.systemSettings.brandShortName;

  readonly menuGroups = computed<MenuGroup[]>(() => [
    {
      label: 'Painel',
      icon: 'painel',
      items: [{ label: 'Visao geral', route: '/app/dashboard' }]
    },
    {
      label: 'Cadastros',
      icon: 'cadastros',
      items: [
        { label: 'Imoveis', route: '/app/imoveis' },
        { label: 'Locatarios', route: '/app/locatarios' },
        { label: 'Pessoas', route: '/app/pessoas' }
      ]
    },
    {
      label: 'Operacoes',
      icon: 'operacoes',
      items: [
        { label: 'Locacoes', route: '/app/locacoes' },
        { label: 'Contas', route: '/app/despesas' },
        { label: 'Pendencias', route: '/app/pendencias' },
        { label: 'Visitas', route: '/app/visitas' },
        { label: 'Manutencoes', route: '/app/manutencoes' }
      ]
    },
    {
      label: 'Relatorios',
      icon: 'relatorios',
      items: [{ label: 'Paineis e exportacoes', route: '/app/relatorios' }]
    },
    {
      label: 'Configuracoes',
      icon: 'configuracoes',
      items: [{ label: 'Preferencias do sistema', route: '/app/configuracoes' }]
    }
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

  onBrandClick(): void {
    void this.router.navigate(['/app/dashboard']);
  }

  onMenuItemClick(): void {
    this.closeMobileMenu();
  }
}
