@method=POST @endpoint=dr/notify
Feature: Receive event notifications from the DR (POST /registry/notify)

This API is exposed by the subscriber (SP-MIS or another registry). The DR calls it when a
subscribed event occurs (RegistryEventType "register": the DR sends registrations and
updates of persons with disability). The suite plays the DR: every notification is first
checked against the spec (including the DR data rules), then the subscriber must
acknowledge it.

  Background:
    Given the "notify" endpoint

  @smoke
  Scenario: Successfully receive the registration of a person with disability
    Given a notify request for a "register" event carrying the "full" PWDPerson record
    Then the request should be a valid "notify" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: A "<event>" notification carrying the <profile> <type> record is acknowledged
    Given a notify request for a "<event>" event carrying the "<profile>" <type> record
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Persons with disability (approved, pending, expired assessments)
      | event    | type      | profile |
      | register | PWDPerson | full    |
      | register | PWDPerson | elder   |
      | register | PWDPerson | pending |
      | register | PWDPerson | expired |
      | register | PWDPerson | minimal |

    Examples: Persons, members and groups
      | event    | type     | profile   |
      | register | DRPerson | deceased  |
      | register | DRPerson | newborn   |
      | register | Member   | disabled  |
      | register | Member   | caregiver |
      | register | Group    | full      |
      | register | Group    | large     |

    Examples: Namespaced event types
      | event                                   | type      | profile |
      | spdci-common:RegistryEventType:register | PWDPerson | elder   |
      | ns:org:RegistryEventType:register       | Group     | single  |

  @functional
  Scenario Outline: reg_records may be a single <type> object, as declared in the spec
    Given a notify request for a "register" event carrying the "full" <type> record as a single object
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      |
      | PWDPerson |
      | DRPerson  |
      | Member    |
      | Group     |

  @functional
  Scenario: A batch notification covers several registrations
    Given a batch notify request for "register" events carrying "PWDPerson:full, PWDPerson:elder, Member:single, Group:full"
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  @negative
  Scenario Outline: An invalid notification is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and event
      | case                    | field                                       | value          |
      | missing header          | header                                      | <removed>      |
      | wrong action            | header.action                               | "on-search"    |
      | missing header status   | header.status                               | <removed>      |
      | missing transaction_id  | message.transaction_id                      | <removed>      |
      | missing notify_event    | message.notify_event                        | <removed>      |
      | empty notify_event      | message.notify_event                        | []             |
      | missing reference_id    | message.notify_event.0.reference_id         | <removed>      |
      | missing timestamp       | message.notify_event.0.timestamp            | <removed>      |
      | missing data            | message.notify_event.0.data                 | <removed>      |
      | missing reg_record_type | message.notify_event.0.data.reg_record_type | <removed>      |
      | unknown reg_record_type | message.notify_event.0.data.reg_record_type | "Patient"      |
      | missing reg_records     | message.notify_event.0.data.reg_records     | <removed>      |
      | unknown DR event        | message.notify_event.0.data.reg_event_type  | "update"       |
      | event in upper case     | message.notify_event.0.data.reg_event_type  | "REGISTER"     |
      | invalid locale          | message.notify_event.0.locale               | "en-GB"        |

    @strict-data
    Examples: DR data in the notification
      | case                               | field                                                                                   | value          |
      | disability_status outside CD.DR.14 | message.notify_event.0.data.reg_records.0.disability_status                             | "Registered"   |
      | impairment level as number 5       | message.notify_event.0.data.reg_records.0.disability_details.0.impairment_level         | 5              |
      | age of onset outside CD.DR.07      | message.notify_event.0.data.reg_records.0.disability_details.0.age_on_set               | "Adolescence"  |
      | human assistance type outside list | message.notify_event.0.data.reg_records.0.disability_support.0.human_assistance.0.type  | "Personal care" |
      | housing support outside CD.DR.12   | message.notify_event.0.data.reg_records.0.disability_support.0.housing_support.0.type   | "Ramp"         |
      | programme without identification   | message.notify_event.0.data.reg_records.0.programs_enrolments                           | [{"programme_description":"Grant"}] |
      | personal details birth date format | message.notify_event.0.data.reg_records.0.personal_details.demographic_info.birth_date  | "20-02-2012"   |
      | member disabled flag as text       | message.notify_event.0.data.reg_records.0.personal_details.is_disabled                  | "true"         |
      | group records with bad group_size  | message.notify_event.0.data                                                             | {"reg_event_type":"register","reg_record_type":"Group","reg_records":[{"group_size":0}]} |
      | person records with bad sex        | message.notify_event.0.data                                                             | {"reg_event_type":"register","reg_record_type":"DRPerson","reg_records":[{"sex":"Male"}]} |
