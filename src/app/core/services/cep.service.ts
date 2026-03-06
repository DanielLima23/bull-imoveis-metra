import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export interface CepAddress {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
  complement?: string;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly http = inject(HttpClient);

  lookup(cep: string): Observable<CepAddress> {
    const digits = cep.replace(/\D/g, '');
    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`).pipe(
      map((response) => {
        if (response.erro) {
          throw new Error('CEP não encontrado.');
        }

        return {
          zipCode: response.cep ?? '',
          street: response.logradouro ?? '',
          district: response.bairro ?? '',
          city: response.localidade ?? '',
          state: response.uf ?? '',
          complement: response.complemento ?? ''
        };
      })
    );
  }
}

