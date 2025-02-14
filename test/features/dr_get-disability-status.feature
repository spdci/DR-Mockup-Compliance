@method=POST @endpoint=dr/sync/get-diability-status
Feature: Get person disability status from DR

This API is to be exposed by the DR.
It will be called by the SP systems or other registries.

    @smoke
    Scenario: Successfully get disability status from DR
        Given System wants to get a person disability status
        When A POST request to get disability status is sent
        Then The response from the get disability status should be received
        And The get disability status response should have status 200
        And The get disability status response should have "Content-Type": "application/json" header
        And The get disability status response should be returned in a timely manner within 15000ms
        And The get disability status response should match the expected JSON schema

