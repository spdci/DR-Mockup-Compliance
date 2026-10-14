@data
Feature: DR member data rules (DR Member, core RelatedPerson and DisabilityInfo)

A DR Member (Member.jsonld) is a core Member whose demographic_info is a DR Person. It is
also the personal_details of every person with disability. Every Member attribute is
optional, but whenever one IS sent it must be correct: a code from the code directory, the
right data type and consistent with the rest of the record. The member's demographic_info
follows the person data rules; is_disabled and disability_info (WG-SS functional
limitations) describe the member's disability.

This feature runs offline and proves the rules applied to every member returned by the
API scenarios (member search results, group_head_info and member_list of every group,
personal_details of every person with disability).

Sources: extensions/dr/v1/data/Member.jsonld, core/v1/data (Member, RelatedPerson,
DisabilityInfo), core/v1/code (MaritalStatusEnum, EmploymentStatusEnum, OccupationEnum,
EducationCode, RelationshipTypeEnum, FunctionalLimitationType, FunctionalSeverityEnum,
LanguageCodeEnum, IncomeLevelEnum).

  # ---------------------------------------------------------------------------
  # Reference records
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference member "<record>" is valid DR data
    Given the "<record>" Member record
    Then the record should be valid

    Examples:
      | record    |
      | full      |
      | minimal   |
      | spouse    |
      | disabled  |
      | newborn   |
      | elder     |
      | caregiver |
      | single    |

  Scenario: A member with no attribute at all is accepted (nothing is mandatory)
    Given an empty Member record
    Then the record should be valid

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" Member record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                             |
      | @context                              |
      | @id                                   |
      | @type                                 |
      | member_identifier                     |
      | demographic_info                      |
      | demographic_info.identifier           |
      | demographic_info.name                 |
      | demographic_info.address              |
      | related_person                        |
      | related_person.0.relationship_type    |
      | related_person.0.related_member       |
      | is_disabled                           |
      | disability_info                       |
      | disability_info.0.functional_severity |
      | marital_status                        |
      | employment_status                     |
      | occupation                            |
      | income_level                          |
      | language_code                         |
      | education_level                       |
      | additional_attributes                 |
      | registration_date                     |
      | last_updated                          |

  # ---------------------------------------------------------------------------
  # Every code of every code list is accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Every <list> code is accepted for <attribute>
    Given the "full" Member record
    Then every "<list>" code should be accepted as "<attribute>"

    Examples:
      | list               | attribute                                    |
      | maritalStatus      | marital_status                               |
      | employmentStatus   | employment_status                            |
      | occupation         | occupation                                   |
      | educationLevel     | education_level                              |
      | relationshipType   | related_person.0.relationship_type           |
      | functionalType     | disability_info.0.disability_limitation_type |
      | functionalSeverity | disability_info.0.functional_severity        |
      | identifierType     | member_identifier.0.identifier_type          |

  Scenario: Every functional limitation code is accepted in a list
    Given the "full" Member record
    Then every "functionalType" code should be accepted in the list "disability_info.0.disability_limitation_type"

  Scenario Outline: Numeric <list> codes are also accepted as JSON integers for <attribute>
    Given the "full" Member record
    Then every "<list>" code should be accepted as a JSON integer for "<attribute>"

    Examples:
      | list               | attribute                             |
      | employmentStatus   | employment_status                     |
      | occupation         | occupation                            |
      | educationLevel     | education_level                       |
      | functionalSeverity | disability_info.0.functional_severity |

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples: Member identifier and demographic information
      | attribute         | value                                                                                              |
      | member_identifier | [{"identifier_type":"UIN","identifier_value":"M1"}]                                                |
      | member_identifier | [{"identifier_type":"UIN","identifier_value":"M1"},{"identifier_type":"BRN","identifier_value":"B1"}] |
      | demographic_info  | {"identifier":[{"identifier_type":"UIN","identifier_value":"500000001"}]}                          |
      | demographic_info  | {}                                                                                                 |

    Examples: Related persons (RelatedPerson: Member reference or Person)
      | attribute      | value                                                                                                                 |
      | related_person | []                                                                                                                    |
      | related_person | [{"relationship_type":"SPS","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M2"}]}}] |
      | related_person | [{"relationship_type":"CHILD","related_member":{"identifier":[{"identifier_type":"BRN","identifier_value":"B9"}],"name":{"given_name":"Kim"},"birth_date":"2015-01-01"}}] |
      | related_person | [{"relationship_type":"SELF","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M500000001"}]}}] |
      | related_person | [{"relationship_type":"FAMMEMB"}]                                                                                     |

    Examples: Disability (is_disabled yes (1) / no (0), WG-SS DisabilityInfo)
      | attribute       | value                                                                                       |
      | is_disabled     | true                                                                                        |
      | is_disabled     | 1                                                                                           |
      | is_disabled     | 0                                                                                           |
      | disability_info | []                                                                                          |
      | disability_info | [{"disability_limitation_type":"COM_SS","functional_severity":"1"}]                         |
      | disability_info | [{"disability_limitation_type":["VIS_SS","HEAR_SS"],"functional_severity":4}]               |
      | disability_info | [{"disability_limitation_type":["COG_SS"]}]                                                 |
      | disability_info | [{"@type":"DisabilityInfo","disability_limitation_type":["SC_SS"]},{"disability_limitation_type":"MOB_SS","functional_severity":"2"}] |

    Examples: Socio-economic codes
      | attribute         | value |
      | employment_status | "8"   |
      | occupation        | "0"   |
      | income_level      | "3"   |
      | income_level      | 4     |
      | income_level      | "Q1"  |

    Examples: Languages and additional attributes
      | attribute             | value                                                                             |
      | language_code         | ["en"]                                                                            |
      | language_code         | ["eng","fra","ara"]                                                               |
      | language_code         | []                                                                                |
      | additional_attributes | []                                                                                |
      | additional_attributes | [{"name":"wheelchair_user","value":true}]                                         |
      | additional_attributes | [{"name":"hours_of_care","value":12.5},{"name":"seasonal","value":false},{"name":"extra","value":{"since":"2020"}}] |

    Examples: Dates
      | attribute         | value                  |
      | registration_date | "2021-04-01"           |
      | registration_date | "1978-03-12T12:00:00Z" |
      | last_updated      | "2026-01-01T00:00:00Z" |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Member identifier
      | attribute                           | value                                            | error                                                  |
      | member_identifier                   | "M500000001"                                     | /member_identifier must be array                       |
      | member_identifier                   | {"identifier_type":"UIN","identifier_value":"1"} | /member_identifier must be array                       |
      | member_identifier                   | []                                               | /member_identifier must NOT have fewer than 1 items    |
      | member_identifier.0.identifier_type | "NationalID"                                     | /member_identifier/0/identifier_type must be equal to one of the allowed values |
      | member_identifier                   | [{"identifier_type":"UIN"}]                      | must have required property 'identifier_value'         |

    Examples: Demographic information (person rules apply)
      | attribute                     | value          | error                                                            |
      | demographic_info              | "Omar Haddad"  | /demographic_info must be object                                 |
      | demographic_info.sex          | "M"            | /demographic_info/sex must be equal to one of the allowed values |
      | demographic_info.birth_date   | "12/03/1978"   | /demographic_info/birth_date must match pattern                  |
      | demographic_info.phone_number | ["06123456"]   | /demographic_info/phone_number/0 must match pattern              |
      | demographic_info.identifier   | []             | /demographic_info/identifier must NOT have fewer than 1 items    |
      | demographic_info.birth_date   | "2999-01-01"   | demographic_info.birth_date "2999-01-01" is in the future        |

    Examples: Related persons
      | attribute                                         | value                                         | error                                                                 |
      | related_person                                    | {"relationship_type":"SPS"}                   | /related_person must be array                                         |
      | related_person.0.relationship_type                | "spouse"                                      | /related_person/0/relationship_type must be equal to one of the allowed values |
      | related_person.0.relationship_type                | "sps"                                         | /related_person/0/relationship_type must be equal to one of the allowed values |
      | related_person.0.relationship_type                | 1                                             | /related_person/0/relationship_type must be string                    |
      | related_person.0.related_member                   | "M500000002"                                  | /related_person/0/related_member must be object                       |
      | related_person.0.related_member.member_identifier | "M500000002"                                  | /related_person/0/related_member/member_identifier must be array      |
      | related_person.0.related_member.identifier        | [{"identifier_type":"NID","identifier_value":"1"}] | /related_person/0/related_member/identifier/0/identifier_type must be equal to one of the allowed values |
      | related_person.0.related_member.birth_date        | "2015-02-30"                                  | related_member.birth_date "2015-02-30" is not a valid ISO 8601 calendar date |

    Examples: Disability (is_disabled, WG-SS DisabilityInfo)
      | attribute                                    | value                  | error                                                                                      |
      | is_disabled                                  | "yes"                  | /is_disabled must be equal to one of the allowed values                                    |
      | is_disabled                                  | "true"                 | /is_disabled must be equal to one of the allowed values                                    |
      | is_disabled                                  | 2                      | /is_disabled must be equal to one of the allowed values                                    |
      | disability_info                              | {"disability_limitation_type":"VIS_SS"} | /disability_info must be array                                            |
      | disability_info.0.disability_limitation_type | ["vision"]             | /disability_info/0/disability_limitation_type/0 must be equal to one of the allowed values |
      | disability_info.0.disability_limitation_type | "VIS"                  | /disability_info/0/disability_limitation_type must be equal to one of the allowed values   |
      | disability_info.0.disability_limitation_type | "Vision"               | /disability_info/0/disability_limitation_type must be equal to one of the allowed values   |
      | disability_info.0.disability_limitation_type | []                     | /disability_info/0/disability_limitation_type must NOT have fewer than 1 items             |
      | disability_info.0.functional_severity        | "a lot of difficulty"  | /disability_info/0/functional_severity must be equal to one of the allowed values          |
      | disability_info.0.functional_severity        | 5                      | /disability_info/0/functional_severity must be equal to one of the allowed values          |
      | disability_info.0.functional_severity        | 0                      | /disability_info/0/functional_severity must be equal to one of the allowed values          |

    Examples: Marital status (MaritalStatusEnum: S, M, W, A, D, L, U)
      | attribute      | value     | error                                                      |
      | marital_status | "married" | /marital_status must be equal to one of the allowed values |
      | marital_status | "single"  | /marital_status must be equal to one of the allowed values |
      | marital_status | "m"       | /marital_status must be equal to one of the allowed values |
      | marital_status | "X"       | /marital_status must be equal to one of the allowed values |

    Examples: Employment (EmploymentStatusEnum 1-8), occupation (ISCO-08 0-9), education (ISCED 0-8)
      | attribute         | value      | error                                                         |
      | employment_status | "employed" | /employment_status must be equal to one of the allowed values |
      | employment_status | "0"        | /employment_status must be equal to one of the allowed values |
      | employment_status | 9          | /employment_status must be equal to one of the allowed values |
      | employment_status | "4.0"      | /employment_status must be equal to one of the allowed values |
      | occupation        | "teacher"  | /occupation must be equal to one of the allowed values        |
      | occupation        | "10"       | /occupation must be equal to one of the allowed values        |
      | occupation        | 2.5        | /occupation must be equal to one of the allowed values        |
      | education_level   | "bachelor" | /education_level must be equal to one of the allowed values   |
      | education_level   | "9"        | /education_level must be equal to one of the allowed values   |
      | education_level   | -1         | /education_level must be equal to one of the allowed values   |

    Examples: Income level (country-defined code)
      | attribute    | value | error                                               |
      | income_level | ""    | /income_level must NOT have fewer than 1 characters |
      | income_level | 2.5   | /income_level must be integer                       |
      | income_level | ["2"] | /income_level must be string                        |

    Examples: Languages and additional attributes
      | attribute             | value                       | error                                                               |
      | language_code         | "en"                        | /language_code must be array                                        |
      | language_code         | ["arabic"]                  | /language_code/0 must match pattern                                 |
      | language_code         | ["AR"]                      | /language_code/0 must match pattern                                 |
      | additional_attributes | {"primary_caregiver":true}  | /additional_attributes must be array                                |
      | additional_attributes | ["caregiver"]               | /additional_attributes/0 must be object                             |
      | additional_attributes | [{"name":"caregiver"}]      | /additional_attributes/0 must have required property 'value'        |
      | additional_attributes | [{"value":"yes"}]           | /additional_attributes/0 must have required property 'name'         |
      | additional_attributes | [{"name":"","value":1}]     | /additional_attributes/0/name must NOT have fewer than 1 characters |
      | additional_attributes | [{"name":"x","value":null}] | /additional_attributes/0/value must be string,number,boolean,object |

    Examples: Dates
      | attribute         | value        | error                                                                |
      | registration_date | "01/04/2021" | /registration_date must match pattern                                |
      | registration_date | "2021-02-29" | registration_date "2021-02-29" is not a valid ISO 8601 calendar date |
      | last_updated      | "2999-12-31" | last_updated "2999-12-31" is in the future                           |

  # ---------------------------------------------------------------------------
  # Cross-attribute consistency (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: Member attributes must be consistent: <rule>
    Given the "<record>" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                              | record   | attribute                   | value                        | error                                                                         |
      | registered before birth           | full     | registration_date           | "1970-01-01"                 | registration_date 1970-01-01 is before demographic_info.birth_date 1978-03-12 |
      | last update before registration   | full     | last_updated                | "2021-01-01"                 | last_updated 2021-01-01 is before registration_date 2021-04-01                |
      | person died before birth          | full     | demographic_info.death_date | "1970-01-01"                 | demographic_info.death_date 1970-01-01 is before birth_date 1978-03-12        |
      | severity without limitation type  | disabled | disability_info             | [{"functional_severity":"3"}] | gives a functional_severity without the disability_limitation_type it applies to |
      | related to itself                 | full     | related_person              | [{"relationship_type":"SPS","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M500000001"}]}}] | relates the member to itself (UIN\|M500000001) |
      | related to itself by person id    | full     | related_person              | [{"relationship_type":"CHILD","related_member":{"identifier":[{"identifier_type":"UIN","identifier_value":"500000001"}]}}] | relates the member to itself (UIN\|500000001) |
      | duplicate member identifiers      | full     | member_identifier           | [{"identifier_type":"UIN","identifier_value":"M1"},{"identifier_type":"UIN","identifier_value":"M1"}] | member_identifier contains duplicates: UIN\|M1 |
