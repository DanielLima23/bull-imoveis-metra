import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { createPartyForm, mapPartyFormToPayload, mapPartyFormToUpdatePayload, patchPartyForm } from './party-form';

describe('party-form helpers', () => {
  const fb = new FormBuilder();

  it('preenche o formulario com os dados da pessoa', () => {
    const form = createPartyForm(fb);

    patchPartyForm(form, {
      kind: 'ADMINISTRADOR',
      name: 'Maria Souza',
      documentNumber: '12.345.678/0001-90',
      email: 'maria@empresa.com.br',
      phone: '(19) 99876-5432',
      notes: 'Contato principal',
      isActive: false
    });

    expect(form.getRawValue()).toMatchObject({
      kind: 'ADMINISTRADOR',
      name: 'Maria Souza',
      documentNumber: '12.345.678/0001-90',
      email: 'maria@empresa.com.br',
      phone: '(19) 99876-5432',
      notes: 'Contato principal',
      isActive: false
    });
  });

  it('normaliza os dados do payload de criacao e atualizacao', () => {
    const form = createPartyForm(fb, {
      kind: ' FIADOR ',
      name: ' Carlos Lima ',
      documentNumber: '123.456.789-09',
      email: ' carlos@email.com ',
      phone: '(19) 98765-4321',
      notes: ' Observacao '
    });

    const rawValue = form.getRawValue();

    expect(mapPartyFormToPayload(rawValue)).toEqual({
      kind: 'FIADOR',
      name: 'Carlos Lima',
      documentNumber: '12345678909',
      email: 'carlos@email.com',
      phone: '19987654321',
      notes: 'Observacao'
    });

    expect(mapPartyFormToUpdatePayload({ ...rawValue, isActive: false })).toEqual({
      kind: 'FIADOR',
      name: 'Carlos Lima',
      documentNumber: '12345678909',
      email: 'carlos@email.com',
      phone: '19987654321',
      notes: 'Observacao',
      isActive: false
    });
  });
});
