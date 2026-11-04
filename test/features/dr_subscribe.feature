@method=POST @endpoint=dr/subscribe
Feature: Subscribe to Disability Registry events (POST /registry/subscribe)

This API is exposed by the DR and called by SP systems or other registries
(process flow 4: register for notifications of persons with disability). The subscriber
names the event (RegistryEventType: register), the record type to be notified with
(notify_record_type) and the persons to watch (filter). The DR acknowledges the request and
delivers the subscription result (SubscribeResponse with subscription codes) to the
on-subscribe callback.

  Background:
    Given the "subscribe" endpoint

  @smoke
  Scenario: A subscription to registrations of persons with disability is acknowledged
    Given a subscribe request for "register" events on PWDPerson records filtered by "idtype-value"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Subscription to "<event>" events on <type> records filtered by <filter type> is acknowledged
    Given a subscribe request for "<event>" events on <type> records filtered by "<filter type>"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Record types
      | event    | type      | filter type  |
      | register | PWDPerson | idtype-value |
      | register | DRPerson  | idtype-value |
      | register | Member    | idtype-value |
      | register | Group     | idtype-value |

    Examples: Filter types (process flow 4: approved persons with disability)
      | event    | type      | filter type |
      | register | PWDPerson | predicate   |
      | register | PWDPerson | expression  |
      | register | PWDPerson | graphql     |

    Examples: Namespaced event types
      | event                                  | type      | filter type  |
      | spdci-common:RegistryEventType:register | PWDPerson | expression   |
      | ns:org:RegistryEventType:register       | Member    | idtype-value |

  @functional
  Scenario: A batch subscription for several record types is acknowledged
    Given a subscribe request for "register" events on the record types "PWDPerson, DRPerson, Member, Group"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  # ---------------------------------------------------------------------------
  # Full async round trip
  # ---------------------------------------------------------------------------
  @callback
  Scenario Outline: The subscription result for <type> records is delivered to the on-subscribe callback
    Given a subscribe request for "register" events on <type> records filtered by "<filter type>"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-subscribe" callback should be received
    And the callback should be a valid "on-subscribe" message
    And every subscription should be confirmed with a subscription code
    And every subscription should echo the requested event and record type

    Examples:
      | type      | filter type  |
      | PWDPerson | expression   |
      | PWDPerson | idtype-value |
      | Member    | idtype-value |
      | Group     | idtype-value |

  @callback
  Scenario: Every item of a batch subscription is confirmed in the on-subscribe callback
    Given a subscribe request for "register" events on the record types "PWDPerson, DRPerson, Member"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-subscribe" callback should be received
    And the callback should be a valid "on-subscribe" message
    And every subscription should be confirmed with a subscription code
    And every subscription should echo the requested event and record type

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid subscription is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                         | field                                                               | value        |
      | missing header               | header                                                              | <removed>    |
      | wrong action                 | header.action                                                       | "search"     |
      | missing message              | message                                                             | <removed>    |
      | missing transaction_id       | message.transaction_id                                              | <removed>    |
      | empty subscribe_request      | message.subscribe_request                                           | []           |
      | missing subscribe_criteria   | message.subscribe_request.0.subscribe_criteria                      | <removed>    |
      | missing reg_event_type       | message.subscribe_request.0.subscribe_criteria.reg_event_type       | <removed>    |
      | unknown DR event             | message.subscribe_request.0.subscribe_criteria.reg_event_type       | "LiveBirth"  |
      | event in upper case          | message.subscribe_request.0.subscribe_criteria.reg_event_type       | "REGISTER"   |
      | process flow 4 event         | message.subscribe_request.0.subscribe_criteria.reg_event_type       | "spdci-common:RegistryEventType:NewDisabledNewborn" |
      | missing filter               | message.subscribe_request.0.subscribe_criteria.filter               | <removed>    |
      | filter not matching type     | message.subscribe_request.0.subscribe_criteria.filter               | [{"expression1":{"attribute_name":"disability_status","operator":"eq","attribute_value":"Approved"}}] |
      | unknown filter_type          | message.subscribe_request.0.subscribe_criteria.filter_type          | "sql"        |
      | missing notify_record_type   | message.subscribe_request.0.subscribe_criteria.notify_record_type   | <removed>    |
      | unknown notify_record_type   | message.subscribe_request.0.subscribe_criteria.notify_record_type   | "Patient"    |
      | frequency without end_time   | message.subscribe_request.0.subscribe_criteria.frequency.end_time   | <removed>    |
      | frequency start not ISO 8601 | message.subscribe_request.0.subscribe_criteria.frequency.start_time | "tomorrow"   |
      | frequency without cron       | message.subscribe_request.0.subscribe_criteria.frequency.frequency  | <removed>    |
      | invalid locale               | message.subscribe_request.0.locale                                  | "en"         |
      | missing reference_id         | message.subscribe_request.0.reference_id                            | <removed>    |
      | missing timestamp            | message.subscribe_request.0.timestamp                               | <removed>    |
