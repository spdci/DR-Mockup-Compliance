@method=POST @endpoint=dr/sync/get-disability-support
Feature: Get the disability support of a person (POST /registry/sync/get-disability-support)

This API is exposed by the DR and called by SP systems or other registries. The request
(GetDisabilitySupportRequest) designates the person in disabled_criteria; the response
carries a callback header (action "on-search") and a GetDisabilitySupportResponse whose
reg_records give the person's DisabilitySupport (DO.DR.03): human assistance (DO.DR.04,
with the caregiver and their relationship), assistive technology (DO.DR.05), medical care
(DO.DR.06), housing support (DO.DR.07) and animal assistance (DO.DR.08). Every attribute is
optional, but whatever is returned must be correct.

  Background:
    Given the "get disability support" endpoint

  @smoke
  Scenario: Successfully get the disability support of a person
    Given a disability request for the "approved" person
    Then the request should be a valid "get-disability-support" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "get-disability-support-response" message
    And every disability result should have status "succ"
    And at least 1 record should be returned
    And every returned record should be valid DR data

  @functional
  Scenario Outline: The support of the <person> person is returned and correct
    Given a disability request for the "<person>" person
    When the request is sent
    Then the response should be a valid "get-disability-support-response" message
    And every disability result should have status "succ"
    And every returned record should be a SupportRecord record
    And the disability support should list "<support>"
    And every returned record should be valid DR data

    Examples:
      | person                        | support                                                                    |
      | approved                      | human_assistance, assistive_technology, housing_support, medical_care      |
      | approved by person identifier | human_assistance, assistive_technology                                     |
      | approved elder                | human_assistance, assistive_technology, animal_assistance, medical_care    |

  @functional
  Scenario Outline: The person may be designated with a <form> query
    Given a disability request for the "approved" person with a "<form>" query
    Then the request should be a valid "get-disability-support" message
    When the request is sent
    Then the response should be a valid "get-disability-support-response" message
    And every disability result should have status "succ"
    And at least 1 record should be returned
    And every returned record should be valid DR data

    Examples:
      | form             |
      | personal details |
      | member           |
      | idtype-value     |

  @functional
  Scenario: A person without registered support gets an empty, valid result
    Given a disability request for the "pending" person
    When the request is sent
    Then the response should be a valid "get-disability-support-response" message
    And every disability result should have status "succ"
    And every returned record should be valid DR data

  @functional
  Scenario Outline: The <person> person has no disability support
    Given a disability request for the "<person>" person
    When the request is sent
    Then the response should be a valid "get-disability-support-response" message
    And no disability information should be returned

    Examples:
      | person       |
      | not disabled |
      | unknown      |

  @negative
  Scenario Outline: An invalid get-disability-support request is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                         | field                                | value         |
      | missing header               | header                               | <removed>     |
      | wrong action                 | header.action                        | "on-search"   |
      | missing message_id           | header.message_id                    | <removed>     |
      | missing sender_id            | header.sender_id                     | <removed>     |
      | missing message              | message                              | <removed>     |
      | missing transaction_id       | message.transaction_id               | <removed>     |
      | missing disabled_criteria    | message.disabled_criteria            | <removed>     |
      | disabled_criteria not object | message.disabled_criteria            | "M500000003"  |
      | missing query                | message.disabled_criteria.query      | <removed>     |
      | empty query                  | message.disabled_criteria.query      | {}            |
      | query not an object          | message.disabled_criteria.query      | "M500000003"  |
      | unknown query_type           | message.disabled_criteria.query_type | "sql"         |
      | idtype-value without value   | message.disabled_criteria            | {"query_type":"idtype-value","query":{"type":"UIN"}} |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "disabled_criteria=M500000003" is sent
    Then the request should be rejected according to the DCI error model
