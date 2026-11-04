@method=POST @endpoint=dr/on-search
Feature: Receive async search results from the DR (POST /registry/on-search)

This API is exposed by the SP to receive search results from the DR.
The suite plays the DR: every payload it sends is first checked against the spec
(including the DR data rules for persons with disability, persons, members and groups),
then the SP must acknowledge it. With @strict-data, the SP must also refuse results whose
DR data is present but incorrect.

  Background:
    Given the "on-search" endpoint

  @smoke
  Scenario: Successfully receive async search results from the DR
    Given an on-search callback carrying the "full" PWDPerson record
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Results carrying the <profile> <type> record are acknowledged
    Given an on-search callback carrying the "<profile>" <type> record
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Persons with disability
      | type      | profile |
      | PWDPerson | full    |
      | PWDPerson | elder   |
      | PWDPerson | pending |
      | PWDPerson | expired |
      | PWDPerson | minimal |

    Examples: Persons
      | type     | profile  |
      | DRPerson | full     |
      | DRPerson | minimal  |
      | DRPerson | multi    |
      | DRPerson | deceased |
      | DRPerson | newborn  |

    Examples: Members
      | type   | profile   |
      | Member | full      |
      | Member | minimal   |
      | Member | disabled  |
      | Member | elder     |
      | Member | caregiver |

    Examples: Groups
      | type  | profile |
      | Group | full    |
      | Group | minimal |
      | Group | large   |
      | Group | single  |

  @functional
  Scenario Outline: Results carrying several <type> records are acknowledged
    Given an on-search callback carrying the <type> records "<records>"
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      | records                       |
      | PWDPerson | full, elder, pending, expired |
      | DRPerson  | elder, caregiver, deceased    |
      | Member    | disabled, elder, single       |
      | Group     | full, large, single, minimal  |

  @functional
  Scenario: Untyped reg_records are persons with disability (DisabledPerson), as declared by the spec
    Given an on-search callback carrying the "full" PWDPerson record without a reg_record_type
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: reg_records may be a single <type> object, as declared by the spec
    Given an on-search callback carrying the "full" <type> record as a single object
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      |
      | PWDPerson |
      | Group     |

  @functional
  Scenario Outline: An empty <type> result is acknowledged
    Given an on-search callback with an empty <type> result
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      |
      | PWDPerson |
      | DRPerson  |
      | Member    |
      | Group     |

  @functional
  Scenario Outline: A rejected search with reason code <code> is acknowledged
    Given an on-search callback rejected with reason code "<code>"
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: SearchStatusReasonCode
      | code                               |
      | rjct.reference_id.invalid          |
      | rjct.reference_id.duplicate        |
      | rjct.timestamp.invalid             |
      | rjct.search_criteria.invalid       |
      | rjct.filter.invalid                |
      | rjct.sort.invalid                  |
      | rjct.pagination.invalid            |
      | rjct.search.too_many_records_found |

  @negative
  Scenario Outline: An invalid on-search callback is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and header
      | case                       | field                     | value          |
      | missing header             | header                    | <removed>      |
      | wrong action               | header.action             | "search"       |
      | missing header status      | header.status             | <removed>      |
      | unknown header status      | header.status             | "done"         |
      | unknown header reason code | header.status_reason_code | "rjct.unknown" |
      | missing message_ts         | header.message_ts         | <removed>      |

    Examples: Search response
      | case                         | field                                           | value               |
      | missing transaction_id       | message.transaction_id                          | <removed>           |
      | missing correlation_id       | message.correlation_id                          | <removed>           |
      | correlation_id invalid chars | message.correlation_id                          | "DR 0001"           |
      | missing search_response      | message.search_response                         | <removed>           |
      | missing status               | message.search_response.0.status                | <removed>           |
      | unknown status               | message.search_response.0.status                | "ok"                |
      | unknown reason code          | message.search_response.0.status_reason_code    | "rjct.not_found"    |
      | data without reg_records     | message.search_response.0.data                  | {"version":"1.0.0"} |
      | unknown reg_record_type      | message.search_response.0.data.reg_record_type  | "Patient"           |
      | reg_records not a record     | message.search_response.0.data.reg_records      | "John Doe"          |
      | pagination missing total     | message.search_response.0.pagination            | {"page_size":1,"page_number":1} |
      | locale not ISO 639-3         | message.search_response.0.locale                | "en"                |

    @strict-data
    Examples: Data of the person with disability in the result
      | case                              | field                                                                                 | value            |
      | disability_status outside CD.DR.14 | message.search_response.0.data.reg_records.0.disability_status                       | "Confirmed"      |
      | disability level outside CD.DR.15 | message.search_response.0.data.reg_records.0.disability_status_level                  | "Profound"       |
      | impairment type outside CD.DR.01  | message.search_response.0.data.reg_records.0.disability_details.0.impairment_type    | "Physical and movement related functions" |
      | impairment level outside CD.DR.02 | message.search_response.0.data.reg_records.0.disability_details.0.impairment_level   | "Severe impairment or difficulty" |
      | impairment cause outside CD.DR.08 | message.search_response.0.data.reg_records.0.disability_details.0.impairment_cause   | "Work Accident"  |
      | age of onset outside CD.DR.07     | message.search_response.0.data.reg_records.0.disability_details.0.age_on_set         | "Teenage"        |
      | support status outside CD.DR.05   | message.search_response.0.data.reg_records.0.disability_support.1.human_assistance.support_status | "Required" |
      | support frequency outside CD.DR.04 | message.search_response.0.data.reg_records.0.disability_support.1.human_assistance.frequency     | "Monthly"  |
      | assistive technology outside CD.DR.06 | message.search_response.0.data.reg_records.0.disability_support.0.assistive_technology.0.type  | "Crutches" |
      | caregiver relationship as label   | message.search_response.0.data.reg_records.0.disability_support.0.human_assistance.0.relationship | "Parent"  |
      | transport outside CD.DR.09        | message.search_response.0.data.reg_records.0.transport_requirement                    | "Taxi"           |
      | housing outside CD.DR.10          | message.search_response.0.data.reg_records.0.housing_type                             | "Apartment"      |
      | disability_details not a list     | message.search_response.0.data.reg_records.0.disability_details                       | {"impairment_type":"Mobility"} |
      | personal identifier as a string   | message.search_response.0.data.reg_records.0.personal_details.member_identifier       | "M500000003"     |
      | personal sex as label             | message.search_response.0.data.reg_records.0.personal_details.demographic_info.sex    | "Female"         |
      | registration date not ISO 8601    | message.search_response.0.data.reg_records.0.registration_date                        | "15/04/2021"     |

    @strict-data
    Examples: Person, member and group data in the result
      | case                           | field                          | value                 |
      | person records with bad sex    | message.search_response.0.data | {"reg_record_type":"DRPerson","reg_records":[{"identifier":[{"identifier_type":"UIN","identifier_value":"1"}],"sex":"F"}]} |
      | person birth_date not ISO 8601 | message.search_response.0.data | {"reg_record_type":"DRPerson","reg_records":[{"birth_date":"20/05/1985"}]} |
      | person e-mail invalid          | message.search_response.0.data | {"reg_record_type":"DRPerson","reg_records":[{"email":["omar.example.org"]}]} |
      | member disabled flag as text   | message.search_response.0.data | {"reg_record_type":"Member","reg_records":[{"is_disabled":"yes"}]} |
      | member severity as label       | message.search_response.0.data | {"reg_record_type":"Member","reg_records":[{"disability_info":[{"disability_limitation_type":"MOB_SS","functional_severity":"a lot"}]}]} |
      | member marital status label    | message.search_response.0.data | {"reg_record_type":"Member","reg_records":[{"marital_status":"married"}]} |
      | group_type as a label          | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"group_type":"household"}]} |
      | group_size not an integer      | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"group_size":"four"}]} |
