@method=POST @endpoint=dr/sync/get-disability-details
Feature: Get the disability details of a person (POST /registry/sync/get-disability-details)

This API is exposed by the DR and called by SP systems or other registries. The request
designates the person in disabled_criteria; the response carries a callback header (action
"on-search") and a GetDisabilityInfoResponse whose reg_records describe the person's
disability (DisabledPerson attributes): disability status (CD.DR.14), level (CD.DR.15) and
DisabilityDetails (DO.DR.02: impairment type, level, cause and age of onset). Every attribute
is optional, but whatever is returned must be correct.

  Background:
    Given the "get disability details" endpoint

  @smoke
  Scenario: Successfully get the disability details of a person
    Given a disability request for the "approved" person
    Then the request should be a valid "get-disability-details" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "get-disability-details-response" message
    And every disability result should have status "succ"
    And at least 1 record should be returned
    And every returned record should be valid DR data

  @functional
  Scenario Outline: The disability of the <person> person is reported correctly
    Given a disability request for the "<person>" person
    When the request is sent
    Then the response should be a valid "get-disability-details-response" message
    And every disability result should have status "succ"
    And every returned record should be a PWDPerson record
    And the disability details should report the disability status "<status>"
    And the disability details should report the impairment types "<impairments>"
    And every returned record should be valid DR data

    Examples:
      | person                        | status   | impairments      |
      | approved                      | Approved | Mobility, Speech |
      | approved by person identifier | Approved | Mobility, Speech |
      | approved elder                | Approved | Vision, Mobility |
      | pending                       | Pending  | Mobility         |
      | expired                       | Expired  | Mental           |

  @functional
  Scenario Outline: The person may be designated with a <form> query
    Given a disability request for the "approved elder" person with a "<form>" query
    Then the request should be a valid "get-disability-details" message
    When the request is sent
    Then the response should be a valid "get-disability-details-response" message
    And every disability result should have status "succ"
    And at least 1 record should be returned
    And every returned record should be valid DR data

    Examples:
      | form             |
      | personal details |
      | member           |
      | idtype-value     |

  @functional
  Scenario Outline: No disability details are returned for the <person> person
    Given a disability request for the "<person>" person
    When the request is sent
    Then the response should be a valid "get-disability-details-response" message
    And no disability information should be returned

    Examples:
      | person       |
      | not disabled |
      | unknown      |

  @negative
  Scenario Outline: An invalid get-disability-details request is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                       | field                                | value        |
      | missing header             | header                               | <removed>    |
      | wrong action               | header.action                        | "get-disability-details" |
      | total_count not an integer | header.total_count                   | "1"          |
      | missing message            | message                              | <removed>    |
      | missing transaction_id     | message.transaction_id               | <removed>    |
      | transaction_id empty       | message.transaction_id               | ""           |
      | missing disabled_criteria  | message.disabled_criteria            | <removed>    |
      | missing query              | message.disabled_criteria.query      | <removed>    |
      | query a list               | message.disabled_criteria.query      | ["M500000003"] |
      | unknown query_type         | message.disabled_criteria.query_type | "nosql"      |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "[" is sent
    Then the request should be rejected according to the DCI error model
