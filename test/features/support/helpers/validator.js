// Validation of DCI DR payloads: JSON Schema (structure, types, formats, code lists) plus the
// semantic rules a schema cannot express (real calendar dates, chronology, consistency between
// attributes, between a person with disability and their support, between the records of a
// group, and request/response correlation).

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  schemas, drCodeLists, ISO_DATE_PATTERN, PWD_RECORD_TYPE_PATTERN, PERSON_RECORD_TYPE_PATTERN,
  MEMBER_RECORD_TYPE_PATTERN, GROUP_RECORD_TYPE_PATTERN,
} from './schemas.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const compiled = {};
const compile = (name) => {
  if (!schemas[name]) throw new Error(`Unknown schema "${name}". Known: ${Object.keys(schemas).join(', ')}`);
  compiled[name] ??= ajv.compile(schemas[name]);
  return compiled[name];
};

const formatAjvErrors = (errors = []) => {
  // anyOf/if branches produce noisy duplicates, keep the most specific ones: a type mismatch
  // of the alternative branch ("reg_records must be object") is dropped when an error deeper
  // in the same value explains what is wrong.
  const seen = new Set();
  const deeper = (e) => errors.some((o) => o.instancePath.startsWith(`${e.instancePath}/`));
  return errors
    .filter((e) => !['anyOf', 'if', 'oneOf'].includes(e.keyword))
    .filter((e) => !(e.keyword === 'type' && deeper(e)))
    .map((e) => {
      const where = e.instancePath || '(root)';
      const extra = e.keyword === 'enum' ? ` ${JSON.stringify(e.params.allowedValues)}`
        : e.keyword === 'const' ? ` ${JSON.stringify(e.params.allowedValue)}` : '';
      return `${where} ${e.message}${extra}`;
    })
    .filter((m) => (seen.has(m) ? false : seen.add(m)));
};

export function validateSchema(name, data) {
  const validate = compile(name);
  const valid = validate(data);
  return { valid, errors: valid ? [] : formatAjvErrors(validate.errors) };
}

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------
export const RECORD_TYPES = ['PWDPerson', 'DRPerson', 'Member', 'Group', 'SupportRecord'];

// Maps a reg_record_type value to PWDPerson, DRPerson, Member or Group (undefined when it is
// not a DR record type).
export function recordTypeOf(value) {
  if (typeof value !== 'string') return undefined;
  if (new RegExp(PWD_RECORD_TYPE_PATTERN).test(value)) return 'PWDPerson';
  if (new RegExp(PERSON_RECORD_TYPE_PATTERN).test(value)) return 'DRPerson';
  if (new RegExp(MEMBER_RECORD_TYPE_PATTERN).test(value)) return 'Member';
  if (new RegExp(GROUP_RECORD_TYPE_PATTERN).test(value)) return 'Group';
  return undefined;
}

// The code of a DR code list value sent as a code ("3", 3) or as a published label ("Severe").
export function drCodeOf(list, value) {
  const entries = drCodeLists[list];
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  if (Object.hasOwn(entries, text)) return text;
  return Object.entries(entries).find(([, labels]) => labels.includes(text))?.[0];
}

// The DR code list of a coded attribute, by attribute name.
export const drAttributeCodeList = {
  disability_status: 'disabilityStatus',
  disability_status_level: 'disabilityLevel',
  disability_level: 'disabilityLevel',
  impairment_type: 'impairmentType',
  impairment_level: 'impairmentLevel',
  impairment_cause: 'impairmentCause',
  age_on_set: 'disabilityOnSet',
  transport_requirement: 'transportRequirement',
  housing_type: 'housingType',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isoDateRe = new RegExp(ISO_DATE_PATTERN);

export function isRealDate(value) {
  if (typeof value !== 'string' || !isoDateRe.test(value)) return false;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Calendar-day comparison so that "1990-05-15" and "1990-05-15T00:00:00Z" are the same day.
const day = (value) => value.slice(0, 10);
const present = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
const asList = (v) => (Array.isArray(v) ? v : [v]).filter(present);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const today = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10); // 1 day clock-skew tolerance
const validDay = (v) => (typeof v === 'string' && isRealDate(v) ? day(v) : undefined);
const idKey = (id) => (isObject(id) && typeof id.identifier_type === 'string' && typeof id.identifier_value === 'string'
  ? `${id.identifier_type}|${id.identifier_value}` : undefined);
const idKeys = (list) => (Array.isArray(list) ? list.map(idKey).filter(Boolean) : []);
const isTrue = (flag) => flag === true || flag === 1;
const isFalse = (flag) => flag === false || flag === 0;

// Every date that is sent must be a real calendar date and not in the future.
function checkDates(record, fields, where) {
  const errors = [];
  for (const field of fields) {
    for (const value of asList(record[field])) {
      if (typeof value !== 'string') continue; // type errors are reported by the schema
      if (!isRealDate(value)) errors.push(`${where}.${field} "${value}" is not a valid ISO 8601 calendar date`);
      else if (day(value) > today()) errors.push(`${where}.${field} "${value}" is in the future`);
    }
  }
  return errors;
}

function checkUpdatedAfterRegistration(record, where) {
  const registration = validDay(record.registration_date);
  const lastUpdated = validDay(record.last_updated);
  return registration && lastUpdated && lastUpdated < registration
    ? [`${where}.last_updated ${lastUpdated} is before registration_date ${registration}`]
    : [];
}

function checkDuplicateIdentifiers(list, where) {
  const keys = idKeys(list);
  const duplicates = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  return duplicates.length ? [`${where} contains duplicates: ${duplicates.join(', ')}`] : [];
}

// Coordinates may be sent as text (schema:GeoCoordinates); their range is checked here.
function checkCoordinates(geo, where) {
  const errors = [];
  if (!isObject(geo)) return errors;
  for (const [axis, limit] of [['latitude', 90], ['longitude', 180]]) {
    const value = geo[axis];
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) > limit) {
      errors.push(`${where}.${axis} "${value}" is outside [-${limit}, ${limit}]`);
    }
  }
  return errors;
}

function checkPlace(place, where) {
  if (!isObject(place)) return [];
  return [
    ...checkCoordinates(place.geo, `${where}.geo`),
    ...asList(place.contains_place).flatMap((p, i) => checkPlace(p, `${where}.contains_place[${i}]`)),
    ...(isObject(place.contained_in_place) ? checkPlace(place.contained_in_place, `${where}.contained_in_place`) : []),
  ];
}

function checkAddresses(address, where) {
  const errors = [];
  for (const [i, a] of asList(address).entries()) {
    const geometry = a?.geo_location?.plus_code?.geometry;
    const ne = geometry?.bounds?.northeast;
    const sw = geometry?.bounds?.southwest;
    if (typeof ne?.latitude === 'number' && typeof sw?.latitude === 'number' && ne.latitude < sw.latitude) {
      errors.push(`${where}.address[${i}] geo bounds northeast.latitude ${ne.latitude} is south of southwest.latitude ${sw.latitude}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// DR Person (core Person)
// ---------------------------------------------------------------------------
export function checkPersonRules(person, where = 'record') {
  if (!isObject(person)) return [`${where} must be an object`];
  const errors = checkDates(person, ['birth_date', 'date_of_birth', 'death_date', 'registration_date', 'last_updated'], where);

  const birthField = present(person.birth_date) ? 'birth_date' : 'date_of_birth';
  const birth = validDay(person[birthField]);
  const death = validDay(person.death_date);
  const registration = validDay(person.registration_date);
  if (birth && death && death < birth) errors.push(`${where}.death_date ${death} is before ${birthField} ${birth}`);
  if (birth && registration && registration < birth) errors.push(`${where}.registration_date ${registration} is before ${birthField} ${birth}`);
  // birth_date and its spec alias date_of_birth must agree when both are sent.
  const alias = validDay(person.date_of_birth);
  if (validDay(person.birth_date) && alias && alias !== validDay(person.birth_date)) {
    errors.push(`${where}.date_of_birth ${alias} contradicts birth_date ${validDay(person.birth_date)}`);
  }
  // sex and its spec alias gender must agree when both are sent.
  if (typeof person.sex === 'string' && typeof person.gender === 'string' && person.sex !== person.gender) {
    errors.push(`${where}.gender "${person.gender}" contradicts sex "${person.sex}"`);
  }
  errors.push(...checkUpdatedAfterRegistration(person, where));
  errors.push(...checkDuplicateIdentifiers(person.identifier, `${where}.identifier`));
  errors.push(...checkAddresses(person.address, where));
  return errors;
}

// ---------------------------------------------------------------------------
// DR Member (core Member)
// ---------------------------------------------------------------------------
const personKeys = (person) => idKeys(person?.identifier);
const memberKeys = (member) => [...idKeys(member?.member_identifier), ...personKeys(member?.demographic_info)];

const birthOf = (member) => validDay(member?.demographic_info?.birth_date) || validDay(member?.birth_date) || validDay(member?.date_of_birth);

export function checkMemberRules(member, where = 'record') {
  if (!isObject(member)) return [`${where} must be an object`];
  const errors = checkDates(member, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(member, where));
  errors.push(...checkDuplicateIdentifiers(member.member_identifier, `${where}.member_identifier`));

  const person = member.demographic_info;
  if (isObject(person)) {
    errors.push(...checkPersonRules(person, `${where}.demographic_info`));
    const birth = validDay(person.birth_date);
    const registration = validDay(member.registration_date);
    if (birth && registration && registration < birth) {
      errors.push(`${where}.registration_date ${registration} is before demographic_info.birth_date ${birth}`);
    }
  }

  for (const [i, info] of asList(member.disability_info).entries()) {
    if (isObject(info) && !present(info.disability_limitation_type) && present(info.functional_severity)) {
      errors.push(`${where}.disability_info[${i}] gives a functional_severity without the disability_limitation_type it applies to`);
    }
  }

  // A member cannot be related to itself, except with the relationship SELF.
  const own = memberKeys(member);
  for (const [i, related] of asList(member.related_person).entries()) {
    if (!isObject(related)) continue;
    const other = isObject(related.related_member)
      ? [...memberKeys(related.related_member), ...personKeys(related.related_member)] : [];
    const self = other.find((k) => own.includes(k));
    if (self && related.relationship_type !== 'SELF') {
      errors.push(`${where}.related_person[${i}] relates the member to itself (${self}) with relationship_type "${related.relationship_type}"`);
    }
    if (isObject(related.related_member)) {
      errors.push(...checkPersonRules(related.related_member, `${where}.related_person[${i}].related_member`));
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// DR Group (core Group)
// ---------------------------------------------------------------------------
export function checkGroupRules(group, where = 'record') {
  if (!isObject(group)) return [`${where} must be an object`];
  const errors = checkDates(group, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(group, where));
  errors.push(...checkDuplicateIdentifiers(group.group_identifier, `${where}.group_identifier`));
  errors.push(...checkAddresses(group.address, where));
  for (const field of ['geographical_location', 'place']) errors.push(...checkPlace(group[field], `${where}.${field}`));

  // place_address says which location applies: place (1) or address (0). The chosen one must be sent.
  const hasPlace = present(group.geographical_location) || present(group.place);
  if (isTrue(group.place_address) && !hasPlace) errors.push(`${where}.place_address is 1 (use place) but no geographical_location is given`);
  if (isFalse(group.place_address) && !present(group.address)) errors.push(`${where}.place_address is 0 (use address) but no address is given`);

  const membersList = Array.isArray(group.member_list) ? group.member_list : [];
  membersList.forEach((m, i) => errors.push(...checkMemberRules(m, `${where}.member_list[${i}]`)));
  if (isObject(group.group_head_info)) errors.push(...checkMemberRules(group.group_head_info, `${where}.group_head_info`));

  // group_size is the total number of members: the list cannot hold more.
  if (Number.isInteger(group.group_size) && membersList.length > group.group_size) {
    errors.push(`${where}.member_list has ${membersList.length} members, more than group_size ${group.group_size}`);
  }
  // A member must not be listed twice.
  const seen = new Map();
  membersList.forEach((m, i) => {
    for (const key of idKeys(m?.member_identifier)) {
      if (seen.has(key)) errors.push(`${where}.member_list[${i}] repeats member ${key} of member_list[${seen.get(key)}]`);
      else seen.set(key, i);
    }
  });
  // The head of the group must be one of the listed members (when both are identifiable).
  const headKeys = memberKeys(group.group_head_info);
  const listedKeys = membersList.flatMap(memberKeys);
  if (headKeys.length && listedKeys.length && !headKeys.some((k) => listedKeys.includes(k))) {
    errors.push(`${where}.group_head_info (${headKeys[0]}) is not one of the members in member_list`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// DO.DR.03-DO.DR.08 DisabilitySupport
// ---------------------------------------------------------------------------
const SUPPORT_LISTS = ['assistive_technology', 'housing_support', 'medical_care', 'animal_assistance'];

// Keys identifying a caregiver: a Person (identifier list), a Member, or { id, identifier } strings.
const caregiverKeys = (caregiver) => {
  if (!isObject(caregiver)) return [];
  const keys = [...memberKeys(caregiver), ...personKeys(caregiver)];
  if (typeof caregiver.identifier === 'string') keys.push(`*|${caregiver.identifier}`);
  return keys;
};
const valueOfKey = (key) => key.split('|')[1];

function checkHumanAssistance(assistance, where, ownKeys) {
  if (!isObject(assistance)) return [];
  const errors = checkDates(assistance, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(assistance, where));

  // frequency / intensity and support_status / support are two namings of the same attribute.
  const frequency = drCodeOf('supportFrequency', assistance.frequency);
  const intensity = drCodeOf('supportFrequency', assistance.intensity);
  if (frequency && intensity && frequency !== intensity) {
    errors.push(`${where}.frequency "${assistance.frequency}" contradicts intensity "${assistance.intensity}"`);
  }
  const statusField = present(assistance.support_status) ? 'support_status' : 'support';
  const status = drCodeOf('supportStatus', assistance.support_status) ?? drCodeOf('supportStatus', assistance.support);
  const other = drCodeOf('supportStatus', assistance.support);
  if (status && other && status !== other) {
    errors.push(`${where}.support_status "${assistance.support_status}" contradicts support "${assistance.support}"`);
  }
  // SupportFrequency "None" means no support is needed.
  const frequencyField = present(assistance.frequency) ? 'frequency' : 'intensity';
  if ((frequency ?? intensity) === '5' && status === '0') {
    errors.push(`${where}.${frequencyField} is "None" (support not needed) but ${statusField} is "Needed"`);
  }

  const caregiver = assistance.caregiver;
  if (isObject(caregiver)) {
    errors.push(...checkPersonRules(caregiver, `${where}.caregiver`));
    // A person with disability is not their own caregiver.
    const self = caregiverKeys(caregiver).find((k) => (k.startsWith('*|')
      ? ownKeys.some((o) => valueOfKey(o) === valueOfKey(k))
      : ownKeys.includes(k)));
    if (self) errors.push(`${where}.caregiver is the person with disability themselves (${self.replace(/^\*\|/, '')})`);
  }
  if (present(assistance.relationship) && !present(caregiver)) {
    errors.push(`${where}.relationship "${assistance.relationship}" is given without the caregiver it describes`);
  }
  return errors;
}

export function checkSupportRules(support, where = 'record', ownKeys = []) {
  if (!isObject(support)) return [`${where} must be an object`];
  const errors = checkDates(support, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(support, where));
  const assistance = support.human_assistance;
  if (Array.isArray(assistance)) assistance.forEach((a, i) => errors.push(...checkHumanAssistance(a, `${where}.human_assistance[${i}]`, ownKeys)));
  else errors.push(...checkHumanAssistance(assistance, `${where}.human_assistance`, ownKeys));

  for (const list of SUPPORT_LISTS) {
    const items = Array.isArray(support[list]) ? support[list] : [];
    items.forEach((item, i) => {
      if (!isObject(item)) return;
      errors.push(...checkDates(item, ['registration_date', 'last_updated'], `${where}.${list}[${i}]`));
      errors.push(...checkUpdatedAfterRegistration(item, `${where}.${list}[${i}]`));
    });
    // The same kind of support is registered once.
    const kinds = items.map((item) => (isObject(item) ? drCodeOf(list.replace(/_(\w)/g, (_, c) => c.toUpperCase()), item.type) : undefined));
    kinds.forEach((kind, i) => {
      if (kind !== undefined && kinds.indexOf(kind) !== i) errors.push(`${where}.${list}[${i}] repeats the support type "${items[i].type}" of ${list}[${kinds.indexOf(kind)}]`);
    });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// DO.DR.01 PWDPerson
// ---------------------------------------------------------------------------
const BIRTH_CAUSES = ['0', '1']; // Birth congenital, Birth complication
const BORN_WITH = '0';
const AGEING = '8';
const OLD_AGE = '3';
const APPROVED = '0';

// Keys identifying the person behind personal_details (a Member, or person attributes).
const pwdKeys = (pwd) => [...memberKeys(pwd?.personal_details), ...personKeys(pwd?.personal_details)];

function checkPersonalDetails(details, where) {
  if (!isObject(details)) return [];
  // A Member (member rules) that may also carry the person attributes directly (person rules).
  const errors = checkMemberRules(details, where);
  const flat = Object.fromEntries(['identifier', 'birth_date', 'date_of_birth', 'death_date', 'sex', 'gender', 'address']
    .filter((k) => details[k] !== undefined).map((k) => [k, details[k]]));
  if (Object.keys(flat).length) {
    // registration_date / last_updated are already checked as member attributes.
    errors.push(...checkPersonRules(flat, where));
    const birth = validDay(details.birth_date) || validDay(details.date_of_birth);
    const registration = validDay(details.registration_date);
    if (birth && registration && registration < birth) {
      errors.push(`${where}.registration_date ${registration} is before the birth date ${birth}`);
    }
  }
  return errors;
}

export function checkPwdRules(pwd, where = 'record') {
  if (!isObject(pwd)) return [`${where} must be an object`];
  const errors = checkDates(pwd, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(pwd, where));

  const details = pwd.personal_details;
  errors.push(...checkPersonalDetails(details, `${where}.personal_details`));
  const birth = birthOf(details);
  const registration = validDay(pwd.registration_date);
  if (birth && registration && registration < birth) {
    errors.push(`${where}.registration_date ${registration} is before the birth date ${birth} of the person`);
  }

  // disability_status_level (data standard) and disability_level (spec) name the same attribute.
  const level = drCodeOf('disabilityLevel', pwd.disability_status_level);
  const levelAlias = drCodeOf('disabilityLevel', pwd.disability_level);
  if (level && levelAlias && level !== levelAlias) {
    errors.push(`${where}.disability_level "${pwd.disability_level}" contradicts disability_status_level "${pwd.disability_status_level}"`);
  }

  // An approved disability contradicts a member flagged as not disabled.
  const status = drCodeOf('disabilityStatus', pwd.disability_status);
  if (status === APPROVED && isObject(details) && isFalse(details.is_disabled)) {
    errors.push(`${where}.disability_status is "Approved" but personal_details.is_disabled is ${JSON.stringify(details.is_disabled)}`);
  }

  // DisabilityDetails: each impairment once; the cause must fit the age of onset.
  const impairments = Array.isArray(pwd.disability_details) ? pwd.disability_details : [];
  const types = impairments.map((d) => (isObject(d) ? drCodeOf('impairmentType', d.impairment_type) : undefined));
  impairments.forEach((d, i) => {
    if (!isObject(d)) return;
    const at = `${where}.disability_details[${i}]`;
    if (types[i] !== undefined && types.indexOf(types[i]) !== i) {
      errors.push(`${at} repeats the impairment_type "${d.impairment_type}" of disability_details[${types.indexOf(types[i])}]`);
    }
    const cause = drCodeOf('impairmentCause', d.impairment_cause);
    const onset = drCodeOf('disabilityOnSet', d.age_on_set);
    if (BIRTH_CAUSES.includes(cause) && onset !== undefined && onset !== BORN_WITH) {
      errors.push(`${at}.impairment_cause "${d.impairment_cause}" is a birth cause but age_on_set is "${d.age_on_set}", not "Born With"`);
    }
    if (cause === AGEING && onset !== undefined && onset !== OLD_AGE) {
      errors.push(`${at}.impairment_cause "${d.impairment_cause}" (ageing) requires age_on_set "Old age", not "${d.age_on_set}"`);
    }
    if (onset === BORN_WITH && cause !== undefined && !BIRTH_CAUSES.includes(cause)) {
      errors.push(`${at}.age_on_set "${d.age_on_set}" (born with) contradicts impairment_cause "${d.impairment_cause}"`);
    }
  });

  const own = pwdKeys(pwd);
  (Array.isArray(pwd.disability_support) ? pwd.disability_support : [])
    .forEach((s, i) => errors.push(...checkSupportRules(s, `${where}.disability_support[${i}]`, own)));

  // A programme enrolment is listed once.
  const programmes = [...asList(pwd.programs_enrolments), ...asList(pwd.programs_enrollments)].flat();
  const programmeIds = programmes.map((p) => (isObject(p) ? p.programme_identifier : undefined));
  programmeIds.forEach((pid, i) => {
    if (typeof pid === 'string' && programmeIds.indexOf(pid) !== i) errors.push(`${where} lists the programme "${pid}" twice`);
  });
  return errors;
}

// get-disability-support record: { personal_details?, disabilities: [DisabilitySupport] }.
export function checkSupportRecordRules(record, where = 'record') {
  if (!isObject(record)) return [`${where} must be an object`];
  const errors = checkPersonalDetails(record.personal_details, `${where}.personal_details`);
  const own = pwdKeys(record);
  (Array.isArray(record.disabilities) ? record.disabilities : [])
    .forEach((s, i) => errors.push(...checkSupportRules(s, `${where}.disabilities[${i}]`, own)));
  return errors;
}

const rulesByType = {
  PWDPerson: checkPwdRules,
  DRPerson: checkPersonRules,
  Member: checkMemberRules,
  Group: checkGroupRules,
  SupportRecord: checkSupportRecordRules,
  DisabilitySupport: checkSupportRules,
};

export function checkRecordRules(type, record, where = 'record') {
  return rulesByType[type](record, where);
}

// Schema + rules for one record of the given type.
export function validateRecord(type, record, where = 'record') {
  const { errors } = validateSchema(type, record);
  return [...errors.map((e) => where + e.replace(/^\(root\)/, '')), ...checkRecordRules(type, record, where)];
}

const recordsOf = (regRecords) => {
  if (Array.isArray(regRecords)) return regRecords;
  if (isObject(regRecords)) return [regRecords];
  return [];
};

// Response kinds whose records are not typed by reg_record_type.
const recordTypeByKind = {
  'get-disability-support-response': 'SupportRecord',
  'get-disability-details-response': 'PWDPerson',
};

// Extracts every DR record from any message (search results, notifications, txn status,
// disability support and details), with the record type it must conform to. Without a
// reg_record_type, reg_records are persons with disability (DisabledPerson in the spec).
export function extractRecords(message, kind) {
  const out = [];
  if (!isObject(message)) return out;
  const fixedType = recordTypeByKind[kind];
  const fromItems = (items, path) => (Array.isArray(items) ? items : []).forEach((item, i) => {
    const data = item?.data;
    if (!isObject(data)) return;
    const type = fixedType || (data.reg_record_type === undefined ? 'PWDPerson' : recordTypeOf(data.reg_record_type));
    if (!type) return; // unknown record types are reported by the schema
    recordsOf(data.reg_records).forEach((record, j) => out.push({ type, record, where: `${path}[${i}].data.reg_records[${j}]` }));
  });
  fromItems(message.search_response, 'message.search_response');
  fromItems(message.notify_event, 'message.notify_event');
  fromItems(message.txnstatus_response?.txn_status?.search_response, 'message.txnstatus_response.txn_status.search_response');
  return out;
}

// ---------------------------------------------------------------------------
// Message-level rules
// ---------------------------------------------------------------------------

// Rules on a callback header (sync responses and async callbacks).
export function checkCallbackHeaderRules(header) {
  const errors = [];
  if (!header) return errors;
  if (Number.isInteger(header.total_count) && Number.isInteger(header.completed_count) && header.completed_count > header.total_count) {
    errors.push(`header.completed_count ${header.completed_count} is greater than header.total_count ${header.total_count}`);
  }
  if (header.status === 'rjct' && !header.status_reason_code) {
    errors.push('header.status is "rjct" but no header.status_reason_code explains the rejection');
  }
  return errors;
}

// The record type a search_request item asks for (reg_record_type, else response_entity, else
// persons with disability).
export function requestedRecordType(requestItem) {
  const criteria = requestItem?.search_criteria;
  return recordTypeOf(criteria?.reg_record_type) || recordTypeOf(criteria?.response_entity) || 'PWDPerson';
}

// Rules on a search result item, optionally against the original search_request item.
export function checkSearchResponseItem(item, where, requestItem) {
  const errors = [];
  if (!item || typeof item !== 'object') return errors;
  if (item.status === 'succ' && !item.data) errors.push(`${where}.status is "succ" but no data is returned`);
  if (item.status === 'rjct' && !item.status_reason_code) errors.push(`${where}.status is "rjct" but no status_reason_code is given`);
  if (item.status === 'rjct' && item.data && recordsOf(item.data.reg_records).length) {
    errors.push(`${where}.status is "rjct" but records are returned`);
  }
  const count = recordsOf(item.data?.reg_records).length;
  const p = item.pagination;
  if (p && Number.isInteger(p.page_size) && count > p.page_size) {
    errors.push(`${where} returns ${count} records, more than pagination.page_size ${p.page_size}`);
  }
  if (p && Number.isInteger(p.total_count) && Number.isInteger(p.page_size) && Number.isInteger(p.page_number)
      && count > Math.max(0, p.total_count - (p.page_number - 1) * p.page_size)) {
    errors.push(`${where} returns ${count} records, more than pagination.total_count ${p.total_count} allows on page ${p.page_number}`);
  }
  if (!requestItem) return errors;
  const requested = requestItem.search_criteria?.pagination;
  if (requested && p) {
    if (Number.isInteger(requested.page_size) && p.page_size > requested.page_size) {
      errors.push(`${where}.pagination.page_size ${p.page_size} exceeds the requested page_size ${requested.page_size}`);
    }
    const askedPage = requested.page_number ?? 1;
    if (p.page_number !== askedPage) errors.push(`${where}.pagination.page_number ${p.page_number} is not the requested page ${askedPage}`);
  }
  // The records returned must be of the record type that was asked for.
  const asked = requestedRecordType(requestItem);
  const returned = item.data?.reg_record_type;
  if (count && returned !== undefined && recordTypeOf(returned) !== asked) {
    errors.push(`${where}.data.reg_record_type "${returned}" is not the requested record type ${asked}`);
  }
  if (asked !== 'PWDPerson' && count && returned === undefined) {
    errors.push(`${where}.data.reg_record_type is missing: ${asked} records were requested and untyped reg_records are DisabledPerson records`);
  }
  return errors;
}

// Correlates a SearchResponse with the SearchRequest it answers.
export function checkSearchCorrelation(requestMessage, responseMessage, where = 'message') {
  const errors = [];
  if (!requestMessage || !responseMessage) return errors;
  if (responseMessage.transaction_id !== requestMessage.transaction_id) {
    errors.push(`${where}.transaction_id "${responseMessage.transaction_id}" does not echo the request transaction_id "${requestMessage.transaction_id}"`);
  }
  const requestItems = requestMessage.search_request || [];
  const byRef = Object.fromEntries(requestItems.map((r) => [r.reference_id, r]));
  const items = responseMessage.search_response || [];
  items.forEach((item, i) => {
    if (!(item.reference_id in byRef)) errors.push(`${where}.search_response[${i}].reference_id "${item.reference_id}" was not part of the request`);
    errors.push(...checkSearchResponseItem(item, `${where}.search_response[${i}]`, byRef[item.reference_id]));
  });
  const answered = new Set(items.map((i) => i.reference_id));
  for (const r of requestItems) {
    if (!answered.has(r.reference_id)) errors.push(`${where}: request reference_id "${r.reference_id}" has no search_response`);
  }
  return errors;
}

function checkFrequency(frequency, where) {
  if (!frequency?.start_time || !frequency?.end_time) return [];
  const start = Date.parse(frequency.start_time);
  const end = Date.parse(frequency.end_time);
  return !Number.isNaN(start) && !Number.isNaN(end) && end < start
    ? [`${where}.end_time ${frequency.end_time} is before start_time ${frequency.start_time}`]
    : [];
}

const CALLBACK_KINDS = [
  'on-search', 'notify', 'txn-on-status', 'sync-search-response',
  'get-disability-support-response', 'get-disability-details-response', 'disabled-response',
];

const echoTransaction = (message, request) => (request?.message && message.transaction_id !== request.message.transaction_id
  ? [`[rule] message.transaction_id "${message.transaction_id}" does not echo the request transaction_id "${request.message.transaction_id}"`]
  : []);

// Full validation of a received message of the given kind. Returns a list of errors.
export function validateMessage(kind, body, request) {
  const errors = validateSchema(kind, body).errors.map((e) => `[schema] ${e}`);
  if (!body || typeof body !== 'object') return errors;

  const header = body.header;
  const message = body.message;
  const encrypted = header?.is_msg_encrypted === true;

  if (CALLBACK_KINDS.includes(kind)) {
    errors.push(...checkCallbackHeaderRules(header).map((e) => `[rule] ${e}`));
    if (header?.status === 'succ' && !message) errors.push('[rule] header.status is "succ" but no message is returned');
  }
  if (encrypted || !message) return errors;

  // Search results
  if (['on-search', 'sync-search-response'].includes(kind)) {
    if (request?.message) errors.push(...checkSearchCorrelation(request.message, message).map((e) => `[rule] ${e}`));
    else (message.search_response || []).forEach((item, i) => errors.push(...checkSearchResponseItem(item, `message.search_response[${i}]`).map((e) => `[rule] ${e}`)));
  }
  // Disability support and details: one result item per request.
  if (['get-disability-support-response', 'get-disability-details-response'].includes(kind)) {
    errors.push(...echoTransaction(message, request));
    (message.search_response || []).forEach((item, i) => {
      const at = `message.search_response[${i}]`;
      if (item.status === 'succ' && !item.data) errors.push(`[rule] ${at}.status is "succ" but no data is returned`);
      if (item.status === 'rjct' && !item.status_reason_code) errors.push(`[rule] ${at}.status is "rjct" but no status_reason_code is given`);
      if (item.status === 'rjct' && recordsOf(item.data?.reg_records).length) errors.push(`[rule] ${at}.status is "rjct" but records are returned`);
    });
  }
  if (kind === 'disabled-response') {
    errors.push(...echoTransaction(message, request));
    (message.disabled_response || []).forEach((item, i) => {
      if (item.status === 'rjct' && !item.status_reason_message) {
        errors.push(`[rule] message.disabled_response[${i}].status is "rjct" but no status_reason_message explains it`);
      }
    });
  }
  if (kind === 'txn-on-status') {
    const r = message.txnstatus_response;
    errors.push(...echoTransaction(message, request));
    const askedType = request?.message?.txnstatus_request?.txn_type;
    if (askedType && r?.txn_type && r.txn_type !== askedType) {
      errors.push(`[rule] txnstatus_response.txn_type "${r.txn_type}" does not match the requested txn_type "${askedType}"`);
    }
    (r?.txn_status?.search_response || []).forEach((item, i) => errors.push(...checkSearchResponseItem(item, `message.txnstatus_response.txn_status.search_response[${i}]`).map((e) => `[rule] ${e}`)));
    if (r?.txn_type === 'unsubscribe' && r.txn_status?.status === 'rjct' && !r.txn_status.status_reason_code) {
      errors.push('[rule] txnstatus_response.txn_status.status is "rjct" but no status_reason_code is given');
    }
  }
  if (['on-subscribe', 'on-unsubscribe'].includes(kind)) errors.push(...echoTransaction(message, request));
  if (kind === 'on-subscribe') {
    (message.subscribe_response || []).forEach((item, i) => {
      if (item.status === 'rjct' && !item.status_reason_code) errors.push(`[rule] message.subscribe_response[${i}].status is "rjct" but no status_reason_code is given`);
      if (item.status === 'succ' && !(item.subscriptions || []).length) errors.push(`[rule] message.subscribe_response[${i}].status is "succ" but no subscription code is returned`);
      (item.subscriptions || []).forEach((s, j) => errors.push(...checkFrequency(s.frequency, `message.subscribe_response[${i}].subscriptions[${j}].frequency`).map((e) => `[rule] ${e}`)));
    });
  }
  if (kind === 'subscribe') {
    (message.subscribe_request || []).forEach((item, i) => errors.push(...checkFrequency(item?.subscribe_criteria?.frequency, `message.subscribe_request[${i}].subscribe_criteria.frequency`).map((e) => `[rule] ${e}`)));
  }
  if (kind === 'on-unsubscribe' && message.status === 'rjct' && !message.status_reason_code) {
    errors.push('[rule] message.status is "rjct" but no status_reason_code is given');
  }

  // DR data, wherever it appears.
  for (const { type, record, where } of extractRecords(message, kind)) {
    errors.push(...checkRecordRules(type, record, where).map((e) => `[data] ${e}`));
  }
  return errors;
}

export function formatErrors(errors) {
  return errors.map((e) => `  - ${e}`).join('\n');
}
