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

  private readonly STORAGE_KEY = 'sidebar-collapsed';
  readonly isCollapsed = signal<boolean>(false);

  readonly isMobileOpen = signal(false);
  readonly user = this.authService.currentUser;
  readonly brandName = this.systemSettings.brandName;
  readonly brandShortName = this.systemSettings.brandShortName;

  constructor() {
    this.isCollapsed.set(this.readStoredState());
  }

  readonly menuGroups = computed<MenuGroup[]>(() => [
    {
      label: 'Painel',
      icon: 'painel',
      items: [{ label: 'Visão geral', route: '/app/dashboard' }]
    },
    {
      label: 'Cadastros',
      icon: 'cadastros',
      items: [
        { label: 'Imóveis', route: '/app/imoveis' },
        { label: 'Locatários', route: '/app/locatarios' },
        { label: 'Pessoas', route: '/app/pessoas' }
      ]
    },
    {
      label: 'Operações',
      icon: 'operacoes',
      items: [
        { label: 'Locações', route: '/app/locacoes' },
        { label: 'Contas', route: '/app/despesas' },
        { label: 'Pendências', route: '/app/pendencias' },
        { label: 'Visitas', route: '/app/visitas' },
        { label: 'Manutenções', route: '/app/manutencoes' }
      ]
    },
    {
      label: 'Relatórios',
      icon: 'relatorios',
      items: [{ label: 'Painéis e exportações', route: '/app/relatorios' }]
    },
    {
      label: 'Configurações',
      icon: 'configuracoes',
      items: [{ label: 'Preferências do sistema', route: '/app/configuracoes' }]
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

  toggleSidebar(): void {
    this.isCollapsed.update(v => !v);
    this.persistState(this.isCollapsed());
  }

  private readStoredState(): boolean {
    try {
      return localStorage.getItem(this.STORAGE_KEY) === 'true';
    } catch {
      return false; // default: expanded
    }
  }

  private persistState(collapsed: boolean): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, String(collapsed));
    } catch {
      // Silently fail - sidebar still works, just won't persist
    }
  }
}
