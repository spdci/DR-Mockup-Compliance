@data
Feature: DR disability support data rules (DO.DR.03 DisabilitySupport, DO.DR.04 - DO.DR.08)

The disability support of a person (returned by get-disability-support and carried in
PWDPerson.disability_support) lists the human assistance the person needs or receives
(DO.DR.04, with the caregiver and their relationship), assistive technology (DO.DR.05),
medical care (DO.DR.06), housing support (DO.DR.07) and animal assistance (DO.DR.08). Every
attribute is optional, but whatever is sent must be correct: a value of the right code list
(CD.DR.03 - CD.DR.06, CD.DR.11 - CD.DR.13, sent as the code or its published label), real
dates and a consistent support.

The data standard and the API schema name some attributes differently; both namings are
accepted and validated: human_assistance as a list (data standard) or a single object (API),
intensity / frequency, support / support_status, and a caregiver given as a DR Person (data
standard) or as { id, name, identifier } (API).

This feature runs offline and proves the rules applied to every support record returned by
the API scenarios.

Sources: dr_api_v1.0.0.yaml (GetDisabilitySupportResponse, DisabilitySupport),
extensions/dr/v1/data (DisabilitySupport, HumanAssistance, AssistiveTechnology, MedicalCare,
HousingSupport, AnimalAssistance), extensions/dr/v1/code, core/v1/code/RelationshipTypeEnum.

  # ---------------------------------------------------------------------------
  # Reference records
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference support record "<record>" is valid DR data
    Given the "<record>" SupportRecord record
    Then the record should be valid

    Examples:
      | record     |
      | full       |
      | elder      |
      | pending    |
      | identified |

  Scenario: A support record with no attribute at all is accepted (nothing is mandatory)
    Given an empty SupportRecord record
    Then the record should be valid

  Scenario: The published spec DisabilitySupport example does not follow the DR data standard
    Given the "spec example" SupportRecord record
    Then the record should be rejected because of:
      | /disabilities/0/human_assistance/relationship must be equal to one of the allowed values |

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" SupportRecord record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                                           |
      | disabilities                                        |
      | disabilities.0.human_assistance                     |
      | disabilities.0.human_assistance.0.type              |
      | disabilities.0.human_assistance.0.intensity         |
      | disabilities.0.human_assistance.0.support           |
      | disabilities.0.human_assistance.0.relationship      |
      | disabilities.1.human_assistance.relationship        |
      | disabilities.0.human_assistance.0.registration_date |
      | disabilities.1.human_assistance.frequency           |
      | disabilities.1.human_assistance.support_status      |
      | disabilities.1.human_assistance.caregiver.id        |
      | disabilities.1.human_assistance.caregiver.name      |
      | disabilities.0.assistive_technology                 |
      | disabilities.0.assistive_technology.0.status        |
      | disabilities.0.assistive_technology.0.last_updated  |
      | disabilities.0.housing_support                      |
      | disabilities.0.medical_care                         |
      | disabilities.0.medical_care.0.type                  |
      | disabilities.0.animal_assistance                    |
      | disabilities.0.registration_date                    |
      | disabilities.0.last_updated                         |

  # ---------------------------------------------------------------------------
  # Every code of every code list is accepted, as a code and as its published label
  # ---------------------------------------------------------------------------
  Scenario Outline: Every <list> value is accepted for <attribute>
    Given the "full" SupportRecord record
    Then every "<list>" code should be accepted as "<attribute>"

    Examples: Human assistance (CD.DR.03 type, CD.DR.04 frequency, CD.DR.05 status), data standard naming
      | list                     | attribute                                   |
      | humanAssistanceType      | disabilities.0.human_assistance.0.type      |
      | humanAssistanceTypeLabel | disabilities.0.human_assistance.0.type      |
      | supportFrequency         | disabilities.0.human_assistance.0.intensity |
      | supportFrequencyLabel    | disabilities.0.human_assistance.0.intensity |
      | supportStatus            | disabilities.0.human_assistance.0.support   |
      | supportStatusLabel       | disabilities.0.human_assistance.0.support   |

    Examples: Human assistance, API naming
      | list                     | attribute                                     |
      | humanAssistanceType      | disabilities.1.human_assistance.type          |
      | supportFrequency         | disabilities.1.human_assistance.frequency     |
      | supportFrequencyLabel    | disabilities.1.human_assistance.frequency     |
      | supportStatus            | disabilities.1.human_assistance.support_status |
      | supportStatusLabel       | disabilities.1.human_assistance.support_status |

    Examples: Caregiver relationship (RelationshipTypeEnum)
      | list             | attribute                                      |
      | relationshipType | disabilities.0.human_assistance.0.relationship |

    Examples: Assistive technology (CD.DR.06), medical care (CD.DR.11), housing support (CD.DR.12), animal assistance (CD.DR.13)
      | list                     | attribute                                  |
      | assistiveTechnology      | disabilities.0.assistive_technology.0.type |
      | assistiveTechnologyLabel | disabilities.0.assistive_technology.0.type |
      | medicalCare              | disabilities.0.medical_care.0.type         |
      | medicalCareLabel         | disabilities.0.medical_care.0.type         |
      | housingSupport           | disabilities.0.housing_support.0.type      |
      | housingSupportLabel      | disabilities.0.housing_support.0.type      |
      | animalAssistance         | disabilities.0.animal_assistance.0.type    |
      | animalAssistanceLabel    | disabilities.0.animal_assistance.0.type    |

    Examples: Status of an item of support (CD.DR.05)
      | list               | attribute                                    |
      | supportStatus      | disabilities.0.assistive_technology.0.status |
      | supportStatusLabel | disabilities.0.medical_care.0.status         |
      | supportStatus      | disabilities.0.housing_support.0.status      |
      | supportStatusLabel | disabilities.0.animal_assistance.0.status    |

  Scenario Outline: Numeric <list> codes are also accepted as JSON integers for <attribute>
    Given the "full" SupportRecord record
    Then every "<list>" code should be accepted as a JSON integer for "<attribute>"

    Examples:
      | list                | attribute                                    |
      | supportFrequency    | disabilities.1.human_assistance.frequency    |
      | supportStatus       | disabilities.0.human_assistance.0.support    |
      | assistiveTechnology | disabilities.0.assistive_technology.0.type   |
      | supportStatus       | disabilities.0.assistive_technology.0.status |

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" SupportRecord record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples: Human assistance as a list (data standard) or a single object (API)
      | attribute                       | value                                                                                    |
      | disabilities.0.human_assistance | []                                                                                       |
      | disabilities.0.human_assistance | {"type":"Decision Making","frequency":"Occasional","support_status":"Needed"}            |
      | disabilities.0.human_assistance | [{"type":"multiple","intensity":"1","support":"0"},{"type":"communication","intensity":4}] |
      | disabilities.0.human_assistance | [{"type":"basic_activity","frequency":"Daily","intensity":"2"}]                          |
      | disabilities.0.human_assistance | [{"type":"basic_activity","support":"Received","support_status":"1"}]                    |
      | disabilities.0.human_assistance | [{"intensity":"None","support":"Received"}]                                              |

    Examples: Caregiver (DR Person, Member reference or { id, name, identifier })
      | attribute                                   | value                                                                                    |
      | disabilities.0.human_assistance.0.caregiver | {"identifier":[{"identifier_type":"UIN","identifier_value":"500000002"}]}                |
      | disabilities.0.human_assistance.0.caregiver | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M500000002"}]}        |
      | disabilities.0.human_assistance.0.caregiver | {"name":{"given_name":"Rania","surname":"Haddad"},"sex":"female","phone_number":["+9616123457"]} |
      | disabilities.0.human_assistance.0.caregiver | {"id":"Person_001","name":"John Doe","identifier":"12345"}                               |
      | disabilities.0.human_assistance.0.caregiver | {"name":"Community health worker"}                                                       |
      | disabilities.0.human_assistance.0.caregiver | {}                                                                                       |

    Examples: Caregiver relationship (RelationshipTypeEnum)
      | attribute                                      | value     |
      | disabilities.0.human_assistance.0.relationship | "PRN"     |
      | disabilities.0.human_assistance.0.relationship | "GRNDSON" |
      | disabilities.0.human_assistance.0.relationship | "FAMMEMB" |

    Examples: Items of support
      | attribute                           | value                                                                                     |
      | disabilities.0.assistive_technology | []                                                                                        |
      | disabilities.0.assistive_technology | [{"type":"Hearing aids"}]                                                                 |
      | disabilities.0.assistive_technology | [{"type":"1","status":"Received"},{"type":"3","status":"Needed"}]                         |
      | disabilities.0.medical_care         | [{"type":"maintenance_medicine","status":"0","registration_date":"2022-01-01","last_updated":"2023-01-01"}] |
      | disabilities.0.housing_support      | [{"type":"Relocation","status":"Needed"},{"type":"utility_cost","status":"Received"}]     |
      | disabilities.0.animal_assistance    | [{"type":"Therapy Animal","status":"Needed"}]                                             |
      | disabilities.0.animal_assistance    | [{"type":"other"}]                                                                        |

    Examples: Dates
      | attribute                                        | value                  |
      | disabilities.0.registration_date                 | "2021-04-15T10:00:00Z" |
      | disabilities.0.human_assistance.0.last_updated   | "2026-01-01"           |
      | disabilities.0.assistive_technology.0.registration_date | "2021-05-01T00:00:00+02:00" |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" SupportRecord record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Structure
      | attribute                           | value                             | error                                                     |
      | disabilities                        | {"medical_care":[]}               | /disabilities must be array                               |
      | disabilities.0                      | "wheelchair"                      | /disabilities/0 must be object                            |
      | disabilities.0.human_assistance     | "mobility"                        | /disabilities/0/human_assistance must be object           |
      | disabilities.0.assistive_technology | {"type":"Wheelchairs"}            | /disabilities/0/assistive_technology must be array        |
      | disabilities.0.assistive_technology | ["Wheelchairs"]                   | /disabilities/0/assistive_technology/0 must be object     |
      | disabilities.0.medical_care         | "Constant healthcare"             | /disabilities/0/medical_care must be array                |
      | disabilities.0.housing_support      | [1]                               | /disabilities/0/housing_support/0 must be object          |
      | disabilities.0.animal_assistance    | {}                                | /disabilities/0/animal_assistance must be array           |

    Examples: Human assistance type (CD.DR.03), frequency (CD.DR.04), status (CD.DR.05)
      | attribute                                      | value            | error                                                                                     |
      | disabilities.0.human_assistance.0.type         | "Mobility"       | /disabilities/0/human_assistance/0/type must be equal to one of the allowed values        |
      | disabilities.0.human_assistance.0.type         | "Personal care"  | /disabilities/0/human_assistance/0/type must be equal to one of the allowed values        |
      | disabilities.0.human_assistance.0.type         | 1                | /disabilities/0/human_assistance/0/type must be equal to one of the allowed values        |
      | disabilities.0.human_assistance.0.intensity    | "Monthly"        | /disabilities/0/human_assistance/0/intensity must be equal to one of the allowed values   |
      | disabilities.0.human_assistance.0.intensity    | "daily"          | /disabilities/0/human_assistance/0/intensity must be equal to one of the allowed values   |
      | disabilities.0.human_assistance.0.intensity    | 6                | /disabilities/0/human_assistance/0/intensity must be equal to one of the allowed values   |
      | disabilities.0.human_assistance.0.support      | "Required"       | /disabilities/0/human_assistance/0/support must be equal to one of the allowed values     |
      | disabilities.0.human_assistance.0.support      | "2"              | /disabilities/0/human_assistance/0/support must be equal to one of the allowed values     |
      | disabilities.1.human_assistance.frequency      | "Permanently"    | /disabilities/1/human_assistance/frequency must be equal to one of the allowed values     |
      | disabilities.1.human_assistance.support_status | "Required"       | /disabilities/1/human_assistance/support_status must be equal to one of the allowed values |
      | disabilities.1.human_assistance.support_status | true             | /disabilities/1/human_assistance/support_status must be equal to one of the allowed values |

    Examples: Caregiver and relationship
      | attribute                                         | value                                      | error                                                                                         |
      | disabilities.0.human_assistance.0.caregiver       | "Omar Haddad"                              | /disabilities/0/human_assistance/0/caregiver must be object                                   |
      | disabilities.0.human_assistance.0.caregiver.identifier | []                                    | /disabilities/0/human_assistance/0/caregiver/identifier must NOT have fewer than 1 items      |
      | disabilities.0.human_assistance.0.caregiver.identifier | [{"identifier_type":"NID","identifier_value":"1"}] | /disabilities/0/human_assistance/0/caregiver/identifier/0/identifier_type must be equal to one of the allowed values |
      | disabilities.0.human_assistance.0.caregiver.name  | {"title":"Mr."}                            | /disabilities/0/human_assistance/0/caregiver/name must have required property                |
      | disabilities.0.human_assistance.0.caregiver.name  | 42                                         | /disabilities/0/human_assistance/0/caregiver/name must be string                              |
      | disabilities.0.human_assistance.0.caregiver.sex   | "Male"                                     | /disabilities/0/human_assistance/0/caregiver/sex must be equal to one of the allowed values   |
      | disabilities.0.human_assistance.0.caregiver.birth_date | "1978-02-30"                          | caregiver.birth_date "1978-02-30" is not a valid ISO 8601 calendar date                       |
      | disabilities.1.human_assistance.caregiver.id      | ""                                         | /disabilities/1/human_assistance/caregiver/id must NOT have fewer than 1 characters           |
      | disabilities.1.human_assistance.caregiver.identifier | 12345                                   | /disabilities/1/human_assistance/caregiver/identifier must be string                          |
      | disabilities.0.human_assistance.0.relationship    | "Parent"                                   | /disabilities/0/human_assistance/0/relationship must be equal to one of the allowed values    |
      | disabilities.0.human_assistance.0.relationship    | "father"                                   | /disabilities/0/human_assistance/0/relationship must be equal to one of the allowed values    |
      | disabilities.0.human_assistance.0.relationship    | "fth"                                      | /disabilities/0/human_assistance/0/relationship must be equal to one of the allowed values    |

    Examples: Items of support (CD.DR.06, CD.DR.11, CD.DR.12, CD.DR.13, CD.DR.05)
      | attribute                                    | value              | error                                                                                     |
      | disabilities.0.assistive_technology.0.type   | "Crutches"         | /disabilities/0/assistive_technology/0/type must be equal to one of the allowed values    |
      | disabilities.0.assistive_technology.0.type   | "wheelchairs"      | /disabilities/0/assistive_technology/0/type must be equal to one of the allowed values    |
      | disabilities.0.assistive_technology.0.type   | 4                  | /disabilities/0/assistive_technology/0/type must be equal to one of the allowed values    |
      | disabilities.0.assistive_technology.0.status | "Delivered"        | /disabilities/0/assistive_technology/0/status must be equal to one of the allowed values  |
      | disabilities.0.medical_care.0.type           | "Surgery"          | /disabilities/0/medical_care/0/type must be equal to one of the allowed values            |
      | disabilities.0.medical_care.0.type           | "1"                | /disabilities/0/medical_care/0/type must be equal to one of the allowed values            |
      | disabilities.0.housing_support.0.type        | "Ramp"             | /disabilities/0/housing_support/0/type must be equal to one of the allowed values         |
      | disabilities.0.housing_support.0.type        | "home adaptation"  | /disabilities/0/housing_support/0/type must be equal to one of the allowed values         |
      | disabilities.0.housing_support.0.status      | "Pending"          | /disabilities/0/housing_support/0/status must be equal to one of the allowed values       |
      | disabilities.0.animal_assistance             | [{"type":"Guide horse"}] | /disabilities/0/animal_assistance/0/type must be equal to one of the allowed values |
      | disabilities.0.animal_assistance             | [{"type":"service dog"}] | /disabilities/0/animal_assistance/0/type must be equal to one of the allowed values |

    Examples: Dates
      | attribute                                               | value        | error                                                                           |
      | disabilities.0.registration_date                        | "15/04/2021" | /disabilities/0/registration_date must match pattern                            |
      | disabilities.0.last_updated                             | "2025-13-01" | /disabilities/0/last_updated must match pattern                                 |
      | disabilities.0.human_assistance.0.registration_date     | "2021-04-31" | human_assistance[0].registration_date "2021-04-31" is not a valid ISO 8601 calendar date |
      | disabilities.0.assistive_technology.0.registration_date | "2999-05-01" | assistive_technology[0].registration_date "2999-05-01" is in the future         |
      | disabilities.0.medical_care.0.registration_date         | 20210415     | /disabilities/0/medical_care/0/registration_date must be string                 |

  # ---------------------------------------------------------------------------
  # Consistency of the support (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: The support must be consistent: <rule>
    Given the "<record>" SupportRecord record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                                       | record     | attribute                                         | value                                                          | error                                                                              |
      | support not needed but needed              | full       | disabilities.1.human_assistance                   | {"type":"mobility","frequency":"None","support_status":"Needed"} | human_assistance.frequency is "None" (support not needed) but support_status is "Needed" |
      | support not needed but needed (codes)      | full       | disabilities.0.human_assistance                   | [{"intensity":"5","support":0}]                                | human_assistance[0].intensity is "None" (support not needed) but support is "Needed" |
      | frequency and intensity disagree           | full       | disabilities.0.human_assistance                   | [{"frequency":"Daily","intensity":"Weekly"}]                   | frequency "Daily" contradicts intensity "Weekly"                                   |
      | support_status and support disagree        | full       | disabilities.0.human_assistance                   | [{"support_status":"Needed","support":"1"}]                    | support_status "Needed" contradicts support "1"                                    |
      | relationship without a caregiver           | full       | disabilities.0.human_assistance                   | [{"type":"mobility","relationship":"MTH"}]                     | relationship "MTH" is given without the caregiver it describes                     |
      | same support type listed twice             | full       | disabilities.0.assistive_technology               | [{"type":"Wheelchairs"},{"type":"1"}]                          | assistive_technology[1] repeats the support type "1" of assistive_technology[0]    |
      | same housing support listed twice          | full       | disabilities.0.housing_support                    | [{"type":"relocation"},{"type":"Relocation"}]                  | housing_support[1] repeats the support type "Relocation" of housing_support[0]     |
      | support updated before registration        | full       | disabilities.0.last_updated                       | "2020-01-01"                                                   | disabilities[0].last_updated 2020-01-01 is before registration_date 2021-04-15     |
      | assistance updated before registration     | full       | disabilities.0.human_assistance.0.last_updated    | "2021-01-01"                                                   | human_assistance[0].last_updated 2021-01-01 is before registration_date 2021-04-15 |
      | item updated before registration           | full       | disabilities.0.assistive_technology.0.last_updated | "2021-04-30"                                                  | assistive_technology[0].last_updated 2021-04-30 is before registration_date 2021-05-01 |
      | caregiver died before birth                | full       | disabilities.0.human_assistance.0.caregiver.death_date | "1970-01-01"                                              | caregiver.death_date 1970-01-01 is before birth_date 1978-03-12                    |
      | caregiver is the person (member id)        | identified | disabilities.0.human_assistance.caregiver         | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M600000001"}]} | caregiver is the person with disability themselves (UIN\|M600000001) |
      | caregiver is the person (API identifier)   | identified | disabilities.0.human_assistance.caregiver         | {"id":"P1","identifier":"M600000001"}                          | caregiver is the person with disability themselves (M600000001)                    |
