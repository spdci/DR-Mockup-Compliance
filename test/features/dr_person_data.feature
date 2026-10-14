@data
Feature: DR person data rules (DR Person, a core Person)

The DR Person (DRPerson.jsonld) is a core Person: every attribute is optional (cardinality
0...1 or 0...*). A record may disclose only an identifier. But whenever an attribute IS
sent it must be correct: right type, right format, a value from the right code list, and
consistent with the rest of the record.

This feature is the rule book. It runs offline (no API) and proves that the validator
applied to every person returned by the API scenarios (person search results, the
demographic_info of every member and person with disability, caregivers) accepts absent
attributes, accepts correct values and rejects incorrect ones.

Sources: extensions/dr/v1/data/DRPerson.jsonld, core/v1/data (Person, Name, Identifier,
Address, GeoLocation), core/v1/code (IdentifierTypeEnum, SexCategoryEnum).

  # ---------------------------------------------------------------------------
  # Reference records
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference person "<record>" is valid DR data
    Given the "<record>" DRPerson record
    Then the record should be valid

    Examples:
      | record    |
      | full      |
      | minimal   |
      | multi     |
      | child     |
      | newborn   |
      | elder     |
      | caregiver |
      | deceased  |
      | single    |

  Scenario: A person with no attribute at all is accepted (nothing is mandatory)
    Given an empty DRPerson record
    Then the record should be valid

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" DRPerson record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                                 |
      | @context                                  |
      | @id                                       |
      | @type                                     |
      | identifier                                |
      | name                                      |
      | name.second_name                          |
      | name.prefix                               |
      | name.suffix                               |
      | name.surname                              |
      | sex                                       |
      | birth_date                                |
      | address                                   |
      | address.0.geo_location                    |
      | address.0.address_line_2                  |
      | address.0.postal_code                     |
      | address.0.country_code                    |
      | address.0.geo_location.plus_code.geometry |
      | phone_number                              |
      | email                                     |
      | registration_date                         |
      | last_updated                              |

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario: Every IdentifierTypeEnum code is accepted for identifier_type
    Given the "full" DRPerson record
    Then every "identifierType" code should be accepted as "identifier.0.identifier_type"

  Scenario: Every SexCategoryEnum code is accepted for sex
    Given the "full" DRPerson record
    Then every "sex" code should be accepted as "sex"

  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" DRPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples: Identifiers (0...* Identifier)
      | attribute  | value                                                                                                   |
      | identifier | [{"identifier_type":"UIN","identifier_value":"123456789"}]                                              |
      | identifier | [{"@type":"Identifier","identifier_type":"BRN","identifier_value":"BRN-2020-001"}]                      |
      | identifier | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"BRN","identifier_value":"1"}]      |
      | identifier | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"MRN","identifier_value":"2"},{"identifier_type":"DRN","identifier_value":"3"}] |

    Examples: Name (core Name; first_name / last_name as in the DR spec example)
      | attribute | value                                                                                         |
      | name      | {"surname":"Doe"}                                                                             |
      | name      | {"given_name":"Jane"}                                                                         |
      | name      | {"surname":"Doe Smith","given_name":"Jane Ann"}                                               |
      | name      | {"@type":"Name","given_name":"Jane","second_name":"A","maiden_name":"Roe","prefix":"Ms.","suffix":"Jr"} |
      | name      | {"first_name":"John","last_name":"Doe"}                                                       |
      | name      | {"given_name":"Jane","prefix":"","suffix":""}                                                 |

    Examples: Contact details (E.164 phone, RFC 5322 e-mail, 0...* lists)
      | attribute    | value                                        |
      | phone_number | ["+14155552671"]                             |
      | phone_number | ["+96170123456","+33612345678"]              |
      | phone_number | []                                           |
      | email        | ["jane.doe@example.org"]                     |
      | email        | ["a@example.com","b.c+tag@sub.example.co"]   |
      | email        | []                                           |

    Examples: Dates (ISO 8601 DateTime)
      | attribute         | value                           |
      | birth_date        | "1978-03-12"                    |
      | birth_date        | "1978-03-12T10:20:15"           |
      | birth_date        | "1978-03-12T10:20:15Z"          |
      | birth_date        | "1978-03-12T10:20:15.123+05:30" |
      | birth_date        | "1978-03-12T10:20"              |
      | birth_date        | "1976-02-29"                    |
      | death_date        | "2024-01-01"                    |
      | death_date        | "1978-03-12T23:59:59Z"          |
      | registration_date | "1978-03-12"                    |
      | last_updated      | "2026-01-01T00:00:00-04:00"     |

    Examples: Address (0...* Address)
      | attribute                                          | value                                                                  |
      | address                                            | [{"address_line_1":"1 Main St","locality":"Town","country_code":"LB"}] |
      | address                                            | [{"address_line_1":"1 Main St","address_line_2":"Flat 2","country_code":"LBN"}] |
      | address                                            | {"address_line_1":"1 Main St","locality":"Town"}                       |
      | address                                            | [{"locality":"A"},{"locality":"B"}]                                     |
      | address.0.country_code                             | "FR"                                                                   |
      | address.0.geo_location.plus_code.global_code       | "8FVC9G8F+6X"                                                          |
      | address.0.geo_location.plus_code.geometry.location | {"latitude":0,"longitude":0}                                            |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" DRPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Identifiers
      | attribute                     | value                                                      | error                                          |
      | identifier                    | {"identifier_type":"UIN","identifier_value":"1"}           | /identifier must be array                      |
      | identifier                    | "500000001"                                                | /identifier must be array                      |
      | identifier                    | []                                                         | /identifier must NOT have fewer than 1 items   |
      | identifier.0.identifier_type  | "NationalID"                                               | /identifier/0/identifier_type must be equal to one of the allowed values |
      | identifier.0.identifier_type  | "PASSPORT"                                                 | /identifier/0/identifier_type must be equal to one of the allowed values |
      | identifier.0.identifier_type  | "uin"                                                      | /identifier/0/identifier_type must be equal to one of the allowed values |
      | identifier.0.identifier_value | ""                                                         | /identifier/0/identifier_value must NOT have fewer than 1 characters |
      | identifier.0.identifier_value | 500000001                                                  | /identifier/0/identifier_value must be string  |
      | identifier                    | [{"identifier_type":"UIN"}]                                | must have required property 'identifier_value' |
      | identifier                    | [{"identifier_value":"1"}]                                 | must have required property 'identifier_type'  |

    Examples: Name
      | attribute       | value            | error                                       |
      | name            | "Omar Haddad"    | /name must be object                        |
      | name            | {}               | /name must have required property 'surname' |
      | name            | {"prefix":"Mr."} | /name must have required property           |
      | name.given_name | 42               | /name/given_name must be string             |
      | name.surname    | ["Haddad"]       | /name/surname must be string                |
      | name.prefix     | null             | /name/prefix must be string                 |
      | name.first_name | 7                | /name/first_name must be string             |

    Examples: Contact details
      | attribute    | value                 | error                              |
      | phone_number | "+9616123456"         | /phone_number must be array        |
      | phone_number | ["06123456"]          | /phone_number/0 must match pattern |
      | phone_number | ["+961 6 123 456"]    | /phone_number/0 must match pattern |
      | phone_number | ["+0961123456"]       | /phone_number/0 must match pattern |
      | phone_number | ["+1234567890123456"] | /phone_number/0 must match pattern |
      | phone_number | [9616123456]          | /phone_number/0 must be string     |
      | email        | "omar@example.org"    | /email must be array               |
      | email        | ["not-an-email"]      | /email/0 must match format "email" |
      | email        | ["omar@"]             | /email/0 must match format "email" |

    Examples: Sex (SexCategoryEnum: male, female, other, unknown)
      | attribute | value    | error                                           |
      | sex       | "M"      | /sex must be equal to one of the allowed values |
      | sex       | "Male"   | /sex must be equal to one of the allowed values |
      | sex       | "others" | /sex must be equal to one of the allowed values |
      | sex       | "1"      | /sex must be equal to one of the allowed values |
      | sex       | ""       | /sex must be equal to one of the allowed values |
      | sex       | 1        | /sex must be string                             |

    Examples: Dates
      | attribute         | value                 | error                                                         |
      | birth_date        | "12/03/1978"          | /birth_date must match pattern                                |
      | birth_date        | "1978-3-12"           | /birth_date must match pattern                                |
      | birth_date        | "19780312"            | /birth_date must match pattern                                |
      | birth_date        | "1978-13-01"          | /birth_date must match pattern                                |
      | birth_date        | "1978-02-30"          | birth_date "1978-02-30" is not a valid ISO 8601 calendar date |
      | birth_date        | "1977-02-29"          | birth_date "1977-02-29" is not a valid ISO 8601 calendar date |
      | birth_date        | "1978-03-12T25:00:00" | /birth_date must match pattern                                |
      | birth_date        | ""                    | /birth_date must match pattern                                |
      | birth_date        | 258508800             | /birth_date must be string                                    |
      | birth_date        | "2999-01-01"          | birth_date "2999-01-01" is in the future                      |
      | death_date        | "deceased"            | /death_date must match pattern                                |
      | death_date        | "2999-01-01"          | death_date "2999-01-01" is in the future                      |
      | registration_date | "not a date"          | /registration_date must match pattern                         |
      | last_updated      | "2024-06-31"          | last_updated "2024-06-31" is not a valid ISO 8601 calendar date |

    Examples: Address
      | attribute                                          | value                          | error                                                               |
      | address                                            | "12 Harbour Road"              | /address must be object                                             |
      | address                                            | []                             | /address must NOT have fewer than 1 items                           |
      | address.0.country_code                             | "Lebanon"                      | /address/0/country_code must match pattern                          |
      | address.0.country_code                             | "lb"                           | /address/0/country_code must match pattern                          |
      | address.0.postal_code                              | 1300                           | /address/0/postal_code must be string                               |
      | address.0.locality                                 | ["Al Mina"]                    | /address/0/locality must be string                                  |
      | address.0.geo_location.plus_code.global_code       | "not-a-plus-code"              | /address/0/geo_location/plus_code/global_code must match pattern    |
      | address.0.geo_location.plus_code.geometry.location | {"latitude":-91,"longitude":0} | /address/0/geo_location/plus_code/geometry/location/latitude must be >= -90 |
      | address.0.geo_location.plus_code.geometry.bounds   | {"northeast":{"latitude":1,"longitude":1},"southwest":{"latitude":2,"longitude":0}} | northeast.latitude 1 is south of southwest.latitude 2 |

    Examples: Linked data keywords
      | attribute | value | error                           |
      | @id       | 3     | /@id must be string             |
      | @type     | {}    | /@type must be string           |
      | @context  | 42    | /@context must be string,object |

  # ---------------------------------------------------------------------------
  # Cross-attribute consistency (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: Person attributes must be consistent: <rule>
    Given the "<record>" DRPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                            | record   | attribute         | value                                                                                         | error                                                   |
      | death before birth              | deceased | death_date        | "1944-01-01"                                                                                  | death_date 1944-01-01 is before birth_date 1945-04-09   |
      | registration before birth       | full     | registration_date | "1970-01-01"                                                                                  | registration_date 1970-01-01 is before birth_date 1978-03-12 |
      | last update before registration | full     | last_updated      | "2021-03-31"                                                                                  | last_updated 2021-03-31 is before registration_date 2021-04-01 |
      | duplicate identifiers           | full     | identifier        | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"UIN","identifier_value":"1"}] | identifier contains duplicates: UIN\|1          |

  Scenario Outline: Consistent person attributes are accepted: <case>
    Given the "<record>" DRPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples:
      | case                                  | record  | attribute         | value                  |
      | death on the day of birth             | newborn | death_date        | "2025-12-01T08:00:00Z" |
      | registered on the day of birth        | newborn | registration_date | "2025-12-01"           |
      | same value under two identifier types | full    | identifier        | [{"identifier_type":"UIN","identifier_value":"7"},{"identifier_type":"BRN","identifier_value":"7"}] |
