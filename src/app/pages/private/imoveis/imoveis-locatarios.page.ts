import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-imoveis-locatarios-page',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImoveisLocatariosPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/app/imoveis']);
      return;
    }

    void this.router.navigate(['/app/imoveis', id], { queryParams: { tab: 'locacoes' }, replaceUrl: true });
  }
}
