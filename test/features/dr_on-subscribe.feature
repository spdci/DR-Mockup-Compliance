@method=POST @endpoint=dr/on-subscribe
Feature: Callback for Subscribe To DR based on specific criteria

This API is to be exposed by the SR.
It will be called by the SP systems or other registeries .

    @smoke
    Scenario: Successfully receive async subscribe results from DR
        Given SP has previously sent a subscribe request to DR
        When DR completes processing and calls SP on-subscribe callback
        Then SP should receive the on-subscribe response from DR
        And The on-subscribe response should have status 200
        And The on-subscribe response should have "Content-Type": "application/json" header
        And The on-subscribe response should be returned in a timely manner 15000ms
        And The on-subscribe response should match json schema