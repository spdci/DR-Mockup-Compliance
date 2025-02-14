@method=POST @endpoint=dr/sync/search
Feature: Search perspn from DR based on specific criteria

This API is to be exposed by the DR.
It will be called by the SP systems or other registries.

    @smoke
    Scenario: Successfully search DR to be processed
        Given System wants to sync search for person in DR
        When A POST request to sync search is sent
        Then The response from the sync search should be received
        And The sync search response should have status 200
        And The sync search response should have "Content-Type": "application/json" header
        And The sync search response should be returned in a timely manner within 15000ms
        And The sync search response should match the expected JSON schema

