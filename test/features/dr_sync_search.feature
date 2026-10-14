@method=POST @endpoint=dr/sync/search
Feature: Synchronous search of the Disability Registry (POST /registry/sync/search)

This API is exposed by the DR and called by SP systems or other registries.
The response carries a callback header (action "on-search") and a SearchResponse.
A search targets one DR record type (search_criteria.reg_record_type, or response_entity
as in the DR process flows): persons with disability (PWDPerson / DisabledPerson, the
default when no record type is given), persons (DRPerson), members (Member) or groups /
households (Group). Every returned record is checked against the DR data rules of its type:
attributes are optional, but whatever is returned must be correct.

  Background:
    Given the "sync search" endpoint

  @smoke
  Scenario: Successful sync search of a person with disability by identifier
    Given a search for the "full" PWDPerson by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And the result should contain the record identified by the query
    And every returned record should be valid DR data

  # ---------------------------------------------------------------------------
  # Person with disability search (DO.DR.01 PWDPerson)
  # ---------------------------------------------------------------------------
  @functional @pwd
  Scenario Outline: Person with disability search returns correct data for the <profile> person
    Given a search for the "<profile>" PWDPerson by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a PWDPerson record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid DR data

    Examples: By member identifier
      | profile |
      | full    |
      | elder   |
      | pending |
      | minimal |

    Examples: By an identifier of the person (personal details)
      | profile               |
      | by person identifier  |
      | by birth registration |
      | expired               |

  @functional @pwd
  Scenario: Without a reg_record_type the DR returns persons with disability (DisabledPerson)
    Given a search for the "full" PWDPerson by identifier without a reg_record_type
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a PWDPerson record
    And the result should contain the record identified by the query
    And every returned record should be valid DR data

  @functional @pwd
  Scenario Outline: The record type may be named "<reg_record_type>"
    Given a search for the "elder" PWDPerson by identifier with reg_record_type "<reg_record_type>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every returned record should be a PWDPerson record
    And the result should contain the record identified by the query
    And every returned record should be valid DR data

    Examples:
      | reg_record_type                      |
      | spdci-extensions-dci:DisabledPerson  |
      | DisabledPerson                       |
      | PWD_Person                           |

  # ---------------------------------------------------------------------------
  # Person search (DR Person, a core Person)
  # ---------------------------------------------------------------------------
  @functional @person
  Scenario Outline: Person search by <identifier type> returns correct data for a <profile> person
    Given a search for the "<profile>" DRPerson by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a DRPerson record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid DR data

    Examples:
      | identifier type | profile   |
      | UIN             | full      |
      | UIN             | minimal   |
      | MRN             | multi     |
      | UIN             | child     |
      | BRN             | newborn   |
      | UIN             | elder     |
      | UIN             | caregiver |
      | DRN             | deceased  |
      | UIN             | single    |

  @functional @person
  Scenario: Person search naming the record type with response_entity (process flow 3)
    Given a search for the "deceased" DRPerson by identifier with response_entity
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every returned record should be a DRPerson record
    And the result should contain the record identified by the query
    And every returned record should be valid DR data

  # ---------------------------------------------------------------------------
  # Member search (DR Member)
  # ---------------------------------------------------------------------------
  @functional @member
  Scenario Outline: Member search returns correct data for the <profile> member
    Given a search for the "<profile>" Member by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a Member record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid DR data

    Examples:
      | profile              |
      | full                 |
      | minimal              |
      | by person identifier |
      | spouse               |
      | disabled             |
      | newborn              |
      | elder                |
      | caregiver            |
      | single               |

  # ---------------------------------------------------------------------------
  # Group search (DR Group)
  # ---------------------------------------------------------------------------
  @functional @group
  Scenario Outline: Group search returns correct data for the <profile> group
    Given a search for the "<profile>" Group by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a Group record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid DR data

    Examples: By group identifier
      | profile |
      | full    |
      | minimal |
      | large   |
      | single  |

    Examples: Household of a person
      | profile               |
      | by member identifier  |
      | by person identifier  |
      | by birth registration |

  # ---------------------------------------------------------------------------
  # Eligibility queries (DR process flows 1 and 3)
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: Predicate search for <type> records where <predicate>
    Given a predicate search for <type> records where "<predicate>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a <type> record
    And every returned record should satisfy the predicate
    And every returned record should be valid DR data

    Examples:
      | type      | predicate                                                         |
      | PWDPerson | the person with disability is approved with a mobility impairment |
      | PWDPerson | the person with disability is approved                            |
      | DRPerson  | the person was born before 1966                                   |
      | Member    | the member is disabled                                            |
      | Group     | poverty_score is below 5                                          |
      | Group     | group_size is below 5                                             |

  @functional
  Scenario Outline: Expression search (process flow) for <expression>
    Given an expression search for "<expression>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be valid DR data

    Examples:
      | expression                                            |
      | PWDPerson who are approved with a mobility impairment |
      | DRPerson born before 1966                             |
      | Member who are disabled                               |
      | Group with poverty_score below 5                      |

  @functional
  Scenario Outline: GraphQL search for <type> records
    Given a graphql search for <type> records
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every returned record should be valid DR data

    Examples:
      | type      |
      | PWDPerson |
      | Member    |

  # ---------------------------------------------------------------------------
  # Optional search criteria: pagination, sort, locale, consent / authorize
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: Pagination is honoured (page <page>, page_size <size>)
    Given a predicate search for PWDPerson records where "the person with disability is approved"
    And the search requests page <page> with page_size <size>
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result pagination should report page <page> with at most <size> records per page
    And every returned record should be valid DR data

    Examples:
      | page | size |
      | 1    | 1    |
      | 2    | 1    |
      | 1    | 2    |
      | 1    | 100  |

  @functional
  Scenario Outline: Sorting <type> records by <attribute> <order> is honoured
    Given a predicate search for <type> records where "<predicate>"
    And the search results are sorted by "<attribute>" in "<order>" order
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the returned records should be sorted by "<attribute>" in "<order>" order

    Examples:
      | type      | predicate                              | attribute         | order |
      | PWDPerson | the person with disability is approved | registration_date | asc   |
      | PWDPerson | the person with disability is approved | registration_date | desc  |
      | DRPerson  | the person was born before 1966        | birth_date        | asc   |
      | Group     | poverty_score is below 5               | poverty_score     | desc  |

  @functional
  Scenario: The requested locale is honoured
    Given a search for the "full" PWDPerson by identifier
    And the search request asks for locale "fra"
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every requested locale should be honoured

  @functional
  Scenario: A search carrying consent and authorize information is accepted
    Given a search for the "full" PWDPerson by identifier
    And the search request carries consent and authorize information
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"

  # ---------------------------------------------------------------------------
  # Batch, not found, rejection by the registry
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: A batch search of <type> records answers every item with its own result
    Given a batch search for the <type> records "<records>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And each batch item should be answered with its own result
    And every returned record should be valid DR data

    Examples:
      | type      | records                                |
      | PWDPerson | full, elder, pending, expired, unknown |
      | DRPerson  | full, deceased, newborn, unknown       |
      | Member    | full, disabled, elder, unknown         |
      | Group     | full, large, single, minimal, unknown  |

  @functional
  Scenario: A batch search may mix persons with disability, persons, members and groups
    Given a batch search mixing record types "PWDPerson:full, DRPerson:caregiver, Member:elder, Group:by member identifier"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And each batch item should be answered with its own result
    And every returned record should be valid DR data

  @functional
  Scenario Outline: Searching an unknown <type> returns no record or a coded rejection
    Given a search for the "unknown" <type> by identifier
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result should be empty or rejected with a valid reason code

    Examples:
      | type      |
      | PWDPerson |
      | DRPerson  |
      | Member    |
      | Group     |

  @functional @mock
  Scenario: A rejected search item carries a spec reason code and no data
    Given a search for the "too_many" PWDPerson by identifier
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result should be rejected with reason code "rjct.search.too_many_records_found"

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid request is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and header
      | case                       | field                   | value        |
      | missing header             | header                  | <removed>    |
      | missing message            | message                 | <removed>    |
      | wrong action               | header.action           | "subscribe"  |
      | missing message_id         | header.message_id       | <removed>    |
      | missing message_ts         | header.message_ts       | <removed>    |
      | message_ts not ISO 8601    | header.message_ts       | "14/10/2026" |
      | missing sender_id          | header.sender_id        | <removed>    |
      | missing total_count        | header.total_count      | <removed>    |
      | total_count not an integer | header.total_count      | "one"        |
      | sender_uri not a URI       | header.sender_uri       | "not a uri"  |
      | is_msg_encrypted not bool  | header.is_msg_encrypted | "no"         |

    Examples: Search request
      | case                         | field                                                    | value                                   |
      | missing transaction_id       | message.transaction_id                                   | <removed>                               |
      | transaction_id too long      | message.transaction_id                                   | "TXN0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" |
      | missing search_request       | message.search_request                                   | <removed>                               |
      | empty search_request         | message.search_request                                   | []                                      |
      | missing reference_id         | message.search_request.0.reference_id                    | <removed>                               |
      | missing timestamp            | message.search_request.0.timestamp                       | <removed>                               |
      | invalid timestamp            | message.search_request.0.timestamp                       | "yesterday"                             |
      | missing search_criteria      | message.search_request.0.search_criteria                 | <removed>                               |
      | missing query_type           | message.search_request.0.search_criteria.query_type      | <removed>                               |
      | unknown query_type           | message.search_request.0.search_criteria.query_type      | "sql"                                   |
      | missing query                | message.search_request.0.search_criteria.query           | <removed>                               |
      | query not matching type      | message.search_request.0.search_criteria.query           | [{"expression1":{"attribute_name":"disability_status","operator":"eq","attribute_value":"Approved"}}] |
      | idtype-value without value   | message.search_request.0.search_criteria.query           | {"type":"UIN"}                          |
      | unknown reg_record_type      | message.search_request.0.search_criteria.reg_record_type | "Patient"                               |
      | unknown response_entity      | message.search_request.0.search_criteria.response_entity | "Beneficiary"                           |
      | invalid locale               | message.search_request.0.locale                          | "en"                                    |
      | pagination without page_size | message.search_request.0.search_criteria.pagination      | {"page_number":1}                       |
      | page_size zero               | message.search_request.0.search_criteria.pagination      | {"page_size":0}                         |
      | invalid sort order           | message.search_request.0.search_criteria.sort            | [{"attribute_name":"registration_date","sort_order":"up"}] |
      | consent with invalid ts      | message.search_request.0.search_criteria.consent         | {"ts":"now"}                            |

    Examples: Predicate query
      | case                        | field                                    | value                                   |
      | unknown operator            | message.search_request.0.search_criteria | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"disability_status","operator":"like","attribute_value":"Approved"}}]} |
      | unknown condition           | message.search_request.0.search_criteria | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"disability_status","operator":"eq","attribute_value":"Approved"},"condition":"xor","expression2":{"attribute_name":"housing_type","operator":"eq","attribute_value":"Social housing"}}]} |
      | expression without operator | message.search_request.0.search_criteria | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"disability_status","attribute_value":"Approved"}}]} |
      | empty predicate             | message.search_request.0.search_criteria | {"query_type":"predicate","query":[]}  |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "this is not json" is sent
    Then the request should be rejected according to the DCI error model
