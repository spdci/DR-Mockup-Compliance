// JSON Schemas (draft-07) for the DCI Disability Registry (DR) API v1.0.0.
//
// Sources:
//  - api-standards/release/yaml/dr_api_v1.0.0.yaml and the schemas it references
//    (registry/dr/*, extensions/dr/*, common/schema/*)
//  - DCI Disability Registry v1.0.0 data standard: DO.DR.01 PWDPerson, DO.DR.02 DisabilityDetails,
//    DO.DR.03 DisabilitySupport, DO.DR.04 HumanAssistance, DO.DR.05 AssistiveTechnology,
//    DO.DR.06 MedicalCare, DO.DR.07 HousingSupport, DO.DR.08 AnimalAssistance, Member, and the
//    code directory CD.DR.01-CD.DR.15
//  - schemas/extensions/dr/v1/{data,code} (PWDPerson, DRPerson, Member, Group and every DR code
//    list), schemas/core/v1/{data,code} (Person, Member, Group, Name, Identifier, Address, Place,
//    RelatedPerson, DisabilityInfo and the core code lists) and schemas/extensions/ibr/v1/data
//    (Programme, referenced by PWDPerson.programs_enrolments)
//
// Every DR data attribute is optional. The schemas therefore never require them, but whenever an
// attribute IS present its type, format, code list and structure are enforced. Registry
// extensions (extra attributes) are allowed.
//
// The same definitions are embedded in the Mockoon mocks (valid_json_schema rules), so they
// deliberately use only draft-07 keywords and ajv-formats formats (no custom ones).

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------
const DATE = '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])';
const TIME = '([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d(\\.\\d+)?)?';
const TZ = '(Z|[+-]([01]\\d|2[0-3]):?[0-5]\\d)';
// ISO 8601 calendar date, optionally with time and timezone (DCI DateTime, e.g. "1990-05-15T00:00:00Z").
export const ISO_DATE_PATTERN = `^${DATE}(T${TIME}${TZ}?)?$`;
// E.164 phone number.
export const E164_PATTERN = '^\\+[1-9]\\d{1,14}$';
// ISO 639-3 language code, as required by the spec's `locale`.
export const LOCALE_PATTERN = '^[a-z]{3}$';
// Member.language_code: ISO 639 code (LanguageCodeEnum uses "en").
export const LANGUAGE_CODE_PATTERN = '^[a-z]{2,3}$';
// ISO 3166-1 alpha-2 / alpha-3 country code.
export const COUNTRY_CODE_PATTERN = '^[A-Z]{2,3}$';
// Open Location Code (plus code), full or padded.
export const PLUS_CODE_PATTERN = '^[23456789CFGHJMPQRVWX0]{2,8}\\+[23456789CFGHJMPQRVWX]{0,3}$';
// Decimal number sent as a string (schema:GeoCoordinates accepts Number or Text).
export const DECIMAL_STRING_PATTERN = '^-?\\d{1,3}(\\.\\d+)?$';

// DR record types (RegistryRecordType), bare or namespaced ("spdci-extensions-dci:DisabledPerson").
const NS = '^([A-Za-z0-9_.-]+:)*';
export const PWD_RECORD_TYPE_PATTERN = `${NS}(PWDPerson|PWD_Person|DisabledPerson)$`;
export const PERSON_RECORD_TYPE_PATTERN = `${NS}(DRPerson|DR_Person|Person)$`;
export const MEMBER_RECORD_TYPE_PATTERN = `${NS}Member$`;
export const GROUP_RECORD_TYPE_PATTERN = `${NS}Group$`;
export const RECORD_TYPE_PATTERN = `${NS}(PWDPerson|PWD_Person|DisabledPerson|DRPerson|DR_Person|Person|Member|Group)$`;
// DR registry events (registry/dr/RegistryEventType.yaml: enum [register]), bare ("register") or
// namespaced ("spdci-common:RegistryEventType:register").
export const DR_EVENT_PATTERN = `${NS}register$`;

// ---------------------------------------------------------------------------
// Code lists
// ---------------------------------------------------------------------------
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

// DR code directory (schemas/extensions/dr/v1/code): code -> published label(s). The DR API
// examples exchange the labels ("Approved", "Working age", "Adaptable vehical") while the code
// directory numbers them; both the code and the label are accepted, exactly as published.
export const drCodeLists = {
  impairmentType: { // CD.DR.01 ImpairmentType
    1: ['Vision'], 2: ['Hearing'], 3: ['Mobility'], 4: ['Cognitive'], 5: ['Speech'], 6: ['Mental'],
  },
  impairmentLevel: { // CD.DR.02 ImpairmentLevel
    1: ['Mild'], 2: ['Moderate'], 3: ['Severe'], 4: ['Extreme'],
  },
  humanAssistanceType: { // CD.DR.03 HumanAssistanceType
    basic_activity: ['Basic Activity'], mobility: ['mobility'], communication: ['Communication'],
    decision_making: ['Decision Making'], multiple: ['Multiple'],
  },
  supportFrequency: { // CD.DR.04 SupportFrequency
    1: ['Permanent'], 2: ['Daily'], 3: ['Weekly'], 4: ['Occasional'], 5: ['None'],
  },
  supportStatus: { // CD.DR.05 SupportStatusEnum
    0: ['Needed'], 1: ['Received'],
  },
  assistiveTechnology: { // CD.DR.06 AssistiveTechnologyEnum
    1: ['Wheelchairs'], 2: ['Speech-generating devices (SGDs)'], 3: ['Hearing aids'],
  },
  disabilityOnSet: { // CD.DR.07 DisabilityOnSet
    0: ['Born With'], 1: ['Childhood'], 2: ['Working age'], 3: ['Old age'],
  },
  impairmentCause: { // CD.DR.08 ImpairmentCause
    0: ['Birth congenital'], 1: ['Birth complication'], 2: ['Illness'], 3: ['Domestic accident'],
    4: ['Road accident'], 5: ['Work accident'], 6: ['Violence'], 7: ['Armed conflict'], 8: ['Ageing'],
  },
  transportRequirement: { // CD.DR.09 TransportRequirement
    0: ['Public transportation'], 1: ['Point to point transportation'], 2: ['Adaptable vehical'],
  },
  housingType: { // CD.DR.10 HousingType (published with a typographic apostrophe)
    1: ['Own home/rent'], 2: ['Living in relatives’ home', "Living in relatives' home"], 3: ['Social housing'],
    4: ['Care institution'],
  },
  medicalCare: { // CD.DR.11 MedicalCareEnum
    maintenance_medicine: ['Maintenance medicine'], specialized_habitation: ['Specialized habitation'],
    constant_healthcare: ['Constant healthcare'],
  },
  housingSupport: { // CD.DR.12 HousingSupportEnum
    home_adaptation: ['Home Adaptation'], relocation: ['Relocation'], utility_cost: ['Utility cost'],
  },
  animalAssistance: { // CD.DR.13 AnimalAssistanceEnum
    service_dog: ['Service Dog'], therapy_animal: ['Therapy Animal'], other: ['Other'],
  },
  disabilityStatus: { // CD.DR.14 DisabilityStatusEnum
    0: ['Approved'], 1: ['Pending'], 2: ['Expired'],
  },
  disabilityLevel: { // CD.DR.15 DisabilityLevelEnum
    1: ['High Support Needs (sometimes called very severe or profound)', 'High Support Needs'],
    2: ['Severe'], 3: ['Moderate'], 4: ['Mild'],
  },
};

export const codes = {
  // ----- DR code directory: codes and labels (e.g. codes.impairmentType, codes.impairmentTypeLabel) -----
  ...Object.fromEntries(Object.entries(drCodeLists).flatMap(([name, list]) => [
    [name, Object.keys(list)],
    [`${name}Label`, Object.values(list).flat()],
  ])),

  // ----- core code directory -----
  identifierType: ['UIN', 'BRN', 'MRN', 'DRN'], // IdentifierTypeEnum
  sex: ['male', 'female', 'other', 'unknown'], // SexCategoryEnum
  maritalStatus: ['S', 'M', 'W', 'A', 'D', 'L', 'U'], // MaritalStatusEnum
  employmentStatus: range(1, 8), // EmploymentStatusEnum
  occupation: range(0, 9), // OccupationEnum, ISCO-08 level 1
  educationLevel: range(0, 8), // EducationCodeEnum, ISCED 2011
  groupType: range(1, 3), // AssistanceUnitEnum: 1 Member, 2 Household, 3 Family
  functionalType: ['VIS_SS', 'HEAR_SS', 'MOB_SS', 'COG_SS', 'SC_SS', 'COM_SS'], // FunctionalLimitationType (WG-SS)
  functionalSeverity: range(1, 4), // FunctionalSeverityEnum
  relationshipType: [ // RelationshipTypeEnum (HL7 v3 RoleCode personal relationships)
    'SELF', 'PRIMSPOUS', 'FAMMEMB',
    'CHILD', 'CHILDADOPT', 'DAUADOPT', 'SONADOPT', 'CHILDFOST', 'DAUFOST', 'SONFOST', 'DAUC', 'DAU',
    'STPDAU', 'NCHILD', 'SON', 'SONC', 'STPSON', 'STPCHILD',
    'EXT', 'AUNT', 'MAUNT', 'PAUNT', 'COUSN', 'MCOUSN', 'PCOUSN',
    'GGRPRN', 'GGRFTH', 'MGGRFTH', 'PGGRFTH', 'GGRMTH', 'MGGRMTH', 'PGGRMTH', 'MGGRPRN', 'PGGRPRN',
    'GRNDCHILD', 'GRNDDAU', 'GRNDSON', 'GRPRN', 'GRFTH', 'MGRFTH', 'PGRFTH', 'GRMTH', 'PGRMTH', 'MGRMTH',
    'PGRPRN', 'MGRPRN',
    'INLAW', 'CHLDINLAW', 'DAUINLAW', 'SONINLAW', 'PRNINLAW', 'FTHINLAW', 'MTHINLAW', 'SIBINLAW',
    'BROINLAW', 'SISINLAW',
    'NIENEPH', 'NEPHEW', 'NEICE', 'UNCLE', 'PUNCLE', 'MUNCLE',
    'PRN', 'ADOPTP', 'ADOPTF', 'ADOPTM', 'FTH', 'FTHFOST', 'NFTH', 'NFTHF', 'STPFTH',
    'MTH', 'GESTM', 'FOSTMTH', 'NMTH', 'NMTHF', 'STPMTH', 'NPRN', 'PRNFOST', 'STPPRN',
    'SIB', 'BRO', 'HBRO', 'NBRO', 'TWINBRO', 'FTWINBRO', 'ITWINBRO', 'STPBRO', 'HSIB', 'HSIS', 'NSIB',
    'NSIS', 'TWINSIS', 'FTWINSIS', 'ITWINSIS', 'TWIN', 'FTWIN', 'ITWIN', 'SIS', 'STPSIS', 'STPSIB',
    'SIGOTHR', 'DOMPART', 'FRMSPS', 'SPS', 'HUSB', 'WIFE',
  ],
  // IBR Programme code lists (Programme.jsonld, CD.IBR.03-CD.IBR.07).
  institutionType: range(1, 8),
  legalStatus: range(1, 3),
  socialProtectionFunction: range(1, 15),
  contributionType: range(1, 3),
  programmeType: range(1, 14),

  // ----- API -----
  drEvent: ['register'],
  recordType: ['PWDPerson', 'DRPerson', 'Member', 'Group'],
  requestStatus: ['rcvd', 'pdng', 'succ', 'rjct'],
  ackStatus: ['ACK', 'NACK', 'ERR'],
  queryType: ['idtype-value', 'expression', 'predicate', 'graphql'], // common/QueryType.yaml
  operator: ['gt', 'lt', 'eq', 'ge', 'le', 'in'],
  condition: ['and', 'or', 'not'],
  sortOrder: ['asc', 'desc'],
  txnType: ['search', 'subscribe', 'unsubscribe'],
  attributeType: ['transaction_id', 'reference_id_list', 'correlation_id', 'subscription_code_list'],
  subscriptionStatus: ['subscribe', 'unsubscribe'],
  disabledStatus: ['yes', 'no'],
  searchStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.search_criteria.invalid', 'rjct.filter.invalid', 'rjct.sort.invalid',
    'rjct.pagination.invalid', 'rjct.search.too_many_records_found',
  ],
  subscribeStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.notify_types.invalid', 'rjct.notify_details.invalid', 'rjct.person_id.invalid',
    'rjct.event.already_subscribed',
  ],
  unsubscribeStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.subscription_code.invalid', 'rjct.requester.invalid', 'rjct.event.already_unsubscribed',
  ],
  headerStatusReasonCode: [
    'rjct.version.invalid', 'rjct.message_id.duplicate', 'rjct.message_ts.invalid',
    'rjct.action.invalid', 'rjct.action.not_supported', 'rjct.total_count.invalid',
    'rjct.total_count.limit_exceeded', 'rjct.errors.too_many',
  ],
  errorCode: [
    'err.request.bad', 'err.request.unauthorized', 'err.request.forbidden', 'err.request.not_found',
    'err.request.timeout', 'err.version.not_supported', 'err.request.too_many_requests',
    'err.sender_id.invalid', 'err.sender_uri.invalid', 'err.receiver_id.invalid',
    'err.signature.missing', 'err.signature.invalid', 'err.encryption.invalid',
    'err.service.unavailable',
  ],
};

const ref = (name) => ({ $ref: `#/definitions/${name}` });
const str = { type: 'string' };
const nonEmptyStr = { type: 'string', minLength: 1 };
const jsonLd = {
  '@context': { type: ['string', 'object'] },
  '@id': str,
  '@type': str,
};
// A code from a core code list. Numeric code lists ("1", "2", ...) also accept the JSON integer.
const code = (values) => ({
  enum: values.every((v) => /^\d+$/.test(v)) ? [...values, ...values.map(Number)] : values,
});
// A value of a DR code list: its code (numeric codes also as JSON integers) or its published label.
const drCode = (list) => ({ enum: [...new Set([...code(codes[list]).enum, ...codes[`${list}Label`]])] });
// DT boolean; the standard describes these flags as yes (1) / no (0).
const flag = { enum: [true, false, 0, 1] };
// Cardinality 0...* where an empty list carries no information: a non-empty list.
const listOf = (item) => ({ type: 'array', minItems: 1, items: item });
const arrayOf = (item) => ({ type: 'array', items: item });

// Person attributes (core Person.jsonld; DR Person is a core Person).
const personProperties = {
  ...jsonLd,
  identifier: ref('IdentifierList'),
  name: ref('Name'),
  sex: { type: 'string', enum: codes.sex },
  birth_date: ref('IsoDate'),
  death_date: ref('IsoDate'),
  address: ref('AddressOrList'),
  phone_number: { type: 'array', items: { type: 'string', pattern: E164_PATTERN } },
  email: { type: 'array', items: { type: 'string', format: 'email' } },
  registration_date: ref('IsoDate'),
  last_updated: ref('IsoDate'),
};

// Member attributes (core Member.jsonld; DR Member.demographic_info is a DR Person).
const memberProperties = {
  ...jsonLd,
  member_identifier: ref('IdentifierList'),
  demographic_info: ref('DRPerson'),
  related_person: arrayOf(ref('RelatedPerson')),
  is_disabled: flag,
  disability_info: arrayOf(ref('DisabilityInfo')),
  marital_status: { type: 'string', enum: codes.maritalStatus },
  employment_status: code(codes.employmentStatus),
  occupation: code(codes.occupation),
  // IncomeLevelEnum is country-defined: any non-empty code.
  income_level: { anyOf: [nonEmptyStr, { type: 'integer' }] },
  language_code: arrayOf({ type: 'string', pattern: LANGUAGE_CODE_PATTERN }),
  education_level: code(codes.educationLevel),
  additional_attributes: ref('AdditionalAttributes'),
  registration_date: ref('IsoDate'),
  last_updated: ref('IsoDate'),
};

// Status / dates of an item of support (AssistiveTechnology, MedicalCare, HousingSupport, AnimalAssistance).
const supportItem = (list) => ({
  type: 'object',
  properties: {
    '@type': str,
    type: drCode(list),
    status: drCode('supportStatus'),
    registration_date: ref('IsoDate'),
    last_updated: ref('IsoDate'),
  },
});

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------
export const definitions = {
  // ----- common types -----
  DateTime: { type: 'string', format: 'date-time' },
  IsoDate: { type: 'string', pattern: ISO_DATE_PATTERN },
  TransactionId: { type: 'string', minLength: 1, maxLength: 99 },
  CorrelationId: { type: 'string', minLength: 1, maxLength: 99, pattern: '^[a-zA-Z0-9-]+$' },
  ReferenceId: nonEmptyStr,
  SubscriptionCode: { type: 'string', minLength: 1, maxLength: 99 },
  Locale: { type: 'string', pattern: LOCALE_PATTERN },
  RequestStatus: { type: 'string', enum: codes.requestStatus },
  StatusReasonMessage: { type: 'string', maxLength: 999 },
  Version: { type: 'string', minLength: 1 },
  RegType: nonEmptyStr,
  RegRecordType: { type: 'string', pattern: RECORD_TYPE_PATTERN },
  RegEventType: { type: 'string', pattern: DR_EVENT_PATTERN },
  QueryType: { type: 'string', enum: codes.queryType },
  AttributeValue: { type: ['string', 'number', 'boolean', 'object'] },
  Pagination: {
    type: 'object',
    required: ['page_size', 'page_number', 'total_count'],
    properties: {
      page_size: { type: 'integer', minimum: 1 },
      page_number: { type: 'integer', minimum: 1 },
      total_count: { type: 'integer', minimum: 0 },
    },
  },
  RequestPagination: {
    type: 'object',
    required: ['page_size'],
    properties: {
      page_size: { type: 'integer', minimum: 1 },
      page_number: { type: 'integer', minimum: 1 },
    },
  },
  Purpose: {
    type: 'object',
    properties: {
      text: str,
      code: str,
      ref_uri: { type: 'string', format: 'uri' },
    },
  },
  Consent: {
    type: 'object',
    properties: { ...jsonLd, ts: ref('DateTime'), purpose: ref('Purpose') },
  },

  // ----- message envelope -----
  MsgSignature: nonEmptyStr,
  Meta: { type: 'object' },
  MsgHeader: {
    type: 'object',
    required: ['message_id', 'message_ts', 'action', 'sender_id', 'total_count'],
    properties: {
      version: ref('Version'),
      message_id: nonEmptyStr,
      message_ts: ref('DateTime'),
      action: nonEmptyStr,
      sender_id: nonEmptyStr,
      sender_uri: { type: 'string', format: 'uri' },
      receiver_id: nonEmptyStr,
      total_count: { type: 'integer', minimum: 0 },
      is_msg_encrypted: { type: 'boolean' },
      meta: ref('Meta'),
    },
  },
  MsgCallbackHeader: {
    type: 'object',
    required: ['message_id', 'message_ts', 'action', 'status'],
    properties: {
      version: ref('Version'),
      message_id: nonEmptyStr,
      message_ts: ref('DateTime'),
      action: nonEmptyStr,
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.headerStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      total_count: { type: 'integer', minimum: 0 },
      completed_count: { type: 'integer', minimum: 0 },
      sender_id: nonEmptyStr,
      receiver_id: nonEmptyStr,
      is_msg_encrypted: { type: 'boolean' },
      meta: ref('Meta'),
    },
  },
  EncryptedMessage: {
    type: 'object',
    required: ['header', 'ciphertext', 'encrypted_key', 'tag', 'iv'],
    properties: {
      header: {
        type: 'object',
        required: ['alg', 'enc', 'kid'],
        properties: { alg: nonEmptyStr, enc: nonEmptyStr, kid: nonEmptyStr },
      },
      ciphertext: nonEmptyStr,
      encrypted_key: nonEmptyStr,
      tag: nonEmptyStr,
      iv: nonEmptyStr,
    },
  },
  Error: {
    type: 'object',
    properties: {
      code: { type: 'string', enum: codes.errorCode },
      message: { type: 'string', maxLength: 999 },
    },
  },

  // ----- core data building blocks -----
  Identifier: {
    type: 'object',
    required: ['identifier_type', 'identifier_value'],
    properties: {
      ...jsonLd,
      identifier_type: { type: 'string', enum: codes.identifierType },
      identifier_value: nonEmptyStr,
    },
  },
  IdentifierList: listOf(ref('Identifier')),
  // core Name (surname / given_name); the DR spec example names them last_name / first_name.
  Name: {
    type: 'object',
    anyOf: [{ required: ['surname'] }, { required: ['given_name'] }, { required: ['last_name'] }, { required: ['first_name'] }],
    properties: {
      '@type': str,
      surname: str,
      given_name: str,
      second_name: str,
      maiden_name: str,
      prefix: str,
      suffix: str,
      first_name: str,
      last_name: str,
    },
  },
  Coordinate: {
    anyOf: [{ type: 'number' }, { type: 'string', pattern: DECIMAL_STRING_PATTERN }],
  },
  GeoCoordinates: {
    type: 'object',
    required: ['latitude', 'longitude'],
    properties: {
      '@id': str,
      '@type': str,
      latitude: { allOf: [ref('Coordinate'), { minimum: -90, maximum: 90 }] },
      longitude: { allOf: [ref('Coordinate'), { minimum: -180, maximum: 180 }] },
    },
  },
  GeoLocation: {
    type: 'object',
    properties: {
      '@id': str,
      '@type': str,
      plus_code: {
        type: 'object',
        properties: {
          global_code: { type: 'string', pattern: PLUS_CODE_PATTERN },
          geometry: {
            type: 'object',
            properties: {
              '@id': str,
              '@type': str,
              bounds: {
                type: 'object',
                properties: {
                  '@id': str,
                  '@type': str,
                  northeast: ref('GeoCoordinates'),
                  southwest: ref('GeoCoordinates'),
                },
              },
              location: ref('GeoCoordinates'),
            },
          },
        },
      },
    },
  },
  Address: {
    type: 'object',
    properties: {
      ...jsonLd,
      address_line_1: str,
      address_line_2: str,
      locality: str,
      sub_region_code: str,
      region_code: str,
      postal_code: str,
      country_code: { type: 'string', pattern: COUNTRY_CODE_PATTERN },
      geo_location: ref('GeoLocation'),
    },
  },
  // Cardinality 0...* (core Person / Group); a single Address object is accepted as well.
  AddressOrList: { anyOf: [ref('Address'), listOf(ref('Address'))] },
  Place: {
    type: 'object',
    properties: {
      ...jsonLd,
      name: str,
      address_line: str,
      geo: ref('GeoCoordinates'),
      contained_in_place: { anyOf: [{ type: 'string' }, ref('Place')] },
      contains_place: arrayOf(ref('Place')),
    },
  },
  AttributeNameValue: {
    type: 'object',
    required: ['name', 'value'],
    properties: { name: nonEmptyStr, value: ref('AttributeValue') },
  },
  AdditionalAttributes: arrayOf(ref('AttributeNameValue')),

  // ----- DR Person (DRPerson.jsonld: a core Person) -----
  DRPerson: { type: 'object', properties: personProperties },

  // ----- core DisabilityInfo (WG-SS functional limitation of a Member) -----
  FunctionalType: code(codes.functionalType),
  DisabilityInfo: {
    type: 'object',
    properties: {
      '@type': str,
      disability_limitation_type: { anyOf: [ref('FunctionalType'), listOf(ref('FunctionalType'))] },
      functional_severity: code(codes.functionalSeverity),
    },
  },

  // ----- core RelatedPerson -----
  // related_member is a Person (core) or a Member reference (member_identifier).
  RelatedMember: {
    type: 'object',
    properties: {
      ...personProperties,
      member_identifier: ref('IdentifierList'),
      demographic_info: ref('DRPerson'),
    },
  },
  RelatedPerson: {
    type: 'object',
    properties: {
      '@type': str,
      relationship_type: { type: 'string', enum: codes.relationshipType },
      related_member: ref('RelatedMember'),
    },
  },

  // ----- DR Member (Member.jsonld) -----
  Member: { type: 'object', properties: memberProperties },

  // ----- DR Group (Group.jsonld: a core Group whose head and members are DR Members) -----
  Group: {
    type: 'object',
    properties: {
      ...jsonLd,
      group_identifier: ref('IdentifierList'),
      group_type: code(codes.groupType),
      // core Group.jsonld: geographical_location; other DCI registries: place.
      geographical_location: ref('Place'),
      place: ref('Place'),
      address: ref('AddressOrList'),
      place_address: flag,
      poverty_score: { type: 'number' },
      poverty_score_type: nonEmptyStr,
      group_head_info: ref('Member'),
      group_size: { type: 'integer', minimum: 1 },
      member_list: arrayOf(ref('Member')),
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
      additional_attributes: ref('AdditionalAttributes'),
    },
  },

  // ----- DO.DR.02 DisabilityDetails -----
  DisabilityDetails: {
    type: 'object',
    properties: {
      '@type': str,
      impairment_type: drCode('impairmentType'),
      impairment_level: drCode('impairmentLevel'),
      impairment_cause: drCode('impairmentCause'),
      age_on_set: drCode('disabilityOnSet'),
    },
  },

  // ----- DO.DR.04 HumanAssistance -----
  // caregiver: a DR Person (data standard) or { id, name, identifier } (DisabilitySupport API schema).
  Caregiver: {
    type: 'object',
    properties: {
      ...personProperties,
      id: nonEmptyStr,
      name: { anyOf: [nonEmptyStr, ref('Name')] },
      identifier: { anyOf: [nonEmptyStr, ref('IdentifierList')] },
      member_identifier: ref('IdentifierList'),
    },
  },
  HumanAssistance: {
    type: 'object',
    properties: {
      '@type': str,
      type: drCode('humanAssistanceType'),
      // Data standard: intensity / support; API schema and examples: frequency / support_status.
      frequency: drCode('supportFrequency'),
      intensity: drCode('supportFrequency'),
      support_status: drCode('supportStatus'),
      support: drCode('supportStatus'),
      caregiver: ref('Caregiver'),
      relationship: { type: 'string', enum: codes.relationshipType },
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
    },
  },
  // ----- DO.DR.05-08 -----
  AssistiveTechnology: supportItem('assistiveTechnology'),
  MedicalCare: supportItem('medicalCare'),
  HousingSupport: supportItem('housingSupport'),
  AnimalAssistance: supportItem('animalAssistance'),

  // ----- DO.DR.03 DisabilitySupport -----
  DisabilitySupport: {
    type: 'object',
    properties: {
      '@type': str,
      // A list of HumanAssistance (data standard) or a single object (API schema and examples).
      human_assistance: { anyOf: [ref('HumanAssistance'), arrayOf(ref('HumanAssistance'))] },
      assistive_technology: arrayOf(ref('AssistiveTechnology')),
      housing_support: arrayOf(ref('HousingSupport')),
      medical_care: arrayOf(ref('MedicalCare')),
      animal_assistance: arrayOf(ref('AnimalAssistance')),
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
    },
  },

  // ----- Programme (extensions/ibr Programme.jsonld) -----
  Programme: {
    type: 'object',
    // An enrolment must say which programme it is: by identifier or by name.
    anyOf: [{ required: ['programme_identifier'] }, { required: ['programme_name'] }],
    properties: {
      ...jsonLd,
      programme_name: nonEmptyStr,
      programme_identifier: nonEmptyStr,
      programme_description: nonEmptyStr,
      implementing_institution: nonEmptyStr,
      institution_type: code(codes.institutionType),
      legal_status: code(codes.legalStatus),
      social_protection_functions: arrayOf(code(codes.socialProtectionFunction)),
      contribution_type: code(codes.contributionType),
      programme_type: code(codes.programmeType),
    },
  },

  // ----- DO.DR.01 PWDPerson -----
  // personal_details is a DR Member (data standard). The DR spec example sends the person
  // attributes directly (identifier, name, date_of_birth, gender): both are accepted and
  // validated, the example's date_of_birth / gender as aliases of birth_date / sex.
  PersonalDetails: {
    type: 'object',
    properties: {
      ...personProperties,
      ...memberProperties,
      date_of_birth: ref('IsoDate'),
      gender: { type: 'string', enum: codes.sex },
    },
  },
  PWDPerson: {
    type: 'object',
    properties: {
      ...jsonLd,
      personal_details: ref('PersonalDetails'),
      disability_status: drCode('disabilityStatus'),
      // Data standard: disability_status_level; spec example: disability_level.
      disability_status_level: drCode('disabilityLevel'),
      disability_level: drCode('disabilityLevel'),
      disability_details: arrayOf(ref('DisabilityDetails')),
      disability_support: arrayOf(ref('DisabilitySupport')),
      transport_requirement: drCode('transportRequirement'),
      housing_type: drCode('housingType'),
      // Data standard: programs_enrolments; spec example: programs_enrollments.
      programs_enrolments: arrayOf(ref('Programme')),
      programs_enrollments: arrayOf(ref('Programme')),
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
    },
  },

  // ----- get-disability-support record: the disability support of one person -----
  SupportRecord: {
    type: 'object',
    properties: {
      '@type': str,
      personal_details: ref('PersonalDetails'),
      disabilities: arrayOf(ref('DisabilitySupport')),
    },
  },

  // reg_records are validated against the data object named by reg_record_type. The spec
  // declares reg_records as a set of DisabledPerson: without a reg_record_type they are PWD
  // persons. The spec declares a single object while search results usually carry a list:
  // both are accepted.
  PWDPersonRecords: { anyOf: [arrayOf(ref('PWDPerson')), ref('PWDPerson')] },
  DRPersonRecords: { anyOf: [arrayOf(ref('DRPerson')), ref('DRPerson')] },
  MemberRecords: { anyOf: [arrayOf(ref('Member')), ref('Member')] },
  GroupRecords: { anyOf: [arrayOf(ref('Group')), ref('Group')] },
  RecordsByType: {
    allOf: [
      {
        if: {
          anyOf: [
            { not: { required: ['reg_record_type'] } },
            { properties: { reg_record_type: { type: 'string', pattern: PWD_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
          ],
        },
        then: { properties: { reg_records: ref('PWDPersonRecords') } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: PERSON_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: ref('DRPersonRecords') } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: MEMBER_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: ref('MemberRecords') } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: GROUP_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: ref('GroupRecords') } },
      },
    ],
  },
  SearchData: {
    type: 'object',
    required: ['reg_records'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      reg_record_type: ref('RegRecordType'),
      reg_records: { type: ['array', 'object'] },
    },
    allOf: [ref('RecordsByType')],
  },
  NotifyData: {
    type: 'object',
    required: ['reg_record_type', 'reg_records'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      reg_record_type: ref('RegRecordType'),
      reg_records: { type: ['array', 'object'] },
    },
    allOf: [ref('RecordsByType')],
  },

  // ----- queries -----
  Expression: {
    type: 'object',
    required: ['attribute_name', 'operator', 'attribute_value'],
    properties: {
      attribute_name: nonEmptyStr,
      operator: { type: 'string', enum: codes.operator },
      attribute_value: ref('AttributeValue'),
    },
  },
  PredicateQuery: {
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      required: ['expression1'],
      properties: {
        seq_num: { type: 'number' },
        expression1: ref('Expression'),
        condition: { type: 'string', enum: codes.condition },
        expression2: ref('Expression'),
      },
    },
  },
  IdTypeValueQuery: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: nonEmptyStr,
      value: ref('AttributeValue'),
    },
  },
  // ExpTemplate: { type, value: { expression } } (expression and graphql queries).
  ExpressionQuery: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: nonEmptyStr,
      value: { type: 'object' },
    },
  },
  // query must be consistent with query_type (shared by search_criteria and subscribe_criteria).
  Query: {
    anyOf: [ref('IdTypeValueQuery'), ref('ExpressionQuery'), ref('PredicateQuery')],
  },
  QueryByType: {
    allOf: [
      {
        if: { properties: { query_type: { const: 'idtype-value' } }, required: ['query_type'] },
        then: { properties: { query: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { query_type: { const: 'predicate' } }, required: ['query_type'] },
        then: { properties: { query: ref('PredicateQuery') } },
      },
      {
        if: { properties: { query_type: { enum: ['expression', 'graphql'] } }, required: ['query_type'] },
        then: { properties: { query: ref('ExpressionQuery') } },
      },
    ],
  },
  SortItem: {
    type: 'object',
    required: ['attribute_name'],
    properties: {
      attribute_name: nonEmptyStr,
      sort_order: { type: 'string', enum: codes.sortOrder },
    },
  },
  SearchCriteria: {
    type: 'object',
    required: ['query_type', 'query'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_record_type: ref('RegRecordType'),
      // Not in the spec's SearchCriteria, but used by the DR process flows ("response_entity": "DRPerson").
      response_entity: ref('RegRecordType'),
      query_type: ref('QueryType'),
      query: ref('Query'),
      sort: arrayOf(ref('SortItem')),
      pagination: ref('RequestPagination'),
      consent: ref('Consent'),
      authorize: ref('Consent'),
    },
    allOf: [ref('QueryByType')],
  },
  Frequency: {
    type: 'object',
    required: ['start_time', 'end_time', 'frequency'],
    properties: {
      start_time: ref('DateTime'),
      end_time: ref('DateTime'),
      frequency: nonEmptyStr,
    },
  },
  SubscribeCriteria: {
    type: 'object',
    required: ['reg_event_type', 'filter', 'notify_record_type'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      frequency: ref('Frequency'),
      filter_type: ref('QueryType'),
      filter: ref('Query'),
      notify_record_type: ref('RegRecordType'),
      authorize: ref('Consent'),
    },
    allOf: [
      {
        if: { properties: { filter_type: { const: 'idtype-value' } }, required: ['filter_type'] },
        then: { properties: { filter: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { filter_type: { const: 'predicate' } }, required: ['filter_type'] },
        then: { properties: { filter: ref('PredicateQuery') } },
      },
      {
        if: { properties: { filter_type: { enum: ['expression', 'graphql'] } }, required: ['filter_type'] },
        then: { properties: { filter: ref('ExpressionQuery') } },
      },
    ],
  },
  // DisabledRequest.disabled_criteria / GetDisabilitySupportRequest.disabled_criteria.
  // The spec declares no required property; the suite requires a non-empty query, without which
  // nothing identifies the person. The spec example query is { "<attribute path>": { "eq": "<value>" } }.
  DisabledCriteria: {
    type: 'object',
    required: ['query'],
    properties: {
      query_type: ref('QueryType'),
      query: { type: 'object', minProperties: 1 },
    },
    allOf: [
      {
        if: { properties: { query_type: { const: 'idtype-value' } }, required: ['query_type'] },
        then: { properties: { query: ref('IdTypeValueQuery') } },
      },
    ],
  },

  // ----- messages -----
  SearchRequest: {
    type: 'object',
    required: ['transaction_id', 'search_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      search_request: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'search_criteria'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            search_criteria: ref('SearchCriteria'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  SearchResponseItem: {
    type: 'object',
    required: ['reference_id', 'timestamp', 'status'],
    properties: {
      reference_id: ref('ReferenceId'),
      timestamp: ref('DateTime'),
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.searchStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      data: ref('SearchData'),
      pagination: ref('Pagination'),
      locale: ref('Locale'),
    },
  },
  SearchResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'search_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      search_response: arrayOf(ref('SearchResponseItem')),
    },
  },
  SubscribeRequest: {
    type: 'object',
    required: ['transaction_id', 'subscribe_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      subscribe_request: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'subscribe_criteria'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            subscribe_criteria: ref('SubscribeCriteria'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  Subscription: {
    type: 'object',
    required: ['code', 'status', 'timestamp'],
    properties: {
      version: ref('Version'),
      code: ref('SubscriptionCode'),
      status: { type: 'string', enum: codes.subscriptionStatus },
      timestamp: ref('DateTime'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      frequency: ref('Frequency'),
      filter_type: ref('QueryType'),
      filter: ref('Query'),
      notify_record_type: ref('RegRecordType'),
      locale: ref('Locale'),
    },
  },
  SubscribeResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'subscribe_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      subscribe_response: arrayOf({
        type: 'object',
        required: ['reference_id', 'timestamp', 'status'],
        properties: {
          reference_id: ref('ReferenceId'),
          timestamp: ref('DateTime'),
          status: ref('RequestStatus'),
          status_reason_code: { type: 'string', enum: codes.subscribeStatusReasonCode },
          status_reason_message: ref('StatusReasonMessage'),
          subscriptions: arrayOf(ref('Subscription')),
          pagination: ref('Pagination'),
          locale: ref('Locale'),
        },
      }),
    },
  },
  UnSubscribeRequest: {
    type: 'object',
    required: ['transaction_id', 'timestamp', 'subscription_codes'],
    properties: {
      transaction_id: ref('TransactionId'),
      timestamp: ref('DateTime'),
      subscription_codes: { type: 'array', minItems: 1, items: ref('SubscriptionCode') },
    },
  },
  UnSubscribeResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'timestamp', 'status'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      timestamp: ref('DateTime'),
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.unsubscribeStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      subscription_status: arrayOf({
        type: 'object',
        required: ['code', 'status'],
        properties: {
          code: ref('SubscriptionCode'),
          status: { type: 'string', enum: codes.subscriptionStatus },
        },
      }),
    },
  },
  NotifyEventRequest: {
    type: 'object',
    required: ['transaction_id', 'notify_event'],
    properties: {
      transaction_id: ref('TransactionId'),
      notify_event: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'data'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            data: ref('NotifyData'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  TxnStatusRequest: {
    type: 'object',
    required: ['transaction_id', 'txnstatus_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      txnstatus_request: {
        type: 'object',
        required: ['reference_id', 'txn_type', 'attribute_type', 'attribute_value'],
        properties: {
          reference_id: ref('ReferenceId'),
          txn_type: { type: 'string', enum: codes.txnType },
          attribute_type: { type: 'string', enum: codes.attributeType },
          attribute_value: {
            anyOf: [
              ref('TransactionId'),
              { type: 'array', minItems: 1, items: ref('ReferenceId') },
            ],
          },
          locale: ref('Locale'),
        },
        // attribute_value must match the declared attribute_type.
        allOf: [
          {
            if: { properties: { attribute_type: { const: 'transaction_id' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: ref('TransactionId') } },
          },
          {
            if: { properties: { attribute_type: { const: 'correlation_id' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: ref('CorrelationId') } },
          },
          {
            if: { properties: { attribute_type: { const: 'reference_id_list' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: { type: 'array', minItems: 1, items: ref('ReferenceId') } } },
          },
          {
            if: { properties: { attribute_type: { const: 'subscription_code_list' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: { type: 'array', minItems: 1, items: ref('SubscriptionCode') } } },
          },
        ],
      },
    },
  },
  TxnStatusResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'txnstatus_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      txnstatus_response: {
        type: 'object',
        required: ['txn_type', 'txn_status'],
        properties: {
          txn_type: { type: 'string', enum: codes.txnType },
          txn_status: {
            anyOf: [ref('SearchResponse'), ref('SubscribeResponse'), ref('UnSubscribeResponse')],
          },
        },
        // txn_status must be the response type matching txn_type.
        allOf: [
          {
            if: { properties: { txn_type: { const: 'search' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('SearchResponse') } },
          },
          {
            if: { properties: { txn_type: { const: 'subscribe' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('SubscribeResponse') } },
          },
          {
            if: { properties: { txn_type: { const: 'unsubscribe' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('UnSubscribeResponse') } },
          },
        ],
      },
    },
  },

  // ----- disability specific requests and responses -----
  // GetDisabilitySupportRequest (get-disability-support, get-disability-details) and
  // DisabledRequest (disabled / get-disability-status) share the same shape.
  DisabledRequest: {
    type: 'object',
    required: ['transaction_id', 'disabled_criteria'],
    properties: {
      transaction_id: ref('TransactionId'),
      disabled_criteria: ref('DisabledCriteria'),
    },
  },
  GetDisabilitySupportResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'search_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      search_response: arrayOf({
        type: 'object',
        required: ['reference_id', 'timestamp', 'status'],
        properties: {
          reference_id: ref('ReferenceId'),
          timestamp: ref('DateTime'),
          status: ref('RequestStatus'),
          status_reason_code: { type: 'string', enum: codes.searchStatusReasonCode },
          status_reason_message: ref('StatusReasonMessage'),
          data: {
            type: 'object',
            required: ['reg_records'],
            properties: {
              version: ref('Version'),
              reg_records: arrayOf(ref('SupportRecord')),
            },
          },
          pagination: ref('Pagination'),
          locale: ref('Locale'),
        },
      }),
    },
  },
  GetDisabilityInfoResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'search_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      search_response: arrayOf({
        type: 'object',
        required: ['reference_id', 'timestamp', 'status'],
        properties: {
          reference_id: ref('ReferenceId'),
          timestamp: ref('DateTime'),
          status: ref('RequestStatus'),
          status_reason_code: { type: 'string', enum: codes.searchStatusReasonCode },
          status_reason_message: ref('StatusReasonMessage'),
          data: {
            type: 'object',
            required: ['reg_records'],
            properties: {
              version: ref('Version'),
              reg_records: arrayOf(ref('PWDPerson')),
            },
          },
          pagination: ref('Pagination'),
          locale: ref('Locale'),
        },
      }),
    },
  },
  DisabledResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'disabled_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      disabled_response: arrayOf({
        type: 'object',
        required: ['reference_id', 'timestamp', 'status', 'disabled_status'],
        properties: {
          reference_id: ref('ReferenceId'),
          timestamp: ref('DateTime'),
          status: ref('RequestStatus'),
          status_reason_message: ref('StatusReasonMessage'),
          disabled_status: { type: 'string', enum: codes.disabledStatus },
        },
      }),
    },
  },

  // ----- synchronous HTTP responses -----
  AckResponse: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'object',
        required: ['ack_status', 'timestamp', 'correlation_id'],
        properties: {
          ack_status: { type: 'string', enum: codes.ackStatus },
          timestamp: ref('DateTime'),
          error: ref('Error'),
          correlation_id: ref('CorrelationId'),
        },
        // An ERR acknowledgement must explain itself with an error code.
        if: { properties: { ack_status: { const: 'ERR' } }, required: ['ack_status'] },
        then: { required: ['error'], properties: { error: { required: ['code'] } } },
      },
    },
  },
  HttpErrorResponse: {
    type: 'object',
    required: ['errors'],
    properties: {
      errors: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['code'],
          properties: { code: nonEmptyStr, message: str },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Envelopes: { signature, header, message } per endpoint
// ---------------------------------------------------------------------------
const encryptedIf = {
  properties: {
    header: { properties: { is_msg_encrypted: { const: true } }, required: ['is_msg_encrypted'] },
  },
  required: ['header'],
};

function envelope({ headerDef, action, messageDef, messageRequired }) {
  return {
    type: 'object',
    required: messageRequired ? ['header', 'message'] : ['header'],
    properties: {
      signature: ref('MsgSignature'),
      header: {
        allOf: [ref(headerDef), { type: 'object', properties: { action: { const: action } } }],
      },
      message: { type: 'object' },
    },
    // message is the plain payload, or an EncryptedMessage when header.is_msg_encrypted is true.
    if: encryptedIf,
    then: { properties: { message: ref('EncryptedMessage') } },
    else: { properties: { message: ref(messageDef) } },
  };
}

const request = (action, messageDef) => envelope({ headerDef: 'MsgHeader', action, messageDef, messageRequired: true });
const callback = (action, messageDef) => envelope({ headerDef: 'MsgCallbackHeader', action, messageDef, messageRequired: false });

export const envelopeDefinitions = {
  // DR side (requests)
  'search': request('search', 'SearchRequest'),
  'subscribe': request('subscribe', 'SubscribeRequest'),
  'unsubscribe': request('unsubscribe', 'UnSubscribeRequest'),
  'txn-status': request('txn-status', 'TxnStatusRequest'),
  // The three disability sync endpoints use header action "search".
  'get-disability-support': request('search', 'DisabledRequest'),
  'get-disability-details': request('search', 'DisabledRequest'),
  'disabled': request('search', 'DisabledRequest'),
  // SP side (callbacks)
  'on-search': callback('on-search', 'SearchResponse'),
  'on-subscribe': request('on-subscribe', 'SubscribeResponse'),
  'on-unsubscribe': request('on-unsubscribe', 'UnSubscribeResponse'),
  'notify': callback('notify', 'NotifyEventRequest'),
  'txn-on-status': callback('txn-on-status', 'TxnStatusResponse'),
  // Synchronous responses (callback header, action "on-search")
  'get-disability-support-response': callback('on-search', 'GetDisabilitySupportResponse'),
  'get-disability-details-response': callback('on-search', 'GetDisabilityInfoResponse'),
  'disabled-response': callback('on-search', 'DisabledResponse'),
};
envelopeDefinitions['sync-search-response'] = envelopeDefinitions['on-search'];

// Top-level, self-contained schemas (every one embeds all definitions so it can be compiled
// on its own, which is what Mockoon's valid_json_schema rule needs).
const standalone = (root) => ({ ...root, definitions });

export const schemas = {
  ...Object.fromEntries(Object.entries(envelopeDefinitions).map(([k, v]) => [k, standalone(v)])),
  'ack': standalone(definitions.AckResponse),
  'http-error': standalone(definitions.HttpErrorResponse),
  'PWDPerson': standalone(definitions.PWDPerson),
  'DRPerson': standalone(definitions.DRPerson),
  'Member': standalone(definitions.Member),
  'Group': standalone(definitions.Group),
  'SupportRecord': standalone(definitions.SupportRecord),
  'DisabilitySupport': standalone(definitions.DisabilitySupport),
};
