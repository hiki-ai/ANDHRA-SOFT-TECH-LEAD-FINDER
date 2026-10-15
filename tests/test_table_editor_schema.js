/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * REGRESSION TEST SUITE: TABLE EDITOR & COLUMN SCHEMA NORMALIZATION
 * ==============================================================================
 * Location: tests/test_table_editor_schema.js
 *
 * Verifies:
 * 1. Valid schema normalization and retention of custom fields.
 * 2. Missing schema handling (null, undefined, non-array inputs) providing safe defaults.
 * 3. Incomplete preset configuration (missing keys, labels, duplicates, bad types).
 * 4. Complete immunity to TypeError: "Cannot use 'in' operator to search for 'business_name' in undefined".
 * 5. Exact compatibility of 'Furniture Leads' preset with Firestore structures.
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
console.log('TESTING ANDHRA SOFT TECH — TABLE EDITOR SCHEMA & REGRESSION TEST SUITE');
console.log('='.repeat(75));

// ------------------------------------------------------------------------------
// Test Group 1: Valid Schema Normalization
// ------------------------------------------------------------------------------
console.log('\n--- Group 1: Valid Schema Normalization ---');

const validColumns = [
  {
    key: 'business_name',
    label: 'Company Name',
    data_type: 'text',
    position: 0,
    is_enabled: true,
    is_required: true,
    is_custom: false,
  },
  {
    key: 'phone',
    label: 'Contact Number',
    data_type: 'phone',
    position: 1,
    is_enabled: true,
    is_required: false,
    is_custom: false,
  },
  {
    key: 'gst_number',
    label: 'GST Number',
    data_type: 'text',
    position: 2,
    is_enabled: true,
    is_required: false,
    is_custom: true,
    description: 'Custom tax identifier',
  },
];

const normalizedValid = validateAndNormalizeColumns(validColumns);
assert.strictEqual(normalizedValid.length, 3, 'Should retain all 3 valid columns');
assert.strictEqual(normalizedValid[0].key, 'business_name');
assert.strictEqual(normalizedValid[0].is_required, true, 'Business Name must always be required');
assert.strictEqual(normalizedValid[2].key, 'gst_number');
assert.strictEqual(normalizedValid[2].is_custom, true, 'Custom flag must be preserved');
assert.strictEqual(normalizedValid[2].position, 2);
console.log('[PASS] 1. Valid column schema normalized with intact attributes and custom fields');

// ------------------------------------------------------------------------------
// Test Group 2: Missing Schema Handling (Safe Default Fallback)
// ------------------------------------------------------------------------------
console.log('\n--- Group 2: Missing Schema Handling ---');

// null input
const fromNull = validateAndNormalizeColumns(null);
assert.ok(Array.isArray(fromNull), 'Must return an array on null');
assert.strictEqual(fromNull.length, DEFAULT_COLUMNS.length, 'Must return default column schema count');
assert.strictEqual(fromNull[0].key, 'business_name');
assert.strictEqual(fromNull[0].is_enabled, true);

// undefined input
const fromUndefined = validateAndNormalizeColumns(undefined);
assert.ok(Array.isArray(fromUndefined), 'Must return an array on undefined');
assert.strictEqual(fromUndefined[0].key, 'business_name');

// Empty array input
const fromEmpty = validateAndNormalizeColumns([]);
assert.ok(Array.isArray(fromEmpty), 'Must return an array on empty array');
assert.strictEqual(fromEmpty.length, DEFAULT_COLUMNS.length);

// Non-array input (e.g. object or string)
const fromString = validateAndNormalizeColumns('corrupted_schema');
assert.ok(Array.isArray(fromString), 'Must return default array on corrupted string input');
assert.strictEqual(fromString[0].key, 'business_name');

console.log('[PASS] 2. Missing schema safely falls back to standard defaults without crashing');

// ------------------------------------------------------------------------------
// Test Group 3: Incomplete Preset Configuration
// ------------------------------------------------------------------------------
console.log('\n--- Group 3: Incomplete Preset Configuration ---');

const incompletePreset = {
  id: 'preset_broken_1',
  name: 'Broken Preset',
  // Missing 'columns', 'enabled_columns', 'required_columns'
};

const normalizedPreset = validateAndNormalizePreset(incompletePreset);
assert.strictEqual(normalizedPreset.id, 'preset_broken_1');
assert.strictEqual(normalizedPreset.name, 'Broken Preset');
assert.ok(Array.isArray(normalizedPreset.columns), 'Preset columns must be normalized to array');
assert.strictEqual(normalizedPreset.columns.length, DEFAULT_COLUMNS.length);
assert.ok(normalizedPreset.enabled_columns.includes('business_name'));
assert.ok(normalizedPreset.required_columns.includes('business_name'));

// Column missing keys and labels
const malformedColumns = [
  { is_enabled: true }, // missing key and label
  { key: 'phone', data_type: 'invalid_type_xyz' }, // invalid data type, missing label
  { key: 'phone', label: 'Duplicate Phone' }, // duplicate key
  null, // null element inside array
  'string_element', // non-object inside array
];

const normalizedMalformed = validateAndNormalizeColumns(malformedColumns);
assert.strictEqual(normalizedMalformed.length, 3, 'Should discard invalid elements and retain 3 valid column objects');
assert.strictEqual(normalizedMalformed[0].key, 'column_1', 'Auto-assigns slugified key if missing');
assert.strictEqual(normalizedMalformed[1].data_type, 'text', 'Falls back invalid data type to text');
assert.strictEqual(normalizedMalformed[2].key, 'phone_1', 'Deduplicates identical keys');

// Completely null preset
const fromNullPreset = validateAndNormalizePreset(null);
assert.strictEqual(fromNullPreset.id, 'preset_furniture_leads');
assert.strictEqual(fromNullPreset.name, 'Furniture Leads');

console.log('[PASS] 3. Incomplete preset and malformed column definitions safely normalized');

// ------------------------------------------------------------------------------
// Test Group 4: Root Cause Regression Test ('in' Operator Immunity)
// ------------------------------------------------------------------------------
console.log('\n--- Group 4: Root Cause Property Check / "in" Operator Immunity ---');

const testCases = [
  { caps: undefined, desc: 'undefined capabilities' },
  { caps: null, desc: 'null capabilities' },
  { caps: {}, desc: 'empty capabilities object {}' },
  { caps: { google_places: undefined }, desc: 'capabilities with undefined google_places' },
  { caps: { google_places: null }, desc: 'capabilities with null google_places' },
  { caps: { google_places: 'invalid_string' }, desc: 'capabilities with non-object google_places' },
  { caps: { google_places: {} }, desc: 'capabilities with empty google_places {}' },
];

const testColumns = [
  { key: 'business_name', is_custom: false },
  { key: 'phone', is_custom: false },
  { key: 'email', is_custom: false },
  { key: 'custom_tax_id', is_custom: true },
  null,
  undefined,
];

testCases.forEach(({ caps, desc }) => {
  testColumns.forEach((col) => {
    assert.doesNotThrow(() => {
      // Must not throw "TypeError: Cannot use 'in' operator to search for 'business_name' in undefined"
      const isSupported = isFieldSupportedBySource(caps, 'google_places', col);
      assert.strictEqual(typeof isSupported, 'boolean');

      const info = getFieldCapabilityInfo(caps, 'google_places', col);
      assert.strictEqual(typeof info, 'object');
      assert.strictEqual(typeof info.supported, 'boolean');
    }, `Failed safe capability audit with ${desc} for col: ${JSON.stringify(col)}`);
  });
});

// Verify accurate supported states with undefined capabilities
assert.strictEqual(
  isFieldSupportedBySource(undefined, 'google_places', { key: 'business_name', is_custom: false }),
  true,
  'Business name should default to supported on Google Places'
);
assert.strictEqual(
  isFieldSupportedBySource(undefined, 'google_places', { key: 'email', is_custom: false }),
  false,
  'Email should be unsupported on Google Places'
);
assert.strictEqual(
  isFieldSupportedBySource(undefined, 'google_places', { key: 'custom_col', is_custom: true }),
  false,
  'Custom column should be unsupported by raw Google Places connector'
);

// Verify accurate supported states with populated capabilities
const populatedCaps = {
  google_places: {
    business_name: { supported: true, availability: 'full' },
    email: { supported: false, availability: 'unavailable', reason: 'No email provided by Google Places API' },
  },
};
assert.strictEqual(
  isFieldSupportedBySource(populatedCaps, 'google_places', { key: 'business_name' }),
  true
);
assert.strictEqual(
  isFieldSupportedBySource(populatedCaps, 'google_places', { key: 'email' }),
  false
);
const emailInfo = getFieldCapabilityInfo(populatedCaps, 'google_places', { key: 'email' });
assert.strictEqual(emailInfo.supported, false);
assert.strictEqual(emailInfo.reason, 'No email provided by Google Places API');

console.log('[PASS] 4. isFieldSupportedBySource completely immune to TypeError: Cannot use "in" operator in undefined');

// ------------------------------------------------------------------------------
// Test Group 5: Furniture Leads Preset Compatibility with Firestore
// ------------------------------------------------------------------------------
console.log('\n--- Group 5: Furniture Leads Preset Compatibility ---');

const furnCols = buildFurnitureLeadsColumns();
const enabledFurnitureCols = furnCols.filter((c) => c.is_enabled);
const expectedEnabledKeys = ['business_name', 'category', 'phone', 'address', 'website'];

assert.strictEqual(
  enabledFurnitureCols.length,
  5,
  "Furniture Leads must have exactly 5 enabled columns"
);
assert.deepStrictEqual(
  enabledFurnitureCols.map((c) => c.key),
  expectedEnabledKeys,
  "Enabled columns must match exact sequence: ['business_name', 'category', 'phone', 'address', 'website']"
);

// Check that only business_name is required
assert.strictEqual(furnCols.find((c) => c.key === 'business_name').is_required, true);
assert.strictEqual(furnCols.find((c) => c.key === 'phone').is_required, false);

// Check total columns count (5 enabled + 11 disabled = 16)
assert.strictEqual(furnCols.length, 16);

// Check Canonical preset structure
assert.strictEqual(CANONICAL_FURNITURE_PRESET.id, 'preset_furniture_leads');
assert.strictEqual(CANONICAL_FURNITURE_PRESET.is_system, true);
assert.strictEqual(CANONICAL_FURNITURE_PRESET.is_default, true);
assert.deepStrictEqual(CANONICAL_FURNITURE_PRESET.enabled_columns, expectedEnabledKeys);

console.log('[PASS] 5. Furniture Leads preset matches Cloud Firestore schema specifications perfectly');

console.log('\n' + '='.repeat(75));
console.log('ALL TABLE EDITOR SCHEMA REGRESSION TESTS PASSED (100% SUCCESS)');
console.log('='.repeat(75));
