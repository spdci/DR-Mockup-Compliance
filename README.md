# DISABILITY Registry Compliance and Mockup

Compliance test suite and mock API for the **DCI Disability Registry (DR) API v1.0.0**
([`dr_api_v1.0.0.yaml`](https://github.com/spdci/api-standards)), checking the DR data standard:
PWDPerson (DO.DR.01), DisabilityDetails (DO.DR.02), DisabilitySupport (DO.DR.03), HumanAssistance
(DO.DR.04), AssistiveTechnology (DO.DR.05), MedicalCare (DO.DR.06), HousingSupport (DO.DR.07),
AnimalAssistance (DO.DR.08), the DR Person, Member and Group, and the code directory
CD.DR.01-CD.DR.15. The data objects and code lists come from
[`spdci/schemas`](https://github.com/spdci/schemas) (`extensions/dr/v1`, `core/v1`, and
`extensions/ibr/v1` for the Programme of an enrolment).

## What is covered

All 13 endpoints of the standard, split by the system that exposes them:

| Side | Endpoint (mock path) | Spec path | Mock behaviour |
|---|---|---|---|
| DR | `dr/sync/search` | `/registry/sync/search` | Search results (header `on-search` + SearchResponse) |
| DR | `dr/search` | `/registry/search` | ACK, then `on-search` callback to `header.sender_uri` |
| DR | `dr/subscribe` | `/registry/subscribe` | ACK, then `on-subscribe` callback |
| DR | `dr/unsubscribe` | `/registry/unsubscribe` | ACK, then `on-unsubscribe` callback |
| DR | `dr/txn/status` | `/registry/txn/status` | ACK, then `txn/on-status` callback |
| DR | `dr/sync/get-disability-support` | `/registry/sync/get-disability-support` | Disability support of a person (GetDisabilitySupportResponse) |
| DR | `dr/sync/get-disability-details` | `/registry/sync/get-disability-details` | Disability details of a person (GetDisabilityInfoResponse) |
| DR | `dr/sync/disabled` | `/registry/sync/disabled` | Is the person disabled, `yes` / `no` (DisabledResponse) |
| DR | `dr/sync/get-disability-status` | summary name of `/registry/sync/disabled` | Same as `dr/sync/disabled` (path of earlier versions of this mock) |
| SP | `dr/on-search` | `/registry/on-search` | ACK |
| SP | `dr/on-subscribe` | `/registry/on-subscribe` | ACK |
| SP | `dr/on-unsubscribe` | `/registry/on-unsubscribe` | ACK |
| SP | `dr/txn/on-status` | `/registry/txn/on-status` | ACK |
| SP | `dr/notify` | `/registry/notify` | ACK |

Every mock endpoint validates the request against the spec schema and answers an `ERR`
acknowledgement (`err.request.bad`, HTTP 400) when it does not conform.

A search targets one DR record type, given by `search_criteria.reg_record_type` (or
`response_entity`, as in DR process flow 3):

- **person with disability search** (`PWDPerson`, also named `DisabledPerson` / `PWD_Person`,
  bare or namespaced as `spdci-extensions-dci:DisabledPerson`): by the member identifier or any
  identifier of the person. Without a record type the DR returns persons with disability, as the
  spec's SearchResponse declares;
- **person search** (`DRPerson`): by identifier (UIN, BRN, MRN, DRN);
- **member search** (`Member`): by member identifier or by the identifier of the member's person;
- **group search** (`Group`): by group identifier, or the household of a person by the
  identifier of any of its members.

The three disability endpoints designate the person in `disabled_criteria`, in the form of the
spec example (`{"member.member_identifier": {"eq": "..."}}`), of process flow 2
(`{"personal_details.member_identifier": {"eq": "..."}}`) or as an `idtype-value` query.

The test suite (`test/features`, 1178 scenarios) checks, per endpoint:

- **smoke**: status, JSON content type, response time, response schema;
- **functional**: person with disability, person, member and group search by every identifier
  type; the eligibility queries of the DR process flows (approved persons with a mobility
  impairment, persons born before 1966, disabled members, households with `poverty_score` < 5)
  as `predicate`, `expression` and `graphql` queries; batch requests, including batches mixing
  record types; pagination, sorting, locale, consent/authorize; not-found and rejected results;
  disability support, details and status of approved, pending, expired, not disabled and unknown
  persons; every DR record type in notifications and subscriptions; every status reason code;
  every txn type (`search`, `subscribe`, `unsubscribe`) and attribute type;
- **callback**: the full async round trip. The suite starts a listener, sends it as
  `header.sender_uri`, and validates the callback the DR sends back;
- **negative**: requests that break the spec must be refused using one of the spec's error forms
  (`ERR` ack, HttpErrorResponse, or a `rjct` status with a reason);
- **data** (`dr_pwd_person_data.feature`, `dr_disability_support_data.feature`,
  `dr_person_data.feature`, `dr_member_data.feature`, `dr_group_data.feature`, offline): the DR
  data rules.

### DR data rules

Every DR attribute is optional, so a record may disclose only an identifier. But whenever an
attribute **is** sent it must be correct. Every record returned or sent by any endpoint (search
results, disability support and details, notifications, transaction status) is checked against
the rules of its record type. Registry-specific extension attributes are allowed.

DR code lists accept the code or its published label, exactly as published: the DR API examples
exchange labels (`"Approved"`, `"Working age"`, `"Adaptable vehical"`) while the code directory
numbers them. Numeric codes are accepted as strings (`"3"`) or JSON integers (`3`). Anything else
is rejected, including a different case (`"approved"`), a label of another list (`"MOB_SS"` for
an impairment type) or a free text (`"Physical and movement related functions"`).

**Person with disability (PWDPerson, DO.DR.01)**

| Attribute | Rule when present |
|---|---|
| `personal_details` | a DR Member (all member rules); the person attributes may also be sent directly (`identifier`, `name`, `birth_date`, `sex`, or the spec example's `date_of_birth` and `gender`): all person rules apply |
| `disability_status` | CD.DR.14: `0` Approved, `1` Pending, `2` Expired |
| `disability_status_level` / `disability_level` | CD.DR.15: `1` High Support Needs, `2` Severe, `3` Moderate, `4` Mild |
| `disability_details` | list of DisabilityDetails: `impairment_type` CD.DR.01 (Vision, Hearing, Mobility, Cognitive, Speech, Mental), `impairment_level` CD.DR.02 (Mild, Moderate, Severe, Extreme), `impairment_cause` CD.DR.08 (Birth congenital ... Ageing), `age_on_set` CD.DR.07 (Born With, Childhood, Working age, Old age) |
| `disability_support` | list of DisabilitySupport (see below) |
| `transport_requirement` | CD.DR.09: Public transportation, Point to point transportation, Adaptable vehical |
| `housing_type` | CD.DR.10: Own home/rent, Living in relatives’ home, Social housing, Care institution |
| `programs_enrolments` / `programs_enrollments` | list of IBR Programme, each identified by `programme_identifier` or `programme_name`; IBR code lists for `institution_type`, `legal_status`, `social_protection_functions`, `contribution_type`, `programme_type` |
| `registration_date`, `last_updated` | ISO 8601 date or date-time, real calendar date, not in the future |
| Consistency | registration ≥ birth of the person; last update ≥ registration; an `Approved` status contradicts `personal_details.is_disabled` false / 0; `disability_level` and `disability_status_level` agree; an impairment type is listed once; a birth cause (congenital, birth complication) means onset `Born With` and `Born With` means a birth cause; `Ageing` means onset `Old age`; the caregiver is not the person; a programme is listed once |

**Disability support (DisabilitySupport and its items, DO.DR.03-DO.DR.08)**

| Attribute | Rule when present |
|---|---|
| `human_assistance` | a HumanAssistance, or a list of them: `type` CD.DR.03 (basic_activity, mobility, communication, decision_making, multiple), `frequency` / `intensity` CD.DR.04 (Permanent, Daily, Weekly, Occasional, None), `support_status` / `support` CD.DR.05 (Needed, Received), `caregiver` (a DR Person, a Member reference or `{ id, name, identifier }`), `relationship` RelationshipTypeEnum, dates |
| `assistive_technology` | list of `{ type` CD.DR.06 (Wheelchairs, Speech-generating devices (SGDs), Hearing aids), `status` CD.DR.05, dates `}` |
| `medical_care` | list of `{ type` CD.DR.11 (maintenance_medicine, specialized_habitation, constant_healthcare), `status`, dates `}` |
| `housing_support` | list of `{ type` CD.DR.12 (home_adaptation, relocation, utility_cost), `status`, dates `}` |
| `animal_assistance` | list of `{ type` CD.DR.13 (service_dog, therapy_animal, other), `status`, dates `}` |
| Consistency | frequency `None` contradicts status `Needed`; `frequency` and `intensity`, `support_status` and `support` agree when both are sent; a `relationship` needs the caregiver it describes; a support type is listed once per kind; last update ≥ registration at every level; the caregiver follows the person rules |

**Person (DR Person, a core Person)**: `identifier` (IdentifierTypeEnum UIN, BRN, MRN, DRN, no
duplicates), `name` (at least `surname`, `given_name`, `last_name` or `first_name`), `sex`
(male, female, other, unknown), `birth_date` / `death_date` / `registration_date` / `last_updated`
(ISO 8601, real dates, not in the future, death ≥ birth, registration ≥ birth, last update ≥
registration), `address` (Address object or list, ISO 3166 `country_code`, plus code, geo bounds),
`phone_number` (E.164), `email` (RFC 5322).

**Member (DR Member)**: `member_identifier`, `demographic_info` (person rules), `related_person`
(RelationshipTypeEnum, 107 codes; not related to itself except as `SELF`), `is_disabled` (boolean
or 1 / 0), `disability_info` (WG-SS `disability_limitation_type` VIS_SS, HEAR_SS, MOB_SS, COG_SS,
SC_SS, COM_SS, `functional_severity` 1-4, a severity needs its limitation type),
`marital_status`, `employment_status` (1-8), `occupation` (0-9), `income_level`,
`education_level` (0-8), `language_code` (ISO 639), `additional_attributes`, dates.

**Group (DR Group)**: `group_identifier`, `group_type` (AssistanceUnitEnum 1-3),
`geographical_location` / `place` (Place, coordinates in range), `address`, `place_address` (1
needs a place, 0 an address), `poverty_score` (number), `group_head_info` (one of the listed
members), `group_size` (integer ≥ 1, not smaller than the members listed), `member_list` (member
rules, no member listed twice), dates.

The rules live in `test/features/support/helpers/schemas.js` (JSON Schema) and
`test/features/support/helpers/validator.js` (cross-field rules). The data features prove each
rule: they accept each attribute when absent, accept every code and label of every code list and
correct values in every allowed form, and reject incorrect ones.

### Where the spec is ambiguous

The published sources disagree in places. The suite accepts both forms and validates whichever
is sent:

- DR codes: published labels (API examples) or codes (code directory), see above;
- `personal_details`: a Member (data standard) or the person attributes directly (spec
  example); `date_of_birth` / `gender` (spec example) as aliases of `birth_date` / `sex`, and
  `first_name` / `last_name` as aliases of `given_name` / `surname`;
- `disability_status_level` (data standard) and `disability_level` (spec example);
- `programs_enrolments` (data standard) and `programs_enrollments` (spec example);
- `human_assistance`: a list (data standard) or a single object (API schema); `intensity` /
  `support` (data standard) and `frequency` / `support_status` (API schema); the caregiver as a
  DR Person (data standard) or `{ id, name, identifier }` (API schema);
- `reg_records`: the spec declares a single object; search results usually carry a list. Both
  are accepted. Without a `reg_record_type`, `reg_records` are persons with disability;
- `disabled_criteria`: the spec declares no required property. The suite requires a non-empty
  `query`, without which nothing identifies the person;
- `/registry/sync/disabled` is summarised as `/registry/sync/get-disability-status`: the mock
  serves both paths;
- `reg_event_type`: the DR RegistryEventType is `register` (lower case), bare or namespaced.
  The process flow examples use other events (`DisabledPerson`, `NewDisabledNewborn`) that the
  spec does not define: they are rejected.

The published DisabledPerson and DisabilitySupport examples do not follow the DR data standard
themselves: `dr_pwd_person_data.feature` and `dr_disability_support_data.feature` list exactly
what is wrong with them (`personal_details.identifier` as a string, `gender` "Male", impairment
type, level and cause outside CD.DR.01, CD.DR.02 and CD.DR.08, support status "Required",
relationship "Parent").

## Prerequisites

Docker and Docker Compose. To run without Docker you need Node.js 18 or later.

## Run the mocks

```bash
./test_entrypoint.sh
```

The DR endpoints are served on port **3333** and the SP endpoints on port **3334**. Run
`GET /healthcheck` on either port to check they are up.

The mocks are generated from the test suite's schemas and records, so the two always agree.
After changing `schemas.js` or `fixtures/records.js`, regenerate them and rebuild:

```bash
node mock/generate-mocks.mjs
```

The generated `mockoon-dr.json` and `mockoon-sp.json` can be opened in the Mockoon desktop app
(v9 or later).

Mock test data. The mock DR holds three households, their members and the persons with
disability among them:

| Record type | Profile | Identifier |
|---|---|---|
| PWDPerson | full (every attribute, labels, both support forms): child born with a mobility impairment, approved | UIN `M500000003`, UIN `500000003`, BRN `BRN2012000303` |
| PWDPerson | elder (codes instead of labels, spec namings): vision and mobility impairments from ageing, approved | UIN `M600000001` |
| PWDPerson | pending assessment (work accident) | UIN `M700000001` |
| PWDPerson | expired assessment, personal details as person attributes | UIN `800000001` |
| PWDPerson | minimal (identifier only) | UIN `M990000001` |
| DRPerson | full, multi, child, newborn, elder, caregiver, deceased, single, minimal | UIN `500000001`, MRN `MRN2005000222`, UIN `500000003`, BRN `BRN2025000505`, UIN `600000001`, UIN `600000002`, DRN `DRN2019000777`, UIN `700000001`, UIN `590000001` |
| Member | full (head), spouse, disabled (child), newborn, elder, caregiver, single, minimal | UIN `M500000001` ... `M500000004`, `M600000001`, `M600000002`, `M700000001`, `M900000001` |
| Group | full (household of 4 with a disabled child), large (family located by place), single, minimal | UIN `GRP-DR-1001`, `GRP-DR-3001`, `GRP-DR-4001`, `GRP-DR-2001` |

The disability endpoints answer for these persons: support for the full, elder and pending
persons, details for every person with disability, and disabled status `yes` for the approved
ones (full, elder) and `no` for everyone else. Predicate, expression and graphql searches return
the approved persons with disability, the persons born before 1966, the disabled members and the
households with `poverty_score` < 5. The value `TOOMANY000` is rejected with
`rjct.search.too_many_records_found`. Any other identifier returns an empty result.

## Run the compliance tests

With Docker:

```bash
cd test && ./test_entrypoint.sh
```

Without Docker:

```bash
cd test && npm install && npx cucumber-js
```

Reports are written to `test/result` (HTML, JUnit XML, Cucumber messages).

### Testing your own implementation

| Variable | Default | Purpose |
|---|---|---|
| `DR_BASE_URL` | `http://127.0.0.1:3333/` | DR under test (search, subscribe, get-disability-*, disabled, ...) |
| `SP_BASE_URL` | `http://127.0.0.1:3334/` | SP under test (on-search, notify, ...) |
| `CALLBACK_PORT` / `CALLBACK_BASE_URL` | `3335` / `http://127.0.0.1:3335/` | Listener used as `header.sender_uri`; must be reachable from the DR under test |
| `TEST_DATA_FILE` | none | JSON overriding the identifiers searched (see `helpers/testdata.js`) |
| `AUTH_TOKEN` | none | Sent as `Authorization: Bearer <token>` |
| `RESPONSE_TIMEOUT_MS` / `CALLBACK_TIMEOUT_MS` | `15000` / `10000` | Timeouts |
| `CUCUMBER_TAGS` (Docker only) | none | Tag expression to select scenarios |

Endpoint paths are listed in `test/features/support/helpers/helpers.js`.

A `TEST_DATA_FILE` names, per record type, identifiers that exist in your registry, and the
persons to query on the disability endpoints:

```json
{
  "records": {
    "PWDPerson": { "full": { "identifier_type": "UIN", "identifier_value": "PWD-0042" } },
    "Group": { "full": { "identifier_type": "UIN", "identifier_value": "HH-0042" } }
  },
  "disability": {
    "approved": { "identifier_type": "UIN", "identifier_value": "PWD-0042" },
    "pending": { "identifier_type": "UIN", "identifier_value": "PWD-0077" }
  }
}
```

Select scenarios with tags:

| Tag | Scenarios |
|---|---|
| `@smoke` | basic checks for each endpoint |
| `@functional` | use cases |
| `@pwd`, `@person`, `@member`, `@group` | sync search by record type |
| `@callback` | async round trips (need the listener to be reachable) |
| `@negative` | invalid requests |
| `@data` | offline DR data rules |
| `@strict-data` | SP must reject callbacks with invalid DR data |
| `@mock` | relies on mock-only test data |

For example, to test a real DR:

```bash
DR_BASE_URL=https://dr.example.org/ TEST_DATA_FILE=./my-data.json npx cucumber-js --tags "not @mock"
```
