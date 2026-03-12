export interface PropertyStatusSource {
  status?: string | null;
  occupancyStatus?: string | null;
  assetState?: string | null;
}

export interface PropertyStatusPayload {
  occupancyStatus: string;
  assetState: string;
}

const DEFAULT_PROPERTY_STATUS = 'AVAILABLE';

const PROPERTY_STATUS_PAYLOAD_MAP: Record<string, PropertyStatusPayload> = {
  AVAILABLE: {
    occupancyStatus: 'VACANT',
    assetState: 'READY'
  },
  LEASED: {
    occupancyStatus: 'OCCUPIED',
    assetState: 'READY'
  },
  UNAVAILABLE: {
    occupancyStatus: 'VACANT',
    assetState: 'BLOCKED'
  },
  INACTIVE: {
    occupancyStatus: 'VACANT',
    assetState: 'BLOCKED'
  }
};

export function inferPropertyStatus(source: PropertyStatusSource): string {
  const status = normalizeStatus(source.status);
  if (status) {
    return status;
  }

  const occupancyStatus = normalizeStatus(source.occupancyStatus);
  const assetState = normalizeStatus(source.assetState);

  if (occupancyStatus === 'OCCUPIED' || occupancyStatus === 'PARTIALLY_OCCUPIED') {
    return 'LEASED';
  }

  if (assetState && assetState !== 'READY') {
    return 'UNAVAILABLE';
  }

  if (occupancyStatus === 'RESERVED') {
    return 'UNAVAILABLE';
  }

  return DEFAULT_PROPERTY_STATUS;
}

export function mapPropertyStatusToPayload(status?: string | null): PropertyStatusPayload {
  const normalizedStatus = normalizeStatus(status) ?? DEFAULT_PROPERTY_STATUS;
  return PROPERTY_STATUS_PAYLOAD_MAP[normalizedStatus] ?? PROPERTY_STATUS_PAYLOAD_MAP[DEFAULT_PROPERTY_STATUS];
}

function normalizeStatus(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, '_').replace(/-/g, '_').toUpperCase();
  return normalized || null;
}
