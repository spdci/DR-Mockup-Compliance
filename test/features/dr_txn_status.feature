@method=POST @endpoint=dr/txn/status
Feature: Asynchronous transaction status check (POST /registry/txn/status)

This API is exposed by the DR and called by SP systems or other registries to check the
status of a previous request by transaction_id, reference_id list, correlation_id or
subscription code list. The DR acknowledges the request and delivers a TxnStatusResponse
to the txn/on-status callback; its txn_status matches the requested txn_type: a
SearchResponse for a search, a SubscribeResponse for a subscription, an UnSubscribeResponse
for an unsubscription.

  Background:
    Given the "txn status" endpoint

  @smoke
  Scenario: A transaction status request is acknowledged
    Given a transaction status request for "search" transactions by "transaction_id"
    Then the request should be a valid "txn-status" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Status of a <txn type> transaction looked up by <attribute type> is acknowledged
    Given a transaction status request for "<txn type>" transactions by "<attribute type>"
    Then the request should be a valid "txn-status" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | txn type    | attribute type         |
      | search      | transaction_id         |
      | search      | reference_id_list      |
      | search      | correlation_id         |
      | subscribe   | transaction_id         |
      | subscribe   | correlation_id         |
      | subscribe   | subscription_code_list |
      | unsubscribe | transaction_id         |
      | unsubscribe | subscription_code_list |

  @callback
  Scenario Outline: The status of a <txn type> transaction is delivered to the txn/on-status callback
    Given a transaction status request for "<txn type>" transactions by "<attribute type>"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "txn-on-status" callback should be received
    And the callback should be a valid "txn-on-status" message
    And the transaction status should be reported for a "<txn type>" transaction
    And every returned record should be valid DR data

    Examples:
      | txn type    | attribute type         |
      | search      | transaction_id         |
      | subscribe   | subscription_code_list |
      | unsubscribe | correlation_id         |

  @callback
  Scenario: The status of a search transaction carries valid data of a person with disability
    Given a transaction status request for "search" transactions by "reference_id_list"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "txn-on-status" callback should be received
    And the callback should be a valid "txn-on-status" message
    And at least 1 record should be returned
    And every returned record should be a PWDPerson record
    And every returned record should be valid DR data

  @negative
  Scenario Outline: An invalid transaction status request is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                               | field                                     | value           |
      | missing header                     | header                                    | <removed>       |
      | wrong action                       | header.action                             | "txn-on-status" |
      | missing message                    | message                                   | <removed>       |
      | missing transaction_id             | message.transaction_id                    | <removed>       |
      | missing txnstatus_request          | message.txnstatus_request                 | <removed>       |
      | missing reference_id               | message.txnstatus_request.reference_id    | <removed>       |
      | missing txn_type                   | message.txnstatus_request.txn_type        | <removed>       |
      | unknown txn_type                   | message.txnstatus_request.txn_type        | "notify"        |
      | receipt is not a DR txn_type       | message.txnstatus_request.txn_type        | "receipt"       |
      | unknown attribute_type             | message.txnstatus_request.attribute_type  | "message_id"    |
      | missing attribute_value            | message.txnstatus_request.attribute_value | <removed>       |
      | reference_id_list given a string   | message.txnstatus_request                 | {"reference_id":"R1","txn_type":"search","attribute_type":"reference_id_list","attribute_value":"R1"} |
      | subscription codes given a string  | message.txnstatus_request                 | {"reference_id":"R1","txn_type":"subscribe","attribute_type":"subscription_code_list","attribute_value":"SUB-0001"} |
      | transaction_id given a list        | message.txnstatus_request                 | {"reference_id":"R1","txn_type":"search","attribute_type":"transaction_id","attribute_value":["T1"]} |
      | correlation_id with invalid chars  | message.txnstatus_request                 | {"reference_id":"R1","txn_type":"search","attribute_type":"correlation_id","attribute_value":"abc/123"} |
      | invalid locale                     | message.txnstatus_request.locale          | "e"             |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "<xml/>" is sent
    Then the request should be rejected according to the DCI error model
