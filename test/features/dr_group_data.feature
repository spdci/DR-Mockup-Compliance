@data
Feature: DR group data rules (DR Group, a core Group)

A DR Group (Group.jsonld) is a core Group whose head and members are DR Members: a
household or family of related individuals, some of them with a disability. Every Group
attribute is optional, but whenever one IS sent it must be correct, and the group must be
consistent with its own members: the head is one of the listed members, the member list is
not longer than group_size, no member is listed twice, and place_address points to a
location that is actually given. Every member of the group follows the member rules and
every person the person rules.

This feature runs offline and proves the rules applied to every group returned by the
API scenarios (group search results, notifications, transaction status).

Sources: extensions/dr/v1/data/Group.jsonld, core/v1/data (Group, Place, Address,
GeoCoordinates), core/v1/code (AssistanceUnitEnum).

  # ---------------------------------------------------------------------------
  # Reference records
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference group "<record>" is valid DR data
    Given the "<record>" Group record
    Then the record should be valid

    Examples:
      | record  |
      | full    |
      | minimal |
      | large   |
      | single  |

  Scenario: A group with no attribute at all is accepted (nothing is mandatory)
    Given an empty Group record
    Then the record should be valid

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" Group record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                                       |
      | @context                                        |
      | @id                                             |
      | @type                                           |
      | group_identifier                                |
      | group_type                                      |
      | geographical_location                           |
      | geographical_location.geo                       |
      | geographical_location.contained_in_place        |
      | poverty_score                                   |
      | poverty_score_type                              |
      | group_head_info                                 |
      | group_size                                      |
      | member_list                                     |
      | registration_date                               |
      | last_updated                                    |
      | additional_attributes                           |

  Scenario: The address may be omitted when no location type is declared
    Given the "full" Group record
    When its "place_address" attribute is removed
    And its "address" attribute is removed
    Then the record should be valid

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario: Every AssistanceUnitEnum code is accepted for group_type
    Given the "full" Group record
    Then every "groupType" code should be accepted as "group_type"

  Scenario: AssistanceUnitEnum codes are also accepted as JSON integers
    Given the "full" Group record
    Then every "groupType" code should be accepted as a JSON integer for "group_type"

  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" Group record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples: Location (geographical_location / place, address, place_address)
      | attribute             | value                                                                              |
      | geographical_location | {"name":"Al Mina","geo":{"latitude":34.45,"longitude":35.82}}                      |
      | geographical_location | {"geo":{"latitude":"-26.2381","longitude":"27.9086"}}                              |
      | geographical_location | {"name":"Block A","contains_place":[{"name":"Flat 1"},{"name":"Flat 2"}]}          |
      | geographical_location | {"name":"Village","contained_in_place":"District 4"}                               |
      | place                 | {"name":"Al Mina","geo":{"latitude":-90,"longitude":180}}                          |
      | address               | {"address_line_1":"12 Harbour Road","country_code":"LB"}                           |
      | place_address         | 1                                                                                  |
      | place_address         | true                                                                               |

    Examples: Poverty score and size
      | attribute          | value     |
      | poverty_score      | 0         |
      | poverty_score      | 99.999    |
      | poverty_score      | -1.5      |
      | poverty_score_type | "PMT"     |
      | group_size         | 4         |
      | group_size         | 25        |

    Examples: Members (DR Members)
      | attribute       | value                                                                                                                     |
      | member_list     | []                                                                                                                        |
      | group_head_info | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M500000002"}]}                                         |
      | group_head_info | {"demographic_info":{"identifier":[{"identifier_type":"UIN","identifier_value":"500000001"}]}}                            |

    Examples: Dates and additional attributes
      | attribute             | value                                              |
      | registration_date     | "2021-04-01"                                       |
      | last_updated          | "2026-01-01T00:00:00Z"                             |
      | additional_attributes | []                                                 |
      | additional_attributes | [{"name":"accessible_dwelling","value":true}]      |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" Group record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Group identifier and type (AssistanceUnitEnum 1-3)
      | attribute                          | value                                             | error                                                                             |
      | group_identifier                   | "GRP-DR-1001"                                     | /group_identifier must be array                                                   |
      | group_identifier                   | []                                                | /group_identifier must NOT have fewer than 1 items                                |
      | group_identifier.0.identifier_type | "HouseholdID"                                     | /group_identifier/0/identifier_type must be equal to one of the allowed values    |
      | group_type                         | "household"                                       | /group_type must be equal to one of the allowed values                            |
      | group_type                         | "family"                                          | /group_type must be equal to one of the allowed values                            |
      | group_type                         | "4"                                               | /group_type must be equal to one of the allowed values                            |
      | group_type                         | 0                                                 | /group_type must be equal to one of the allowed values                            |

    Examples: Location
      | attribute                 | value                              | error                                                                  |
      | geographical_location     | "Al Mina"                          | /geographical_location must be object                                  |
      | geographical_location.geo | {"latitude":95,"longitude":0}      | /geographical_location/geo/latitude must be <= 90                      |
      | geographical_location.geo | {"latitude":0,"longitude":-181}    | /geographical_location/geo/longitude must be >= -180                   |
      | geographical_location.geo | {"latitude":"north","longitude":1} | /geographical_location/geo/latitude must match pattern                 |
      | geographical_location.geo | {"latitude":"95.5","longitude":"1"} | geographical_location.geo.latitude "95.5" is outside [-90, 90]        |
      | geographical_location.geo | {"latitude":1}                     | /geographical_location/geo must have required property 'longitude'     |
      | geographical_location.contains_place | {"name":"Flat"}         | /geographical_location/contains_place must be array                    |
      | address                   | "12 Harbour Road"                  | /address must be object                                                |
      | address.0.country_code    | "Lebanon"                          | /address/0/country_code must match pattern                             |
      | place_address             | "address"                          | /place_address must be equal to one of the allowed values              |
      | place_address             | 2                                  | /place_address must be equal to one of the allowed values              |

    Examples: Poverty score, size and members
      | attribute          | value              | error                                                     |
      | poverty_score      | "3.1"              | /poverty_score must be number                             |
      | poverty_score_type | ""                 | /poverty_score_type must NOT have fewer than 1 characters |
      | group_size         | 0                  | /group_size must be >= 1                                  |
      | group_size         | 4.5                | /group_size must be integer                               |
      | group_size         | "4"                | /group_size must be integer                               |
      | group_head_info    | "M500000001"       | /group_head_info must be object                           |
      | member_list        | {"member_identifier":[]} | /member_list must be array                          |
      | member_list.2.is_disabled | "yes"       | /member_list/2/is_disabled must be equal to one of the allowed values |
      | member_list.2.disability_info.0.functional_severity | "severe" | /member_list/2/disability_info/0/functional_severity must be equal to one of the allowed values |
      | member_list.1.demographic_info.sex | "F" | /member_list/1/demographic_info/sex must be equal to one of the allowed values |
      | group_head_info.marital_status | "married" | /group_head_info/marital_status must be equal to one of the allowed values |

    Examples: Dates
      | attribute         | value        | error                                                                |
      | registration_date | "2021/04/01" | /registration_date must match pattern                                |
      | last_updated      | "2025-02-30" | last_updated "2025-02-30" is not a valid ISO 8601 calendar date      |
      | last_updated      | "2999-01-01" | last_updated "2999-01-01" is in the future                           |

  # ---------------------------------------------------------------------------
  # Consistency of the group with its members (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: The group must be consistent: <rule>
    Given the "<record>" Group record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                                 | record | attribute         | value                                                                                      | error                                                                       |
      | more members listed than group_size  | full   | group_size        | 3                                                                                          | member_list has 4 members, more than group_size 3                           |
      | head not a listed member             | full   | group_head_info   | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M600000001"}]}          | group_head_info (UIN\|M600000001) is not one of the members in member_list  |
      | member listed twice                  | single | member_list       | [{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M700000001"}]},{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M700000001"}]}] | member_list[1] repeats member UIN\|M700000001 of member_list[0] |
      | address declared but missing         | full   | address           | []                                                                                         | /address must NOT have fewer than 1 items                                   |
      | last update before registration      | full   | last_updated      | "2020-12-31"                                                                               | last_updated 2020-12-31 is before registration_date 2021-04-01              |
      | duplicate group identifiers          | full   | group_identifier  | [{"identifier_type":"UIN","identifier_value":"G1"},{"identifier_type":"UIN","identifier_value":"G1"}] | group_identifier contains duplicates: UIN\|G1                     |
      | member registered before birth       | full   | member_list.2.registration_date | "2011-01-01"                                                                 | member_list[2].registration_date 2011-01-01 is before demographic_info.birth_date 2012-02-20 |
      | member related to itself             | full   | member_list.3.related_person | [{"relationship_type":"SIS","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M500000004"}]}}] | member_list[3].related_person[0] relates the member to itself |

  Scenario: A group locating itself by place must give one
    Given the "large" Group record
    When its "place" attribute is removed
    Then the record should be rejected because of "place_address is 1 (use place) but no geographical_location is given"

  Scenario: A group locating itself by address must give one
    Given the "single" Group record
    When its "address" attribute is removed
    Then the record should be rejected because of "place_address is 0 (use address) but no address is given"
