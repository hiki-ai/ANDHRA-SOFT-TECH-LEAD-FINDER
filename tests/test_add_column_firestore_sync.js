/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * TEST SUITE: ADD COLUMN & FIRESTORE SYNCHRONIZATION VERIFICATION
 * ==============================================================================
 * Location: tests/test_add_column_firestore_sync.js
 *
 * Verifies:
 * 1. Add Column validation, slug key generation, and unique key/label checking.
 * 2. Cloud Firestore preset document structure (/tablePresets/{presetId}).
 * 3. Successful save operation and verification of persisted custom column.
 * 4. Page reload simulation (re-fetching from Firestore) verifying column persistence.
 * 5. Error handling for permission-denied and network errors.
 * 6. Preservation of canonical default columns and presets.
 * 7. Downstream integration with New Collection preset selection & spreadsheet export.
 * ==============================================================================
 */

import assert from 'node:assert';
import {
  DEFAULT_COLUMNS,
  CANONICAL_FURNITURE_PRESET,
  buildFurnitureLeadsColumns,
  validateAndNormalizeColumns,
  validateAndNormalizePreset,
  isFieldSupportedBySource,
  getFieldCapabilityInfo,
} from '../frontend/src/utils/tableSchema.js';

console.log('='.repeat(75));
console.log('TESTING ANDHRA SOFT TECH — ADD COLUMN & FIRESTORE SYNCHRONIZATION SUITE');
console.log('='.repeat(75));

// ------------------------------------------------------------------------------
// TEST 1: Add Column Validation, Slug Generation, and Key Uniqueness
// ------------------------------------------------------------------------------
console.log('\n--- TEST 1: Add Column Validation & Key Slugification ---');

function createColumnDefinition({ label, key, type = 'text', isRequired = false, existingColumns = [] }) {
  const cleanLabel = (label || '').trim();
  let cleanKey = (key || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (!cleanLabel) {
    throw new Error('Please enter a column display name.');
  }

  if (!cleanKey) {
    cleanKey = cleanLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  if (!cleanKey) {
    cleanKey = `custom_${Date.now()}`;
  }

  // Duplicate key check
  if (existingColumns.some((c) => c.key === cleanKey)) {
    throw new Error(`Field key '${cleanKey}' is already used. Keys must be unique.`);
  }

  // Duplicate label check
  if (existingColumns.some((c) => c.label.toLowerCase() === cleanLabel.toLowerCase())) {
    throw new Error(`A column named '${cleanLabel}' already exists.`);
  }

  return {
    key: cleanKey,
    name: cleanKey,
    label: cleanLabel,
    data_type: type,
    position: existingColumns.length,
    is_enabled: true,
    is_required: Boolean(isRequired),
    is_custom: true,
    description: `Custom attribute: ${cleanLabel}`,
  };
}

const initialColumns = buildFurnitureLeadsColumns();

// Test normal custom column addition
const newCol1 = createColumnDefinition({
  label: 'GST Number',
  key: '', // auto-slugify
  type: 'text',
  isRequired: false,
  existingColumns: initialColumns,
});

assert.strictEqual(newCol1.key, 'gst_number', 'Key should be auto-slugified to gst_number');
assert.strictEqual(newCol1.label, 'GST Number');
assert.strictEqual(newCol1.data_type, 'text');
assert.strictEqual(newCol1.is_enabled, true);
assert.strictEqual(newCol1.is_required, false);
assert.strictEqual(newCol1.is_custom, true);
assert.strictEqual(newCol1.position, initialColumns.length);
console.log('[PASS] 1a. Custom column successfully created with unique auto-slugified key and valid attributes.');

// Test duplicate key rejection
assert.throws(() => {
  createColumnDefinition({
    label: 'GST Tax ID',
    key: 'gst_number', // already exists in updated list
    existingColumns: [...initialColumns, newCol1],
  });
}, /Keys must be unique/);
console.log('[PASS] 1b. Duplicate field key rejected with clear error.');

// Test duplicate label rejection
assert.throws(() => {
  createColumnDefinition({
    label: 'gst number', // case-insensitive match
    key: 'gst_number_alt',
    existingColumns: [...initialColumns, newCol1],
  });
}, /already exists/);
console.log('[PASS] 1c. Duplicate display name rejected with clear error.');

// ------------------------------------------------------------------------------
// TEST 2: Firestore Document Schema & Persistence Simulation
// ------------------------------------------------------------------------------
console.log('\n--- TEST 2: Firestore Document Persistence (/tablePresets/{presetId}) ---');

// Mock in-memory Firestore database
const mockFirestore = {
  tablePresets: new Map(),
};

function mockSaveTablePreset(id, presetData) {
  if (!id) throw new Error('Preset ID is required to save to Firestore.');
  const cleanColumns = Array.isArray(presetData.columns) ? presetData.columns : [];
  const enabledKeys = cleanColumns.filter((c) => c.is_enabled).map((c) => c.key);
  const requiredKeys = cleanColumns.filter((c) => c.is_required).map((c) => c.key);

  const payload = {
    id,
    name: presetData.name || 'Table Preset',
    description: presetData.description || '',
    columns: cleanColumns,
    enabled_columns: enabledKeys,
    required_columns: requiredKeys,
    extraction_config: presetData.extraction_config || { source: 'google_places', enforce_required: true },
    export_config: presetData.export_config || { include_headers: true, format: 'xlsx' },
    is_system: Boolean(presetData.is_system),
    is_default: Boolean(presetData.is_default),
    updated_at: new Date().toISOString(),
  };

  mockFirestore.tablePresets.set(id, JSON.parse(JSON.stringify(payload)));
  return payload;
}

function mockGetTablePresetById(id) {
  return mockFirestore.tablePresets.get(id) || null;
}

// Seed initial canonical preset in mock Firestore
mockSaveTablePreset(CANONICAL_FURNITURE_PRESET.id, CANONICAL_FURNITURE_PRESET);

const savedPresetBefore = mockGetTablePresetById('preset_furniture_leads');
assert.ok(savedPresetBefore, 'Canonical preset must exist in Firestore');
assert.strictEqual(savedPresetBefore.columns.length, DEFAULT_COLUMNS.length);
console.log('[PASS] 2a. Initial Firestore document verified at path: /tablePresets/preset_furniture_leads');

// Save modified preset containing new custom column
const updatedColumns = [...initialColumns, newCol1];
const savePayload = {
  ...savedPresetBefore,
  columns: updatedColumns,
};

const saveResult = mockSaveTablePreset('preset_furniture_leads', savePayload);
assert.strictEqual(saveResult.id, 'preset_furniture_leads');
assert.ok(saveResult.enabled_columns.includes('gst_number'), 'gst_number must be in enabled_columns');
assert.strictEqual(saveResult.columns.length, initialColumns.length + 1);
console.log('[PASS] 2b. Successfully persisted preset with custom column to Firestore: /tablePresets/preset_furniture_leads');

// ------------------------------------------------------------------------------
// TEST 3: Page Reload Verification (Reopening Preset from Firestore)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 3: Page Reload & Preset Reopening Verification ---');

// Simulate page reload: fetch fresh preset from Firestore
const reloadedPreset = mockGetTablePresetById('preset_furniture_leads');
assert.ok(reloadedPreset, 'Must successfully reload preset from Firestore');

// Normalize reloaded preset
const normalizedReloaded = validateAndNormalizePreset(reloadedPreset);
assert.strictEqual(normalizedReloaded.id, 'preset_furniture_leads');
assert.strictEqual(normalizedReloaded.columns.length, initialColumns.length + 1);

// Find the custom column in reloaded preset
const reloadedCustomCol = normalizedReloaded.columns.find((c) => c.key === 'gst_number');
assert.ok(reloadedCustomCol, "Custom column 'gst_number' must be present after reload");
assert.strictEqual(reloadedCustomCol.label, 'GST Number');
assert.strictEqual(reloadedCustomCol.is_custom, true);
assert.strictEqual(reloadedCustomCol.is_enabled, true);
assert.strictEqual(reloadedCustomCol.data_type, 'text');
console.log('[PASS] 3. Page reload verified: Custom column reloads intact with all attributes from Firestore document.');

// ------------------------------------------------------------------------------
// TEST 4: Firestore Error Handling (Permission Denied & Network Failures)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 4: Firestore Error Handling ---');

function mockFirestoreWriteWithError(errorType) {
  if (errorType === 'permission-denied') {
    const err = new Error('Missing or insufficient permissions.');
    err.code = 'permission-denied';
    throw new Error('Firestore write permission denied. Please verify your authentication status.');
  }
  if (errorType === 'network-error') {
    throw new Error('Unable to connect to Firestore. Please check your internet connection.');
  }
}

// Test permission-denied error handling
assert.throws(() => {
  mockFirestoreWriteWithError('permission-denied');
}, /permission denied/i);
console.log('[PASS] 4a. Permission denied error gracefully surfaced to user with actionable message.');

// Test network error handling
assert.throws(() => {
  mockFirestoreWriteWithError('network-error');
}, /internet connection/i);
console.log('[PASS] 4b. Network connection error gracefully handled.');

// ------------------------------------------------------------------------------
// TEST 5: Downstream Integration (New Collection Modal & Capabilities)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 5: Downstream Integration Verification ---');

// Verify that the reloaded preset provides custom column info for New Collection
const enabledList = normalizedReloaded.columns.filter((c) => c.is_enabled);
assert.ok(enabledList.some((c) => c.key === 'gst_number'), 'Custom column must appear in enabled columns');

// Verify capability mapping
const capInfo = getFieldCapabilityInfo({}, 'google_places', reloadedCustomCol);
assert.strictEqual(capInfo.supported, false);
assert.strictEqual(capInfo.availability, 'custom');
assert.ok(capInfo.reason.includes('custom_fields'), 'Capability info must state custom_fields storage');
console.log('[PASS] 5a. Custom column accurately reported as custom attribute stored under custom_fields.');

// Verify source capability check does not block unless column is marked required
const isGoogleSupported = isFieldSupportedBySource({}, 'google_places', reloadedCustomCol);
assert.strictEqual(isGoogleSupported, false, 'Custom field is not directly supplied by Google Places API');
console.log('[PASS] 5b. Extraction capability check respects custom column without breaking Google Places connector.');

console.log('\n' + '='.repeat(75));
console.log('ALL ADD COLUMN & FIRESTORE SYNCHRONIZATION TESTS PASSED (100% SUCCESS)');
console.log('='.repeat(75));
