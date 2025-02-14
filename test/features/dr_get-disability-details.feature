@method=POST @endpoint=dr/sync/get-diability-details
Feature: Get person disability details from DR

This API is to be exposed by the DR.
It will be called by the SP systems or other registries.

    @smoke
    Scenario: Successfully get disability details from DR
        Given System wants to get a person disability details
        When A POST request to get disability details is sent
        Then The response from the get disability details should be received
        And The get disability details response should have status 200
        And The get disability details response should have "Content-Type": "application/json" header
        And The get disability details response should be returned in a timely manner within 15000ms
        And The get disability details response should match the expected JSON schema

