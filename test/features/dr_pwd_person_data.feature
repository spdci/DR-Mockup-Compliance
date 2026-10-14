@data
Feature: DR person with disability data rules (DO.DR.01 PWDPerson, DO.DR.02 DisabilityDetails)

The DCI Disability Registry data standard makes every PWDPerson attribute optional. A
record may disclose only the identifier of the person. But whenever an attribute IS sent it
must be correct: right type, right format, a value from the right code list (CD.DR.01 -
CD.DR.15, sent as the code or as its published label) and consistent with the rest of the
record.

This feature is the rule book. It runs offline (no API) and proves that the validator
applied to every person with disability returned by the API scenarios (search results,
get-disability-details, notifications, transaction status) accepts absent attributes,
accepts correct values and rejects incorrect ones.

Sources: dr_api_v1.0.0.yaml (DisabledPerson), DCI Disability Registry v1.0.0 data standard
(DO.DR.01, DO.DR.02, CD.DR.01, CD.DR.02, CD.DR.07 - CD.DR.10, CD.DR.14, CD.DR.15),
extensions/dr/v1/data (PWDPerson, DisabilityDetails, Member), extensions/dr/v1/code,
extensions/ibr/v1/data/Programme.jsonld.

  # ---------------------------------------------------------------------------
  # Reference records
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference person with disability "<record>" is valid DR data
    Given the "<record>" PWDPerson record
    Then the record should be valid

    Examples:
      | record  |
      | full    |
      | elder   |
      | pending |
      | expired |
      | minimal |

  Scenario: A person with disability with no attribute at all is accepted (nothing is mandatory)
    Given an empty PWDPerson record
    Then the record should be valid

  Scenario: The published spec DisabledPerson example does not follow the DR data standard
    Given the "spec example" PWDPerson record
    Then the record should be rejected because of:
      | /personal_details/identifier must be array                                                  |
      | /personal_details/gender must be equal to one of the allowed values                         |
      | /disability_details/0/impairment_type must be equal to one of the allowed values            |
      | /disability_details/0/impairment_level must be equal to one of the allowed values           |
      | /disability_details/0/impairment_cause must be equal to one of the allowed values           |
      | /disability_support/0/human_assistance/support_status must be equal to one of the allowed values |

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" PWDPerson record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                                     |
      | @context                                      |
      | @id                                           |
      | @type                                         |
      | personal_details                              |
      | personal_details.member_identifier            |
      | personal_details.demographic_info             |
      | personal_details.is_disabled                  |
      | personal_details.disability_info              |
      | personal_details.related_person               |
      | disability_status                             |
      | disability_status_level                       |
      | disability_details                            |
      | disability_details.0.impairment_type          |
      | disability_details.0.impairment_level         |
      | disability_details.0.impairment_cause         |
      | disability_details.0.age_on_set               |
      | disability_support                            |
      | disability_support.0.human_assistance         |
      | disability_support.0.assistive_technology     |
      | disability_support.0.housing_support          |
      | disability_support.0.medical_care             |
      | disability_support.0.animal_assistance        |
      | transport_requirement                         |
      | housing_type                                  |
      | programs_enrolments                           |
      | programs_enrolments.0.programme_name          |
      | programs_enrolments.0.programme_description   |
      | programs_enrolments.0.institution_type        |
      | registration_date                             |
      | last_updated                                  |

  # ---------------------------------------------------------------------------
  # Every code of every DR code list is accepted, as a code and as its published label
  # ---------------------------------------------------------------------------
  Scenario Outline: Every <list> value is accepted for <attribute>
    Given the "full" PWDPerson record
    Then every "<list>" code should be accepted as "<attribute>"

    Examples: Disability status (CD.DR.14) and level (CD.DR.15)
      | list                      | attribute               |
      | disabilityStatus          | disability_status       |
      | disabilityStatusLabel     | disability_status       |
      | disabilityLevel           | disability_status_level |
      | disabilityLevelLabel      | disability_status_level |

    Examples: Impairment level (CD.DR.02)
      | list                      | attribute                             |
      | impairmentLevel           | disability_details.0.impairment_level |
      | impairmentLevelLabel      | disability_details.0.impairment_level |

    Examples: Transport requirement (CD.DR.09) and housing type (CD.DR.10)
      | list                      | attribute             |
      | transportRequirement      | transport_requirement |
      | transportRequirementLabel | transport_requirement |
      | housingType               | housing_type          |
      | housingTypeLabel          | housing_type          |

  Scenario Outline: Every <list> value is accepted for <attribute> (spec naming)
    Given the "full" PWDPerson record
    When its "disability_status_level" attribute is removed
    Then every "<list>" code should be accepted as "<attribute>"

    Examples:
      | list                 | attribute        |
      | disabilityLevel      | disability_level |
      | disabilityLevelLabel | disability_level |

  Scenario Outline: Every <list> value is accepted for the impairment type of a single impairment
    Given the "full" PWDPerson record
    When its "disability_details.1" attribute is removed
    Then every "<list>" code should be accepted as "disability_details.0.impairment_type"

    Examples: Impairment type (CD.DR.01)
      | list                |
      | impairmentType      |
      | impairmentTypeLabel |

  Scenario: Numeric impairment type codes are also accepted as JSON integers
    Given the "full" PWDPerson record
    When its "disability_details.1" attribute is removed
    Then every "impairmentType" code should be accepted as a JSON integer for "disability_details.0.impairment_type"

  Scenario Outline: Every <list> value is accepted for the impairment cause when no age of onset is given
    Given the "full" PWDPerson record
    When its "disability_details.0.age_on_set" attribute is removed
    Then every "<list>" code should be accepted as "disability_details.0.impairment_cause"

    Examples: Impairment cause (CD.DR.08)
      | list                 |
      | impairmentCause      |
      | impairmentCauseLabel |

  Scenario Outline: Every <list> value is accepted for the age of onset when no cause is given
    Given the "full" PWDPerson record
    When its "disability_details.0.impairment_cause" attribute is removed
    Then every "<list>" code should be accepted as "disability_details.0.age_on_set"

    Examples: Age of onset (CD.DR.07)
      | list                 |
      | disabilityOnSet      |
      | disabilityOnSetLabel |

  Scenario Outline: Numeric <list> codes are also accepted as JSON integers for <attribute>
    Given the "full" PWDPerson record
    Then every "<list>" code should be accepted as a JSON integer for "<attribute>"

    Examples:
      | list                 | attribute                             |
      | disabilityStatus     | disability_status                     |
      | disabilityLevel      | disability_status_level               |
      | impairmentLevel      | disability_details.0.impairment_level |
      | transportRequirement | transport_requirement                 |
      | housingType          | housing_type                          |

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" PWDPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples: Personal details: a DR Member (data standard)
      | attribute        | value                                                                                                  |
      | personal_details | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M500000003"}]}                      |
      | personal_details | {"demographic_info":{"identifier":[{"identifier_type":"BRN","identifier_value":"BRN2012000303"}],"name":{"given_name":"Lina"},"sex":"female","birth_date":"2012-02-20"}} |
      | personal_details | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M1"}],"is_disabled":true,"disability_info":[{"disability_limitation_type":["MOB_SS"],"functional_severity":"4"}]} |
      | personal_details | {}                                                                                                     |

    Examples: Personal details: person attributes sent directly (spec example form)
      | attribute        | value                                                                                                  |
      | personal_details | {"identifier":[{"identifier_type":"UIN","identifier_value":"123456"}],"name":{"first_name":"John","last_name":"Doe"},"date_of_birth":"1990-05-15","gender":"male"} |
      | personal_details | {"identifier":[{"identifier_type":"UIN","identifier_value":"123456"}],"name":{"given_name":"John","surname":"Doe"},"birth_date":"1990-05-15","sex":"male"} |
      | personal_details | {"name":{"last_name":"Doe"},"birth_date":"1990-05-15","date_of_birth":"1990-05-15T00:00:00Z","sex":"other","gender":"other"} |

    Examples: Disability status and level, by code, label or integer
      | attribute               | value                                                           |
      | disability_status       | "Pending"                                                       |
      | disability_status       | "2"                                                             |
      | disability_status       | 0                                                               |
      | disability_status_level | "High Support Needs"                                            |
      | disability_status_level | "High Support Needs (sometimes called very severe or profound)" |
      | disability_status_level | 4                                                               |

    Examples: Disability details (0...* DisabilityDetails)
      | attribute          | value                                                                                                                         |
      | disability_details | []                                                                                                                            |
      | disability_details | [{"impairment_type":"Hearing"}]                                                                                               |
      | disability_details | [{"impairment_type":"Vision","impairment_level":"Mild","impairment_cause":"Illness","age_on_set":"Childhood"}]                 |
      | disability_details | [{"impairment_type":"2","impairment_level":"4","impairment_cause":"0","age_on_set":"0"}]                                      |
      | disability_details | [{"impairment_type":"Cognitive","impairment_cause":"Road accident","age_on_set":"Working age"},{"impairment_type":"Mental","impairment_cause":"Violence"}] |
      | disability_details | [{"impairment_type":"Hearing","impairment_cause":"Ageing","age_on_set":"Old age"},{"impairment_type":"Vision","impairment_cause":"8","age_on_set":3}] |
      | disability_details | [{"impairment_type":"Mobility","impairment_cause":"Armed conflict","age_on_set":"Working age"},{"impairment_type":"Speech","impairment_cause":"Domestic accident","age_on_set":"Childhood"}] |

    Examples: Transport, housing and programme enrolments
      | attribute             | value                                                                     |
      | transport_requirement | "Public transportation"                                                   |
      | housing_type          | "Living in relatives\u0027 home"                                          |
      | housing_type          | "Care institution"                                                        |
      | programs_enrolments   | []                                                                        |
      | programs_enrolments   | [{"programme_identifier":"P1"}]                                           |
      | programs_enrolments   | [{"programme_name":"Disability allowance"}]                               |
      | programs_enrolments   | [{"programme_identifier":"P1","programme_name":"A"},{"programme_identifier":"P2","programme_name":"B","programme_type":3}] |
      | programs_enrollments  | [{"programme_name":"financial_assistance","programme_identifier":"AD234"}] |

    Examples: Dates (ISO 8601)
      | attribute         | value                           |
      | registration_date | "2021-04-15"                    |
      | registration_date | "2012-02-20T10:20:15.123+02:00" |
      | last_updated      | "2026-01-01T00:00:00Z"          |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" PWDPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Personal details (member and person rules apply)
      | attribute                                     | value                                      | error                                                                                |
      | personal_details                              | "M500000003"                               | /personal_details must be object                                                     |
      | personal_details.member_identifier            | "M500000003"                               | /personal_details/member_identifier must be array                                    |
      | personal_details.member_identifier            | []                                         | /personal_details/member_identifier must NOT have fewer than 1 items                 |
      | personal_details.member_identifier.0.identifier_type | "NationalID"                        | /personal_details/member_identifier/0/identifier_type must be equal to one of the allowed values |
      | personal_details.identifier                   | "123456"                                   | /personal_details/identifier must be array                                           |
      | personal_details.name                         | {"first":"John"}                           | /personal_details/name must have required property                                  |
      | personal_details.gender                       | "Male"                                     | /personal_details/gender must be equal to one of the allowed values                  |
      | personal_details.sex                          | "F"                                        | /personal_details/sex must be equal to one of the allowed values                     |
      | personal_details.date_of_birth                | "15/05/1990"                               | /personal_details/date_of_birth must match pattern                                   |
      | personal_details.date_of_birth                | "1990-02-30"                               | personal_details.date_of_birth "1990-02-30" is not a valid ISO 8601 calendar date    |
      | personal_details.is_disabled                  | "yes"                                      | /personal_details/is_disabled must be equal to one of the allowed values             |
      | personal_details.disability_info.0.functional_severity | "a lot of difficulty"             | /personal_details/disability_info/0/functional_severity must be equal to one of the allowed values |
      | personal_details.demographic_info.birth_date  | "2999-01-01"                               | personal_details.demographic_info.birth_date "2999-01-01" is in the future           |
      | personal_details.demographic_info.phone_number | ["70123456"]                              | /personal_details/demographic_info/phone_number/0 must match pattern                 |

    Examples: Disability status (CD.DR.14) and level (CD.DR.15)
      | attribute               | value         | error                                                               |
      | disability_status       | "Confirmed"   | /disability_status must be equal to one of the allowed values       |
      | disability_status       | "approved"    | /disability_status must be equal to one of the allowed values       |
      | disability_status       | "3"           | /disability_status must be equal to one of the allowed values       |
      | disability_status       | true          | /disability_status must be equal to one of the allowed values       |
      | disability_status_level | "Profound"    | /disability_status_level must be equal to one of the allowed values |
      | disability_status_level | 0             | /disability_status_level must be equal to one of the allowed values |
      | disability_status_level | "level:2"     | /disability_status_level must be equal to one of the allowed values |
      | disability_level        | "Extreme"     | /disability_level must be equal to one of the allowed values        |

    Examples: Disability details (CD.DR.01 type, CD.DR.02 level, CD.DR.08 cause, CD.DR.07 onset)
      | attribute                             | value                                     | error                                                                              |
      | disability_details                    | {"impairment_type":"Mobility"}            | /disability_details must be array                                                  |
      | disability_details.0                  | "Mobility"                                | /disability_details/0 must be object                                               |
      | disability_details.0.impairment_type  | "Physical and movement related functions" | /disability_details/0/impairment_type must be equal to one of the allowed values   |
      | disability_details.0.impairment_type  | "mobility"                                | /disability_details/0/impairment_type must be equal to one of the allowed values   |
      | disability_details.0.impairment_type  | "7"                                       | /disability_details/0/impairment_type must be equal to one of the allowed values   |
      | disability_details.0.impairment_type  | "MOB_SS"                                  | /disability_details/0/impairment_type must be equal to one of the allowed values   |
      | disability_details.0.impairment_level | "Severe impairment or difficulty"         | /disability_details/0/impairment_level must be equal to one of the allowed values  |
      | disability_details.0.impairment_level | 5                                         | /disability_details/0/impairment_level must be equal to one of the allowed values  |
      | disability_details.0.impairment_cause | "Work Accident"                           | /disability_details/0/impairment_cause must be equal to one of the allowed values  |
      | disability_details.0.impairment_cause | "Accident"                                | /disability_details/0/impairment_cause must be equal to one of the allowed values  |
      | disability_details.0.impairment_cause | 9                                         | /disability_details/0/impairment_cause must be equal to one of the allowed values  |
      | disability_details.0.age_on_set       | "Teenage"                                 | /disability_details/0/age_on_set must be equal to one of the allowed values        |
      | disability_details.0.age_on_set       | "born with"                               | /disability_details/0/age_on_set must be equal to one of the allowed values        |
      | disability_details.0.age_on_set       | 4                                         | /disability_details/0/age_on_set must be equal to one of the allowed values        |

    Examples: Disability support (DO.DR.03, see dr_disability_support_data.feature)
      | attribute                                              | value             | error                                                                                              |
      | disability_support                                     | {"medical_care":[]} | /disability_support must be array                                                                |
      | disability_support.0.medical_care                      | {"type":"Constant healthcare"} | /disability_support/0/medical_care must be array                                      |
      | disability_support.0.assistive_technology.0.type       | "Crutches"        | /disability_support/0/assistive_technology/0/type must be equal to one of the allowed values       |
      | disability_support.0.human_assistance.0.intensity      | "Monthly"         | /disability_support/0/human_assistance/0/intensity must be equal to one of the allowed values      |
      | disability_support.1.human_assistance.support_status   | "Required"        | /disability_support/1/human_assistance/support_status must be equal to one of the allowed values   |

    Examples: Transport requirement (CD.DR.09) and housing type (CD.DR.10)
      | attribute             | value                    | error                                                             |
      | transport_requirement | "Adaptable vehicle"      | /transport_requirement must be equal to one of the allowed values |
      | transport_requirement | "Taxi"                   | /transport_requirement must be equal to one of the allowed values |
      | transport_requirement | 3                        | /transport_requirement must be equal to one of the allowed values |
      | housing_type          | "Apartment"              | /housing_type must be equal to one of the allowed values          |
      | housing_type          | "social housing"         | /housing_type must be equal to one of the allowed values          |
      | housing_type          | "0"                      | /housing_type must be equal to one of the allowed values          |

    Examples: Programme enrolments (IBR Programme)
      | attribute                               | value                               | error                                                                   |
      | programs_enrolments                     | {"programme_identifier":"P1"}       | /programs_enrolments must be array                                      |
      | programs_enrolments                     | ["CDG-001"]                         | /programs_enrolments/0 must be object                                   |
      | programs_enrolments                     | [{"programme_description":"Grant"}] | /programs_enrolments/0 must have required property 'programme_identifier' |
      | programs_enrolments.0.programme_identifier | ""                               | /programs_enrolments/0/programme_identifier must NOT have fewer than 1 characters |
      | programs_enrolments.0.programme_name    | 42                                  | /programs_enrolments/0/programme_name must be string                    |
      | programs_enrolments.0.programme_type    | "cash"                              | /programs_enrolments/0/programme_type must be equal to one of the allowed values |
      | programs_enrollments                    | [{"programme_identifier":1}]        | /programs_enrollments/0/programme_identifier must be string             |

    Examples: Dates
      | attribute         | value        | error                                                                |
      | registration_date | "15/04/2021" | /registration_date must match pattern                                |
      | registration_date | "2021-02-29" | registration_date "2021-02-29" is not a valid ISO 8601 calendar date |
      | registration_date | 1618480800   | /registration_date must be string                                    |
      | last_updated      | "2999-12-31" | last_updated "2999-12-31" is in the future                           |

    Examples: Linked data keywords
      | attribute | value | error                           |
      | @id       | 3     | /@id must be string             |
      | @type     | {}    | /@type must be string           |
      | @context  | 42    | /@context must be string,object |

  # ---------------------------------------------------------------------------
  # Cross-attribute consistency (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: Person with disability attributes must be consistent: <rule>
    Given the "<record>" PWDPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Chronology
      | rule                                   | record  | attribute                        | value        | error                                                                    |
      | registered before birth                | full    | registration_date                | "2010-01-01" | registration_date 2010-01-01 is before the birth date 2012-02-20 of the person |
      | last update before registration        | full    | last_updated                     | "2020-01-01" | last_updated 2020-01-01 is before registration_date 2021-04-15          |
      | registered before birth (person form)  | expired | registration_date                | "1990-01-01" | registration_date 1990-01-01 is before the birth date 1995-03-03 of the person |
      | member registered before birth         | full    | personal_details.registration_date | "2011-12-31" | personal_details.registration_date 2011-12-31 is before demographic_info.birth_date 2012-02-20 |

    Examples: Status and level
      | rule                                      | record | attribute                    | value   | error                                                                      |
      | approved but member not disabled          | full   | personal_details.is_disabled | false   | disability_status is "Approved" but personal_details.is_disabled is false  |
      | approved (code) but member not disabled   | elder  | personal_details.is_disabled | 0       | disability_status is "Approved" but personal_details.is_disabled is 0      |
      | level and its spec alias disagree         | full   | disability_level             | "Mild"  | disability_level "Mild" contradicts disability_status_level "Severe"       |
      | level code and label disagree             | elder  | disability_status_level      | "Severe" | disability_level "3" contradicts disability_status_level "Severe"         |

    Examples: Disability details
      | rule                                   | record | attribute          | value                                                                                                  | error                                                                                           |
      | impairment listed twice                | full   | disability_details | [{"impairment_type":"Mobility"},{"impairment_type":"3"}]                                               | disability_details[1] repeats the impairment_type "3" of disability_details[0]                   |
      | congenital impairment with late onset  | full   | disability_details | [{"impairment_type":"Mobility","impairment_cause":"Birth congenital","age_on_set":"Childhood"}]        | impairment_cause "Birth congenital" is a birth cause but age_on_set is "Childhood", not "Born With" |
      | birth complication with late onset     | full   | disability_details | [{"impairment_type":"Mobility","impairment_cause":"1","age_on_set":"2"}]                               | impairment_cause "1" is a birth cause but age_on_set is "2", not "Born With"                     |
      | ageing cause before old age            | full   | disability_details | [{"impairment_type":"Vision","impairment_cause":"Ageing","age_on_set":"Working age"}]                  | impairment_cause "Ageing" (ageing) requires age_on_set "Old age", not "Working age"              |
      | born with an acquired impairment       | full   | disability_details | [{"impairment_type":"Mobility","impairment_cause":"Road accident","age_on_set":"Born With"}]           | age_on_set "Born With" (born with) contradicts impairment_cause "Road accident"                  |

    Examples: Support and programmes
      | rule                         | record | attribute                                       | value                                                                     | error                                                                 |
      | caregiver is the person      | full   | disability_support.0.human_assistance.0.caregiver | {"identifier":[{"identifier_type":"UIN","identifier_value":"500000003"}]} | caregiver is the person with disability themselves (UIN\|500000003)  |
      | caregiver id is the person   | full   | disability_support.1.human_assistance.caregiver | {"id":"P3","name":"Lina Haddad","identifier":"500000003"}                 | caregiver is the person with disability themselves (500000003)        |
      | caregiver is the member      | elder  | disability_support.0.human_assistance.caregiver | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M600000001"}]} | caregiver is the person with disability themselves (UIN\|M600000001) |
      | programme listed twice       | full   | programs_enrolments                             | [{"programme_identifier":"CDG-001"},{"programme_identifier":"CDG-001"}]   | lists the programme "CDG-001" twice                                   |
      | programme in both namings    | full   | programs_enrollments                            | [{"programme_identifier":"CDG-001"}]                                      | lists the programme "CDG-001" twice                                   |

    Examples: Personal details sent as person attributes (spec form)
      | rule                                   | record  | attribute                     | value        | error                                                         |
      | date_of_birth and birth_date disagree  | expired | personal_details.birth_date   | "1995-03-04" | date_of_birth 1995-03-03 contradicts birth_date 1995-03-04    |
      | gender and sex disagree                | expired | personal_details.sex          | "male"       | gender "female" contradicts sex "male"                        |
      | duplicate identifiers                  | expired | personal_details.identifier   | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"UIN","identifier_value":"1"}] | personal_details.identifier contains duplicates: UIN\|1 |
      | death before birth                     | expired | personal_details.death_date   | "1990-01-01" | death_date 1990-01-01 is before date_of_birth 1995-03-03     |

  Scenario Outline: Consistent person with disability attributes are accepted: <case>
    Given the "<record>" PWDPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples:
      | case                                      | record  | attribute               | value                                                                                         |
      | registered on the day of birth            | expired | registration_date       | "1995-03-03"                                                                                  |
      | pending and member not (yet) disabled     | pending | personal_details.is_disabled | false                                                                                     |
      | expired assessment of a disabled member   | full    | disability_status       | "Expired"                                                                                     |
      | level and alias agree (code and label)    | full    | disability_level        | "2"                                                                                           |
      | same impairment type, other record        | elder   | disability_details      | [{"impairment_type":"Vision","impairment_cause":"Ageing","age_on_set":"Old age"},{"impairment_type":"Hearing","impairment_cause":"Ageing","age_on_set":"Old age"}] |
      | caregiver is another person               | full    | disability_support.0.human_assistance.0.caregiver | {"identifier":[{"identifier_type":"UIN","identifier_value":"500000002"}]} |
      | same programme in different enrolments    | full    | programs_enrollments    | [{"programme_identifier":"OTHER-01"}]                                                         |
