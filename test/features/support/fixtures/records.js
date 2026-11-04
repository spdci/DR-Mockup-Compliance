// DR records covering every data profile of the standard, for the record types:
//   PWDPerson (DO.DR.01, person with disability), DRPerson (person), Member, Group, and the
//   SupportRecord returned by get-disability-support (DO.DR.03-DO.DR.08).
// They form one consistent registry: households (Group) list their members (Member), each
// member's demographic_info is a person (DRPerson), and every person with disability
// (PWDPerson) has one of these members as personal_details. Profiles range from a record
// carrying only an identifier up to one carrying every optional attribute; DR codes are sent
// as published labels in some records and as codes in others.
//
// They are used by the tests (payloads sent to SP endpoints, reference records for the data
// rules) and by mock/generate-mocks.mjs (records returned by the mock DR), so the mock and
// the tests always agree on the data.

const context = {
  spdci: 'https://schema.spdci.org/extensions/dr/v1/data',
  code: 'https://schema.spdci.org/extensions/dr/v1/code',
  spdcicore: 'https://schema.spdci.org/core/v1/data',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

const id = (identifier_type, identifier_value) => ({ '@type': 'Identifier', identifier_type, identifier_value });
const memberRef = (value) => ({ '@type': 'Member', member_identifier: [id('UIN', value)] });

// ---------------------------------------------------------------------------
// DRPerson (demographic information)
// ---------------------------------------------------------------------------
const omar = {
  '@context': context,
  '@id': 'https://example.org/dr_person/500000001',
  '@type': 'spdci:DR_Person',
  identifier: [id('UIN', '500000001'), id('BRN', 'BRN1978000101')],
  name: { '@type': 'Name', surname: 'Haddad', given_name: 'Omar', second_name: 'Khalil', prefix: 'Mr.', suffix: 'Sr.' },
  sex: 'male',
  birth_date: '1978-03-12T00:00:00Z',
  address: [{
    '@type': 'Address',
    address_line_1: '12 Harbour Road',
    address_line_2: 'Building C, floor 2',
    locality: 'Al Mina',
    sub_region_code: 'TR01',
    region_code: 'NL',
    postal_code: '1300',
    country_code: 'LB',
    geo_location: {
      '@type': 'GeoLocation',
      plus_code: {
        global_code: '8G6QCRF6+QX',
        geometry: {
          bounds: {
            northeast: { '@type': 'GeoCoordinates', latitude: 34.4500, longitude: 35.8200 },
            southwest: { '@type': 'GeoCoordinates', latitude: 34.4480, longitude: 35.8180 },
          },
          location: { '@type': 'GeoCoordinates', latitude: 34.4491, longitude: 35.8192 },
        },
      },
    },
  }],
  phone_number: ['+9616123456'],
  email: ['omar.haddad@example.org'],
  registration_date: '2021-04-01T09:00:00Z',
  last_updated: '2025-08-20T10:00:00Z',
};

// Several identifiers, phone numbers, e-mails and addresses.
const rania = {
  '@type': 'spdci:DR_Person',
  identifier: [id('UIN', '500000002'), id('MRN', 'MRN2005000222')],
  name: { surname: 'Haddad', given_name: 'Rania', maiden_name: 'Saad', prefix: 'Mrs.' },
  sex: 'female',
  birth_date: '1981-07-04',
  address: [
    { address_line_1: '12 Harbour Road', locality: 'Al Mina', postal_code: '1300', country_code: 'LB' },
    { address_line_1: '4 Rue Gouraud', locality: 'Beirut', postal_code: '2077', country_code: 'LBN' },
  ],
  phone_number: ['+9616123457', '+33612345678'],
  email: ['rania.haddad@example.org', 'r.haddad@example.net'],
  registration_date: '2021-04-01',
};

const lina = {
  identifier: [id('UIN', '500000003'), id('BRN', 'BRN2012000303')],
  name: { surname: 'Haddad', given_name: 'Lina' },
  sex: 'female',
  birth_date: '2012-02-20',
  registration_date: '2021-04-01',
};

// A newborn known only by a birth registration number.
const noor = {
  identifier: [id('BRN', 'BRN2025000505')],
  name: { surname: 'Haddad', given_name: 'Noor' },
  sex: 'female',
  birth_date: '2025-12-01',
  registration_date: '2025-12-10',
};

const ama = {
  identifier: [id('UIN', '600000001')],
  name: { surname: 'Mensah', given_name: 'Ama' },
  sex: 'female',
  birth_date: '1948-11-02',
  phone_number: ['+233201234567'],
  address: { address_line_1: '7 Ring Road', locality: 'Kumasi', region_code: 'AH', country_code: 'GH' },
  registration_date: '2018-06-01',
  last_updated: '2024-03-01',
};

const kofi = {
  identifier: [id('UIN', '600000002')],
  name: { surname: 'Mensah', given_name: 'Kofi' },
  sex: 'male',
  birth_date: '2000-01-15',
  phone_number: ['+233207654321'],
  registration_date: '2018-06-01',
};

const yaw = {
  identifier: [id('UIN', '600000003'), id('DRN', 'DRN2019000777')],
  name: { surname: 'Mensah', given_name: 'Yaw' },
  sex: 'male',
  birth_date: '1945-04-09',
  death_date: '2019-08-14T06:30:00Z',
  registration_date: '2018-06-01',
  last_updated: '2019-08-20',
};

const daniel = {
  identifier: [id('UIN', '700000001')],
  name: { surname: 'Okafor', given_name: 'Daniel' },
  sex: 'male',
  birth_date: '1990-08-30',
  email: ['daniel.okafor@example.org'],
  registration_date: '2020-02-03',
};

export const persons = {
  // Every DRPerson attribute present with a correct value.
  full: omar,
  // Only an identifier: every other attribute is optional.
  minimal: { identifier: [id('UIN', '590000001')] },
  multi: rania,
  child: lina,
  newborn: noor,
  elder: ama,
  caregiver: kofi,
  deceased: yaw,
  single: daniel,
};

// ---------------------------------------------------------------------------
// Member (DR Member: demographic_info is a DR Person)
// ---------------------------------------------------------------------------
const head = {
  '@context': context,
  '@id': 'https://example.org/member/M500000001',
  '@type': 'spdci:Member',
  member_identifier: [id('UIN', 'M500000001')],
  demographic_info: omar,
  related_person: [
    { '@type': 'RelatedPerson', relationship_type: 'SPS', related_member: memberRef('M500000002') },
    { '@type': 'RelatedPerson', relationship_type: 'DAU', related_member: memberRef('M500000003') },
    // related_member given as a Person instead of a Member reference.
    { '@type': 'RelatedPerson', relationship_type: 'DAU', related_member: { identifier: [id('BRN', 'BRN2025000505')], name: { surname: 'Haddad', given_name: 'Noor' } } },
  ],
  is_disabled: false,
  // WG-SS "some difficulty" seeing: a functional limitation that is not a disability.
  disability_info: [{ '@type': 'DisabilityInfo', disability_limitation_type: 'VIS_SS', functional_severity: '2' }],
  marital_status: 'M',
  employment_status: '4',
  occupation: '7',
  income_level: '2',
  language_code: ['ar', 'en'],
  education_level: '3',
  additional_attributes: [{ name: 'primary_caregiver', value: true }, { name: 'years_in_district', value: 15 }],
  registration_date: '2021-04-01T09:00:00Z',
  last_updated: '2025-08-20T10:00:00Z',
};

const spouse = {
  '@type': 'spdci:Member',
  member_identifier: [id('UIN', 'M500000002')],
  demographic_info: rania,
  related_person: [{ relationship_type: 'HUSB', related_member: memberRef('M500000001') }],
  is_disabled: false,
  marital_status: 'M',
  employment_status: '2',
  income_level: 2,
  language_code: ['ar', 'fra'],
  education_level: 6,
  registration_date: '2021-04-01T09:00:00Z',
};

// A child with a disability: WG-SS functional limitations at "a lot of difficulty" or more.
const daughter = {
  member_identifier: [id('UIN', 'M500000003')],
  demographic_info: lina,
  related_person: [
    { relationship_type: 'FTH', related_member: memberRef('M500000001') },
    { relationship_type: 'MTH', related_member: memberRef('M500000002') },
  ],
  is_disabled: true,
  disability_info: [
    { disability_limitation_type: ['MOB_SS', 'SC_SS'], functional_severity: 4 },
    { disability_limitation_type: 'COM_SS', functional_severity: '3' },
  ],
  marital_status: 'S',
  education_level: '1',
  registration_date: '2021-04-01',
};

const baby = {
  member_identifier: [id('UIN', 'M500000004')],
  demographic_info: noor,
  related_person: [{ relationship_type: 'MTH', related_member: memberRef('M500000002') }],
  registration_date: '2025-12-10',
};

const elder = {
  member_identifier: [id('UIN', 'M600000001')],
  demographic_info: ama,
  related_person: [{ relationship_type: 'GRNDSON', related_member: memberRef('M600000002') }],
  is_disabled: 1,
  disability_info: [
    { disability_limitation_type: 'VIS_SS', functional_severity: '3' },
    { disability_limitation_type: 'MOB_SS', functional_severity: '3' },
  ],
  marital_status: 'W',
  employment_status: '3',
  income_level: '1',
  language_code: ['ak', 'en'],
  education_level: '1',
  registration_date: '2018-06-01',
  last_updated: '2024-03-01',
};

const caregiver = {
  member_identifier: [id('UIN', 'M600000002')],
  demographic_info: kofi,
  related_person: [{ relationship_type: 'GRMTH', related_member: memberRef('M600000001') }],
  is_disabled: 0,
  marital_status: 'S',
  employment_status: '5',
  occupation: '5',
  education_level: '4',
  registration_date: '2018-06-01',
};

const single = {
  member_identifier: [id('UIN', 'M700000001')],
  demographic_info: daniel,
  is_disabled: true,
  disability_info: [{ disability_limitation_type: 'MOB_SS', functional_severity: '3' }],
  marital_status: 'S',
  employment_status: '2',
  occupation: '7',
  income_level: '1',
  language_code: ['en'],
  education_level: '3',
  registration_date: '2020-02-03',
};

export const members = {
  // Every Member attribute present with a correct value.
  full: head,
  // Only a member identifier.
  minimal: { member_identifier: [id('UIN', 'M900000001')] },
  spouse,
  disabled: daughter,
  newborn: baby,
  elder,
  caregiver,
  single,
};

// ---------------------------------------------------------------------------
// Group (DR Group: head and members are DR Members)
// ---------------------------------------------------------------------------
export const groups = {
  // Every Group attribute present with a correct value: a household with a disabled child.
  full: {
    '@context': context,
    '@id': 'https://example.org/group/GRP-DR-1001',
    '@type': 'spdci:Group',
    group_identifier: [id('UIN', 'GRP-DR-1001')],
    group_type: '2',
    geographical_location: {
      '@type': 'Place',
      name: 'Al Mina',
      address_line: '12 Harbour Road, Al Mina',
      geo: { '@type': 'GeoCoordinates', latitude: 34.4491, longitude: 35.8192 },
      contained_in_place: { '@type': 'Place', name: 'Tripoli district' },
    },
    address: [{ '@type': 'Address', address_line_1: '12 Harbour Road', locality: 'Al Mina', postal_code: '1300', country_code: 'LB' }],
    place_address: false,
    poverty_score: 3.1,
    poverty_score_type: 'PMT',
    group_head_info: head,
    group_size: 4,
    member_list: [head, spouse, daughter, baby],
    registration_date: '2021-04-01T09:00:00Z',
    last_updated: '2025-12-10T12:00:00Z',
    additional_attributes: [{ name: 'dwelling_accessible', value: false }, { name: 'dwelling_type', value: 'rented' }],
  },

  // Only a group identifier.
  minimal: { group_identifier: [id('UIN', 'GRP-DR-2001')] },

  // Family located by place only (place_address = 1), coordinates sent as text, member list
  // shorter than group_size (only part of the family is listed).
  large: {
    '@type': 'spdci:Group',
    group_identifier: [id('UIN', 'GRP-DR-3001')],
    group_type: 3,
    place: { name: 'Kumasi', geo: { latitude: '6.6885', longitude: '-1.6244' } },
    place_address: 1,
    poverty_score: 6.8,
    poverty_score_type: 'income-based',
    group_head_info: elder,
    group_size: 5,
    member_list: [elder, caregiver],
    registration_date: '2018-06-01',
    last_updated: '2024-03-01',
  },

  // One-person group (assistance unit "Member") located by a single address object.
  single: {
    group_identifier: [id('UIN', 'GRP-DR-4001')],
    group_type: '1',
    address: { address_line_1: '22 Marina Road', locality: 'Lagos', postal_code: '101001', country_code: 'NG' },
    place_address: 0,
    poverty_score: 2.4,
    poverty_score_type: 'PMT',
    group_head_info: single,
    group_size: 1,
    member_list: [single],
    registration_date: '2020-02-03',
  },
};

// ---------------------------------------------------------------------------
// PWDPerson (person with disability)
// ---------------------------------------------------------------------------
export const pwdPersons = {
  // Every PWDPerson attribute present with a correct value, DR codes sent as published labels.
  // DisabilitySupport is given in both forms: data standard (list of HumanAssistance with
  // intensity / support and a Person caregiver) and API schema (one object with frequency /
  // support_status and a { id, name, identifier } caregiver).
  full: {
    '@context': context,
    '@id': 'https://example.org/pwd_person/M500000003',
    '@type': 'spdci:PWD_Person',
    personal_details: daughter,
    disability_status: 'Approved',
    disability_status_level: 'Severe',
    disability_details: [
      { '@type': 'DisabilityDetails', impairment_type: 'Mobility', impairment_level: 'Extreme', impairment_cause: 'Birth congenital', age_on_set: 'Born With' },
      { impairment_type: 'Speech', impairment_level: 'Severe', impairment_cause: 'Birth complication', age_on_set: 'Born With' },
    ],
    disability_support: [
      {
        '@type': 'DisabilitySupport',
        human_assistance: [{
          '@type': 'HumanAssistance',
          type: 'basic_activity',
          intensity: 'Daily',
          support: 'Received',
          caregiver: { identifier: [id('UIN', '500000001')], name: { surname: 'Haddad', given_name: 'Omar' }, sex: 'male', birth_date: '1978-03-12' },
          relationship: 'FTH',
          registration_date: '2021-04-15',
          last_updated: '2025-08-20',
        }],
        assistive_technology: [{ type: 'Wheelchairs', status: 'Received', registration_date: '2021-05-01', last_updated: '2024-05-01' }],
        housing_support: [{ type: 'home_adaptation', status: 'Needed', registration_date: '2024-02-01' }],
        medical_care: [{ type: 'Constant healthcare', status: 'Received', registration_date: '2021-04-15' }],
        animal_assistance: [],
        registration_date: '2021-04-15',
        last_updated: '2025-08-20',
      },
      {
        human_assistance: {
          type: 'mobility',
          frequency: 'Permanent',
          support_status: 'Received',
          caregiver: { id: 'Person_500000002', name: 'Rania Haddad', identifier: '500000002' },
          relationship: 'MTH',
          registration_date: '2021-04-15T10:00:00Z',
          last_updated: '2025-08-20T10:00:00Z',
        },
        assistive_technology: [{ type: 'Speech-generating devices (SGDs)', status: 'Needed' }],
        registration_date: '2021-04-15T10:00:00Z',
      },
    ],
    transport_requirement: 'Point to point transportation',
    housing_type: 'Own home/rent',
    programs_enrolments: [{
      programme_identifier: 'CDG-001',
      programme_name: 'Child Disability Grant',
      programme_description: 'Monthly cash transfer for children with severe disabilities',
      implementing_institution: 'Ministry of Social Affairs',
      institution_type: '1',
      legal_status: '1',
      social_protection_functions: ['2'],
      contribution_type: '1',
      programme_type: '1',
    }],
    registration_date: '2021-04-15T10:00:00Z',
    last_updated: '2025-08-20T10:00:00Z',
  },

  // An older person, DR codes sent as codes (strings and JSON integers) instead of labels,
  // spec attribute namings (disability_level, programs_enrollments).
  elder: {
    personal_details: elder,
    disability_status: 0,
    disability_level: '3',
    disability_details: [
      { impairment_type: '1', impairment_level: '3', impairment_cause: '8', age_on_set: '3' },
      { impairment_type: 3, impairment_level: 2, impairment_cause: 8, age_on_set: 3 },
    ],
    disability_support: [{
      human_assistance: {
        type: 'communication',
        frequency: '3',
        support_status: '0',
        caregiver: { identifier: [id('UIN', '600000002')], name: { surname: 'Mensah', given_name: 'Kofi' } },
        relationship: 'GRNDSON',
      },
      assistive_technology: [{ type: '3', status: '1', registration_date: '2019-01-10' }],
      animal_assistance: [{ type: 'service_dog', status: '0', registration_date: '2024-03-01' }],
      medical_care: [{ type: 'maintenance_medicine', status: 1 }],
      registration_date: '2018-07-01',
      last_updated: '2024-03-01',
    }],
    transport_requirement: '0',
    housing_type: 2,
    programs_enrollments: [{ programme_identifier: 'OAG-2018', programme_name: 'Old Age Grant' }],
    registration_date: '2018-06-15',
    last_updated: '2024-03-01',
  },

  // Assessment still pending: no level yet, no support registered.
  pending: {
    personal_details: single,
    disability_status: 'Pending',
    disability_details: [{ impairment_type: 'Mobility', impairment_cause: 'Work accident', age_on_set: 'Working age' }],
    disability_support: [],
    transport_requirement: 'Adaptable vehical',
    registration_date: '2025-09-01',
  },

  // Assessment expired; personal details sent as person attributes (spec example form).
  expired: {
    personal_details: {
      identifier: [id('UIN', '800000001')],
      name: { first_name: 'Sara', last_name: 'Ali' },
      date_of_birth: '1995-03-03',
      gender: 'female',
    },
    disability_status: 'Expired',
    disability_level: 'Moderate',
    disability_details: [{ impairment_type: 'Mental', impairment_level: 'Moderate', impairment_cause: 'Illness', age_on_set: 'Childhood' }],
    housing_type: 'Living in relatives’ home',
    registration_date: '2015-01-20',
    last_updated: '2023-01-20',
  },

  // Only the member identifier of the person.
  minimal: { personal_details: { member_identifier: [id('UIN', 'M990000001')] } },
};

// get-disability-support results: the disability support of one person.
export const supportRecords = {
  full: { disabilities: pwdPersons.full.disability_support },
  elder: { disabilities: pwdPersons.elder.disability_support },
  // A person without registered support.
  pending: { disabilities: [] },
  // Support identified by the person it belongs to.
  identified: { personal_details: { member_identifier: [id('UIN', 'M600000001')] }, disabilities: pwdPersons.elder.disability_support },
};

export const records = {
  PWDPerson: pwdPersons,
  DRPerson: persons,
  Member: members,
  Group: groups,
  SupportRecord: supportRecords,
};

// ---------------------------------------------------------------------------
// Published spec examples that do NOT follow the DR data standard. They document the
// deviations the suite detects (values outside the DR code directory, a personal identifier
// sent as a string, a sex outside SexCategoryEnum).
// ---------------------------------------------------------------------------

// DisabledPerson example of dr_api_v1.0.0.yaml (SearchResponse / extensions/dr/DisabledPerson.yaml).
export const specPwdExample = {
  personal_details: {
    identifier: '123456',
    name: { first_name: 'John', last_name: 'Doe' },
    date_of_birth: '1990-05-15',
    gender: 'Male',
  },
  disability_status: 'Approved',
  disability_level: 'Severe',
  disability_details: [{
    impairment_type: 'Physical and movement related functions',
    impairment_level: 'Severe impairment or difficulty',
    impairment_cause: 'Work Accident',
    age_on_set: 'Working age',
  }],
  disability_support: [{ human_assistance: { frequency: 'Permanent', type: 'mobility', support_status: 'Required' } }],
  transport_requirement: 'Adaptable vehical',
  housing_type: 'Social housing',
  programs_enrollments: [{ programme_name: 'financial_assistance', programme_identifier: 'AD234' }],
  registration_date: '2023-01-10T00:00:00Z',
  last_updated: '2023-09-20T00:00:00Z',
};

// DisabilitySupport example of dr_api_v1.0.0.yaml (GetDisabilitySupportResponse).
export const specSupportExample = {
  disabilities: [{
    human_assistance: {
      type: 'mobility',
      frequency: 'Daily',
      support_status: 'Needed',
      caregiver: { id: 'Person_001', name: 'John Doe', identifier: '12345' },
      relationship: 'Parent',
      registration_date: '2024-01-15T10:00:00Z',
      last_updated: '2024-09-20T12:30:00Z',
    },
    assistive_technology: [],
    housing_support: [],
    medical_care: [],
    animal_assistance: [],
    registration_date: '2023-05-20T09:00:00Z',
    last_updated: '2024-10-01T11:15:00Z',
  }],
};

// ---------------------------------------------------------------------------
// Lookups, as a DR would resolve them
// ---------------------------------------------------------------------------
const listOrEmpty = (v) => (Array.isArray(v) ? v : []);
const identifiersOfPerson = (p) => listOrEmpty(p?.identifier);
const identifiersOfMember = (m) => [...listOrEmpty(m?.member_identifier), ...identifiersOfPerson(m?.demographic_info)];
const identifiersOfGroup = (g) => [
  ...listOrEmpty(g?.group_identifier),
  ...[g?.group_head_info, ...listOrEmpty(g?.member_list)].flatMap(identifiersOfMember),
];
// personal_details is a Member, or carries the person attributes directly.
const identifiersOfPwd = (p) => [...identifiersOfMember(p?.personal_details), ...identifiersOfPerson(p?.personal_details)];
export const identifiersOf = {
  PWDPerson: identifiersOfPwd,
  DRPerson: identifiersOfPerson,
  Member: identifiersOfMember,
  Group: identifiersOfGroup,
  SupportRecord: (r) => identifiersOfPwd(r),
};

const valuesOf = (ids) => [...new Set(ids.map((i) => i.identifier_value))];

// "<record type>|<identifier value>" → records. A person is found by its identifiers, a member
// by its member identifier or its person identifiers, a group by its group identifier or the
// identifiers of any of its members, a person with disability by the identifiers of its
// personal details.
export function recordsByIdentifier() {
  const index = {};
  for (const type of ['PWDPerson', 'DRPerson', 'Member', 'Group']) {
    for (const record of Object.values(records[type])) {
      for (const value of valuesOf(identifiersOf[type](record))) (index[`${type}|${value}`] ??= []).push(record);
    }
  }
  return index;
}

// Per identifier of a registered person with disability: what the three disability endpoints
// return (get-disability-support, get-disability-details, disabled).
const supportOf = { full: supportRecords.full, elder: supportRecords.elder, pending: supportRecords.pending };
// The personal details are reduced to what identifies the person (member or person identifiers).
const identificationOf = (details) => Object.fromEntries(['member_identifier', 'identifier']
  .filter((k) => listOrEmpty(details?.[k]).length).map((k) => [k, details[k]]));
const detailsOf = (pwd) => ({
  personal_details: identificationOf(pwd.personal_details),
  disability_status: pwd.disability_status,
  ...(pwd.disability_status_level !== undefined ? { disability_status_level: pwd.disability_status_level } : {}),
  ...(pwd.disability_level !== undefined ? { disability_level: pwd.disability_level } : {}),
  disability_details: pwd.disability_details,
});
// Only an approved assessment makes a person disabled ("yes"); pending and expired ones do not.
const isApproved = (status) => ['Approved', '0', 0].includes(status);

export function disabilityIndex() {
  const support = {};
  const details = {};
  const status = {};
  for (const [name, pwd] of Object.entries(pwdPersons)) {
    if (pwd.disability_status === undefined) continue;
    for (const value of valuesOf(identifiersOfPwd(pwd))) {
      if (supportOf[name]) support[value] = [supportOf[name]];
      details[value] = [detailsOf(pwd)];
      status[value] = isApproved(pwd.disability_status) ? 'yes' : 'no';
    }
  }
  return { support, details, status };
}

// Records matching the predicate and expression searches used by the tests (DR process flows).
export const predicateResults = {
  // Process flow 1: approved persons with a mobility impairment.
  PWDPerson: [pwdPersons.full, pwdPersons.elder],
  // Persons born before 1966 (old age grant eligibility).
  DRPerson: [persons.elder, persons.deceased],
  // Members registered as disabled.
  Member: [members.disabled, members.elder, members.single],
  // Households with poverty_score < 5 / group_size < 5.
  Group: [groups.full, groups.single],
};
