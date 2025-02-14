@method=POST @endpoint=dr/sync/get-diability-support
Feature: Get person disability support from DR

This API is to be exposed by the DR.
It will be called by the SP systems or other registries.

    @smoke
    Scenario: Successfully get disability support from DR
        Given System wants to get a person disability support
        When A POST request to get disability support is sent
        Then The response from the get disability support should be received
        And The get disability support response should have status 200
        And The get disability support response should have "Content-Type": "application/json" header
        And The get disability support response should be returned in a timely manner within 15000ms
        And The get disability support response should match the expected JSON schema

