export function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeDocument(value: unknown): string {
  return onlyDigits(value).slice(0, 14);
}

export function formatCpfCnpj(value: unknown): string {
  const digits = normalizeDocument(value);
  if (!digits) {
    return '';
  }

  if (digits.length <= 11) {
    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function normalizePhone(value: unknown): string {
  return onlyDigits(value).slice(0, 11);
}

export function formatPhoneBr(value: unknown): string {
  const digits = normalizePhone(value);
  if (!digits) {
    return '';
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (digits.length <= 2) {
    return `(${ddd}`;
  }

  if (local.length <= 4) {
    return `(${ddd}) ${local}`;
  }

  if (digits.length <= 10) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

export function coerceCurrency(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    return roundCurrency(value);
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits) {
    return roundCurrency(Number(digits) / 100);
  }

  const normalized = raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return roundCurrency(parsed);
}

export function formatCurrencyBr(value: unknown, withSymbol = false): string {
  const amount = coerceCurrency(value);
  if (amount === null) {
    return '';
  }

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return withSymbol ? `R$ ${formatted}` : formatted;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
