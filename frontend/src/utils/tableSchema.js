/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * TABLE PRESET & COLUMN SCHEMA VALIDATION AND CAPABILITY UTILITIES
 * ==============================================================================
 * Location: frontend/src/utils/tableSchema.js
 *
 * Provides schema validation, column normalization, canonical preset defaults,
 * and null-safe source capability audits. Guarantees that neither TableEditor
 * nor downstream components can encounter runtime TypeErrors like
 * "Cannot use 'in' operator to search for 'business_name' in undefined".
 * ==============================================================================
 */

// Permitted data types for lead columns
export const VALID_DATA_TYPES = [
  'text',
  'phone',
  'email',
  'url',
  'number',
  'rating',
  'date',
  'boolean',
];

// Canonical Default Columns mapping 1-to-1 with Cloud Firestore vendor schema
export const DEFAULT_COLUMNS = [
  {
    key: 'business_name',
    name: 'business_name',
    label: 'Business Name',
    data_type: 'text',
    position: 0,
    is_enabled: true,
    is_required: true,
    is_custom: false,
    description: 'Official business or company name',
  },
  {
    key: 'category',
    name: 'category',
    label: 'Category',
    data_type: 'text',
    position: 1,
    is_enabled: true,
    is_required: false,
    is_custom: false,
    description: 'Primary industry classification',
  },
  {
    key: 'phone',
    name: 'phone',
    label: 'Phone',
    data_type: 'phone',
    position: 2,
    is_enabled: true,
    is_required: false,
    is_custom: false,
    description: 'Primary contact telephone or mobile number',
  },
  {
    key: 'address',
    name: 'address',
    label: 'Address',
    data_type: 'text',
    position: 3,
    is_enabled: true,
    is_required: false,
    is_custom: false,
    description: 'Full street address or storefront location',
  },
  {
    key: 'city',
    name: 'city',
    label: 'City',
    data_type: 'text',
    position: 4,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'City or municipality',
  },
  {
    key: 'state',
    name: 'state',
    label: 'State',
    data_type: 'text',
    position: 5,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'State or administrative region',
  },
  {
    key: 'website',
    name: 'website',
    label: 'Website',
    data_type: 'url',
    position: 6,
    is_enabled: true,
    is_required: false,
    is_custom: false,
    description: 'Official company website or web profile',
  },
  {
    key: 'email',
    name: 'email',
    label: 'Email',
    data_type: 'email',
    position: 7,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Electronic mail contact address',
  },
  {
    key: 'rating',
    name: 'rating',
    label: 'Rating',
    data_type: 'rating',
    position: 8,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Customer feedback average score (0 to 5)',
  },
  {
    key: 'review_count',
    name: 'review_count',
    label: 'Review Count',
    data_type: 'number',
    position: 9,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Total count of public reviews',
  },
  {
    key: 'source',
    name: 'source',
    label: 'Source',
    data_type: 'text',
    position: 10,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Source provider name',
  },
  {
    key: 'source_id',
    name: 'source_id',
    label: 'Source ID',
    data_type: 'text',
    position: 11,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Provider external record identifier (place_id)',
  },
  {
    key: 'status',
    name: 'status',
    label: 'Status',
    data_type: 'text',
    position: 12,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Lead verification status (valid, duplicate, invalid)',
  },
  {
    key: 'data_quality_score',
    name: 'data_quality_score',
    label: 'Data Quality',
    data_type: 'number',
    position: 13,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Automated data completeness score (0-100)',
  },
  {
    key: 'created_at',
    name: 'created_at',
    label: 'Created At',
    data_type: 'date',
    position: 14,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Record creation timestamp',
  },
  {
    key: 'updated_at',
    name: 'updated_at',
    label: 'Updated At',
    data_type: 'date',
    position: 15,
    is_enabled: false,
    is_required: false,
    is_custom: false,
    description: 'Record last updated timestamp',
  },
];

/**
 * Constructs the canonical column definitions for the 'Furniture Leads' system preset.
 * Exact enabled order:
 * 1. Business Name (required)
 * 2. Category
 * 3. Phone
 * 4. Address
 * 5. Website
 * Remaining 11 default columns are present but disabled.
 */
export function buildFurnitureLeadsColumns() {
  const orderedKeys = ['business_name', 'category', 'phone', 'address', 'website'];
  const columns = [];

  // Enabled primary columns
  orderedKeys.forEach((key, idx) => {
    const base = DEFAULT_COLUMNS.find((c) => c.key === key);
    if (base) {
      columns.push({
        ...base,
        position: idx,
        is_enabled: true,
        is_required: key === 'business_name',
      });
    }
  });

  // Remaining disabled default columns
  let curPos = orderedKeys.length;
  DEFAULT_COLUMNS.forEach((base) => {
    if (!orderedKeys.includes(base.key)) {
      columns.push({
        ...base,
        position: curPos++,
        is_enabled: false,
        is_required: false,
      });
    }
  });

  return columns;
}

// Canonical Furniture Leads Preset template
export const CANONICAL_FURNITURE_PRESET = {
  id: 'preset_furniture_leads',
  name: 'Furniture Leads',
  description: 'Optimized preset for furniture vendor lead extraction with essential contact details.',
  is_system: true,
  is_default: true,
  columns: buildFurnitureLeadsColumns(),
  enabled_columns: ['business_name', 'category', 'phone', 'address', 'website'],
  required_columns: ['business_name'],
  extraction_config: {
    source: 'google_places',
    enforce_required: true,
  },
  export_config: {
    include_headers: true,
    format: 'xlsx',
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/**
 * Validates and normalizes an array of column definitions.
 * Handles missing schema, malformed objects, duplicate keys, and missing properties safely.
 *
 * @param {Array} rawColumns - The raw columns array from preset or API
 * @param {Array} fallbackColumns - Optional fallback columns list if rawColumns is invalid
 * @returns {Array} A clean, strictly validated array of column definition objects
 */
export function validateAndNormalizeColumns(rawColumns, fallbackColumns = null) {
  if (!Array.isArray(rawColumns) || rawColumns.length === 0) {
    return Array.isArray(fallbackColumns) && fallbackColumns.length > 0
      ? JSON.parse(JSON.stringify(fallbackColumns))
      : buildFurnitureLeadsColumns();
  }

  const seenKeys = new Set();
  const normalized = [];

  rawColumns.forEach((c, idx) => {
    if (!c || typeof c !== 'object') return;

    let key = String(c.key || c.name || c.id || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!key) {
      key = `column_${idx + 1}`;
    }

    // Ensure unique keys
    let uniqueKey = key;
    let counter = 1;
    while (seenKeys.has(uniqueKey)) {
      uniqueKey = `${key}_${counter++}`;
    }
    seenKeys.add(uniqueKey);

    const label = String(c.label || c.name || uniqueKey).trim() || uniqueKey;
    const rawType = String(c.data_type || c.type || 'text').trim().toLowerCase();
    const dataType = VALID_DATA_TYPES.includes(rawType) ? rawType : 'text';

    const isEnabled = typeof c.is_enabled === 'boolean' ? c.is_enabled : true;
    const isRequired = uniqueKey === 'business_name' ? true : Boolean(c.is_required);
    const isCustom = typeof c.is_custom === 'boolean'
      ? c.is_custom
      : !DEFAULT_COLUMNS.some((d) => d.key === uniqueKey);

    normalized.push({
      key: uniqueKey,
      name: uniqueKey,
      label,
      data_type: dataType,
      position: typeof c.position === 'number' ? c.position : idx,
      is_enabled: isEnabled,
      is_required: isRequired,
      is_custom: isCustom,
      description: typeof c.description === 'string' ? c.description : '',
    });
  });

  if (normalized.length === 0) {
    return Array.isArray(fallbackColumns) && fallbackColumns.length > 0
      ? JSON.parse(JSON.stringify(fallbackColumns))
      : buildFurnitureLeadsColumns();
  }

  // Ensure consecutive zero-indexed positions
  return normalized.map((col, idx) => ({
    ...col,
    position: idx,
  }));
}

/**
 * Validates and normalizes a preset configuration object.
 * Returns a structurally sound preset with sanitized columns and configuration.
 *
 * @param {Object} rawPreset - The raw preset object from Firestore or user input
 * @param {Array} fallbackColumns - Optional fallback columns list
 * @returns {Object} A sanitized preset configuration object
 */
export function validateAndNormalizePreset(rawPreset, fallbackColumns = null) {
  if (!rawPreset || typeof rawPreset !== 'object') {
    return JSON.parse(JSON.stringify(CANONICAL_FURNITURE_PRESET));
  }

  const id = String(rawPreset.id || `preset_${Date.now()}`);
  const name = String(rawPreset.name || 'Custom Table Preset').trim();
  const description = typeof rawPreset.description === 'string' ? rawPreset.description : '';
  const isSystem = Boolean(rawPreset.is_system);
  const isDefault = Boolean(rawPreset.is_default);

  const columns = validateAndNormalizeColumns(rawPreset.columns, fallbackColumns);
  const enabledColumns = columns.filter((c) => c.is_enabled).map((c) => c.key);
  const requiredColumns = columns.filter((c) => c.is_required).map((c) => c.key);

  return {
    ...rawPreset,
    id,
    name,
    description,
    is_system: isSystem,
    is_default: isDefault,
    columns,
    enabled_columns: enabledColumns,
    required_columns: requiredColumns,
    extraction_config: rawPreset.extraction_config || { source: 'google_places', enforce_required: true },
    export_config: rawPreset.export_config || { include_headers: true, format: 'xlsx' },
  };
}

/**
 * Safely inspects whether a column key is supported by a specific data provider connector.
 * Completely immune to TypeError: Cannot use 'in' operator on undefined/null.
 *
 * @param {Object|null|undefined} capabilities - Source capabilities registry
 * @param {string} source - Connector identifier (e.g. 'google_places')
 * @param {Object|string} colOrKey - Column object or column string key
 * @returns {boolean} Whether the provider supports extracting this field
 */
export function isFieldSupportedBySource(capabilities, source = 'google_places', colOrKey = null) {
  const key = typeof colOrKey === 'string' ? colOrKey : colOrKey?.key;
  if (!key) return false;

  const isCustom = typeof colOrKey === 'object' ? Boolean(colOrKey?.is_custom) : false;

  // Safe traversal without 'in' operator on undefined
  if (capabilities && typeof capabilities === 'object' && source in capabilities) {
    const sourceCaps = capabilities[source];
    if (sourceCaps && typeof sourceCaps === 'object' && key in sourceCaps) {
      return Boolean(sourceCaps[key]?.supported);
    }
  }

  // Safe fallback heuristics when capability schema is loading, missing, or malformed
  if (isCustom) return false;
  if (key === 'email') return false;
  return true;
}

/**
 * Safely retrieves capability metadata for a column and data provider.
 *
 * @param {Object|null|undefined} capabilities - Source capabilities registry
 * @param {string} source - Connector identifier
 * @param {Object|string} colOrKey - Column object or column string key
 * @returns {Object} Structured capability info (supported, availability, reason)
 */
export function getFieldCapabilityInfo(capabilities, source = 'google_places', colOrKey = null) {
  const key = typeof colOrKey === 'string' ? colOrKey : colOrKey?.key;
  if (!key) {
    return {
      supported: false,
      availability: 'unknown',
      reason: 'Invalid column key',
    };
  }

  const isCustom = typeof colOrKey === 'object' ? Boolean(colOrKey?.is_custom) : false;

  if (capabilities && typeof capabilities === 'object' && source in capabilities) {
    const sourceCaps = capabilities[source];
    if (sourceCaps && typeof sourceCaps === 'object' && key in sourceCaps) {
      const cap = sourceCaps[key];
      if (cap && typeof cap === 'object') {
        return {
          supported: Boolean(cap.supported),
          availability: cap.availability || (cap.supported ? 'full' : 'unavailable'),
          reason: cap.reason || '',
          source_field: cap.source_field || '',
          description: cap.description || '',
        };
      }
    }
  }

  if (isCustom) {
    return {
      supported: false,
      availability: 'custom',
      reason: 'Custom attribute: stored in Firestore custom_fields and populated via manual entry or enrichment.',
    };
  }

  if (key === 'email') {
    return {
      supported: false,
      availability: 'unavailable',
      reason: 'Google Maps Platform Places API does not provide electronic mail addresses.',
    };
  }

  return {
    supported: true,
    availability: 'full',
    reason: '',
  };
}
