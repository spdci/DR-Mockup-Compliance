// Identifiers the suite searches for, per record type. The defaults match the records served
// by the mock DR. To run against a real DR, point TEST_DATA_FILE at a JSON file overriding any
// entry, e.g.
//   { "records": { "PWDPerson": { "full": { "identifier_type": "UIN", "identifier_value": "PWD-0042" } } } }

import { readFileSync } from 'node:fs';

const uin = (identifier_value) => ({ identifier_type: 'UIN', identifier_value });

const defaults = {
  records: {
    PWDPerson: {
      full: uin('M500000003'),
      // A person with disability found through the identifier of their person (demographic_info).
      'by person identifier': uin('500000003'),
      'by birth registration': { identifier_type: 'BRN', identifier_value: 'BRN2012000303' },
      elder: uin('M600000001'),
      pending: uin('M700000001'),
      expired: uin('800000001'),
      minimal: uin('M990000001'),
      unknown: uin('M999999999'),
      // The mock rejects this value with rjct.search.too_many_records_found.
      too_many: uin('TOOMANY000'),
    },
    DRPerson: {
      full: uin('500000001'),
      minimal: uin('590000001'),
      multi: { identifier_type: 'MRN', identifier_value: 'MRN2005000222' },
      child: uin('500000003'),
      newborn: { identifier_type: 'BRN', identifier_value: 'BRN2025000505' },
      elder: uin('600000001'),
      caregiver: uin('600000002'),
      deceased: { identifier_type: 'DRN', identifier_value: 'DRN2019000777' },
      single: uin('700000001'),
      unknown: uin('999999999'),
      too_many: uin('TOOMANY000'),
    },
    Member: {
      full: uin('M500000001'),
      minimal: uin('M900000001'),
      // A member found through the identifier of its person (demographic_info.identifier).
      'by person identifier': uin('500000001'),
      spouse: uin('M500000002'),
      disabled: uin('M500000003'),
      newborn: uin('M500000004'),
      elder: uin('M600000001'),
      caregiver: uin('M600000002'),
      single: uin('M700000001'),
      unknown: uin('M999999999'),
      too_many: uin('TOOMANY000'),
    },
    Group: {
      full: uin('GRP-DR-1001'),
      minimal: uin('GRP-DR-2001'),
      large: uin('GRP-DR-3001'),
      single: uin('GRP-DR-4001'),
      // Households found through the identifier of one of their members.
      'by member identifier': uin('M500000003'),
      'by person identifier': uin('600000002'),
      'by birth registration': { identifier_type: 'BRN', identifier_value: 'BRN2025000505' },
      unknown: uin('GRP-DR-9999'),
      too_many: uin('TOOMANY000'),
    },
  },
  // Persons queried on the disability endpoints (get-disability-support, get-disability-details,
  // disabled), with what the registry is expected to answer.
  disability: {
    // Approved disability, support registered.
    approved: uin('M500000003'),
    'approved by person identifier': uin('500000003'),
    'approved elder': uin('M600000001'),
    // Assessment pending: not (yet) disabled, no support registered.
    pending: uin('M700000001'),
    // Assessment expired: no longer disabled.
    expired: uin('800000001'),
    // Registered in the DR as a member but without disability.
    'not disabled': uin('M500000001'),
    unknown: uin('M999999999'),
  },
  regType: 'ns:org:RegistryType:DR',
};

const overrides = process.env.TEST_DATA_FILE ? JSON.parse(readFileSync(process.env.TEST_DATA_FILE, 'utf8')) : {};

export const testData = {
  ...defaults,
  ...overrides,
  records: Object.fromEntries(Object.entries(defaults.records).map(([type, set]) => [
    type, { ...set, ...(overrides.records?.[type] || {}) },
  ])),
  disability: { ...defaults.disability, ...(overrides.disability || {}) },
};

export function testRecord(type, name) {
  const set = testData.records[type];
  if (!set) throw new Error(`Unknown record type "${type}". Known: ${Object.keys(testData.records).join(', ')}`);
  if (!set[name]) throw new Error(`Unknown test ${type} "${name}". Known: ${Object.keys(set).join(', ')}`);
  return set[name];
}

export function testDisabilityPerson(name) {
  if (!testData.disability[name]) throw new Error(`Unknown disability test person "${name}". Known: ${Object.keys(testData.disability).join(', ')}`);
  return testData.disability[name];
}
