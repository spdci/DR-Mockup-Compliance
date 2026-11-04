@method=POST @endpoint=dr/sync/disabled
Feature: Check whether a person is registered as disabled (POST /registry/sync/disabled)

This API is exposed by the DR and called by SP systems or other registries (process flow 2:
the SP-System queries the DR to confirm a disability status). Its summary names it
/registry/sync/get-disability-status, the path earlier versions of this mock served: both
paths are tested. The request (DisabledRequest) designates the person in disabled_criteria;
the response carries a callback header (action "on-search") and a DisabledResponse whose
disabled_status is "yes" or "no".

  @smoke
  Scenario Outline: Successfully check the disability status (<endpoint>)
    Given the "<endpoint>" endpoint
    And a disability request for the "approved" person
    Then the request should be a valid "disabled" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "disabled-response" message
    And one disabled status should be returned
    And the disabled status should be "yes"

    Examples:
      | endpoint              |
      | disabled              |
      | get disability status |

  @functional
  Scenario Outline: A <person> person is reported as disabled "<status>" (<endpoint>)
    Given the "<endpoint>" endpoint
    And a disability request for the "<person>" person
    When the request is sent
    Then the response should be a valid "disabled-response" message
    And the disabled status should be "<status>"

    Examples:
      | endpoint              | person                        | status |
      | disabled              | approved                      | yes    |
      | disabled              | approved by person identifier | yes    |
      | disabled              | approved elder                | yes    |
      | disabled              | pending                       | no     |
      | disabled              | expired                       | no     |
      | disabled              | not disabled                  | no     |
      | disabled              | unknown                       | no     |
      | get disability status | approved elder                | yes    |
      | get disability status | pending                       | no     |

  @functional
  Scenario Outline: The person may be designated with a <form> query
    Given the "disabled" endpoint
    And a disability request for the "approved elder" person with a "<form>" query
    Then the request should be a valid "disabled" message
    When the request is sent
    Then the response should be a valid "disabled-response" message
    And the disabled status should be "yes"

    Examples:
      | form             |
      | personal details |
      | member           |
      | idtype-value     |

  @negative
  Scenario Outline: An invalid disabled request is rejected: <case> (<endpoint>)
    Given the "<endpoint>" endpoint
    And a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | endpoint              | case                      | field                                | value       |
      | disabled              | missing header            | header                               | <removed>   |
      | disabled              | wrong action              | header.action                        | "disabled"  |
      | disabled              | missing message_ts        | header.message_ts                    | <removed>   |
      | disabled              | missing message           | message                              | <removed>   |
      | disabled              | missing transaction_id    | message.transaction_id               | <removed>   |
      | disabled              | missing disabled_criteria | message.disabled_criteria            | <removed>   |
      | disabled              | missing query             | message.disabled_criteria.query      | <removed>   |
      | disabled              | empty query               | message.disabled_criteria.query      | {}          |
      | disabled              | unknown query_type        | message.disabled_criteria.query_type | "lookup"    |
      | disabled              | encrypted flag, plain msg | header.is_msg_encrypted              | true        |
      | get disability status | missing disabled_criteria | message.disabled_criteria            | <removed>   |
      | get disability status | wrong action              | header.action                        | "get-disability-status" |

  @negative
  Scenario: A body that is not JSON is rejected
    Given the "disabled" endpoint
    When the raw body "yes" is sent
    Then the request should be rejected according to the DCI error model
