import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then, Before } from '@cucumber/cucumber';
import {
  localhost,
  defaultExpectedResponseTime,
  acceptHeader,
  getdisabilitystatusEndpoint,
  getdisabilitystatusResponseSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema'; // Import correctly
import chaiString from 'chai-string';

chai.use(chaiString);

chai.use(chaiJsonSchema); // Use the imported schema validation

const baseUrl = localhost + getdisabilitystatusEndpoint;

let specdisabilitystatus;


// Given step: Initialize search for beneficiaries
Given(/^System wants to get a person disability status$/, function () {
  specdisabilitystatus = spec(); // Initialize the specSearch object
});

When(/^A POST request to get disability status is sent$/, async function () {
  try {
    const response = await specdisabilitystatus
      .post(baseUrl)
      .withHeaders(acceptHeader.key, acceptHeader.value);
    this.response = response; // Save response for validation in Then steps
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
});


// Then step: Ensure the response is received
Then(/^The response from the get disability status should be received$/, async function () {
  chai.expect(this.response).to.exist; // Uncomment once debugged
});

// Then step: Validate the response status code
Then(/^The get disability status response should have status (\d+)$/, async  function(status)  {
  chai.expect(this.response.statusCode).to.equal(status);
});

// Then step: Validate header in the response
Then(/^The get disability status response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
  //chai.expect(this.response.rawHeaders).to.include(value);
});

// Then step: Validate response time
Then(/^The get disability status response should be returned in a timely manner within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
    //this.response.to.have.responseTimeLessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then(/^The get disability status response should match the expected JSON schema$/, async  function() {
  chai.expect(this.response.body).to.be.jsonSchema(getdisabilitystatusResponseSchema);
});

