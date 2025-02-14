import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';
import {
  localhost,
  defaultExpectedResponseTime,
  acceptHeader,
  searchEndpoint,
  searchResponseSchema,
  regRecordsSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema'; // Import correctly
import chaiString from 'chai-string';

chai.use(chaiString);

chai.use(chaiJsonSchema); // Use the imported schema validation

const baseUrl = localhost + searchEndpoint;

let specSearch;


// Given step: Initialize search for beneficiaries
Given(/^System wants to sync search for person in DR$/, function () {
  specSearch = spec(); // Initialize the specSearch object
});

When(/^A POST request to sync search is sent$/, async function () {
  try {
    const response = await specSearch
      .post(baseUrl)
      .withHeaders(acceptHeader.key, acceptHeader.value);
    this.response = response; // Save response for validation in Then steps
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
});


// Then step: Ensure the response is received
Then(/^The response from the sync search should be received$/, async function () {
  chai.expect(this.response).to.exist; // Uncomment once debugged
});

// Then step: Validate the response status code
Then(/^The sync search response should have status (\d+)$/, async  function(status)  {
  chai.expect(this.response.statusCode).to.equal(status);
});

// Then step: Validate header in the response
Then(/^The sync search response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
});

// Then step: Validate response time
Then(/^The sync search response should be returned in a timely manner within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then(/^The sync search response should match the expected JSON schema$/, async  function() {
  console.log("Response type:", typeof this.response.body);
  chai.expect(this.response.body).to.be.jsonSchema(searchResponseSchema);
});