// Steps of the three disability specific sync endpoints:
//   get-disability-support  -> GetDisabilitySupportResponse (DisabilitySupport of the person)
//   get-disability-details  -> GetDisabilityInfoResponse (DisabilityDetails of the person)
//   disabled                -> DisabledResponse (is the person disabled: yes / no)

import './parameter_types.js';
import { Given, Then } from '@cucumber/cucumber';
import chai from 'chai';
import { disabledMessage, getPath } from '../helpers/payloads.js';
import { testDisabilityPerson } from '../helpers/testdata.js';
import { drCodeOf } from '../helpers/validator.js';
import { useRequest } from './common_steps.js';

const { expect } = chai;

const results = (world) => world.inspected.body?.message?.search_response || [];
const disabledResults = (world) => world.inspected.body?.message?.disabled_response || [];
const recordsOf = (item) => {
  const r = item?.data?.reg_records;
  return Array.isArray(r) ? r : r ? [r] : [];
};

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
Given('a disability request for the {string} person', function (name) {
  useRequest(this, disabledMessage(testDisabilityPerson(name)));
});

// Query forms: "personal details" (process flow 2), "member" (spec example), "idtype-value".
Given('a disability request for the {string} person with a {string} query', function (name, form) {
  useRequest(this, disabledMessage(testDisabilityPerson(name), form));
});

// ---------------------------------------------------------------------------
// DisabledResponse
// ---------------------------------------------------------------------------
Then('the disabled status should be {string}', function (expected) {
  const items = disabledResults(this);
  expect(items, 'disabled_response').to.not.be.empty;
  items.forEach((item, i) => {
    expect(item.status, `disabled_response[${i}].status`).to.equal('succ');
    expect(item.disabled_status, `disabled_response[${i}].disabled_status`).to.equal(expected);
  });
});

Then('one disabled status should be returned', function () {
  expect(disabledResults(this), 'disabled_response').to.have.lengthOf(1);
});

// ---------------------------------------------------------------------------
// GetDisabilitySupportResponse / GetDisabilityInfoResponse
// ---------------------------------------------------------------------------
Then('every disability result should have status {string}', function (status) {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => expect(item.status, `search_response[${i}].status`).to.equal(status));
});

Then('no disability information should be returned', function () {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => {
    if (item.status === 'rjct') return;
    expect(recordsOf(item), `search_response[${i}] records`).to.be.empty;
  });
});

Then('the disability support should list {string}', function (list) {
  const kinds = list.split(',').map((k) => k.trim());
  const support = results(this).flatMap(recordsOf).flatMap((r) => (Array.isArray(r.disabilities) ? r.disabilities : []));
  expect(support, 'disabilities').to.not.be.empty;
  for (const kind of kinds) {
    expect(support.some((s) => (Array.isArray(s[kind]) ? s[kind].length : s[kind] !== undefined)), `a disability support with ${kind}`).to.be.true;
  }
});

Then('the disability details should report the impairment types {string}', function (list) {
  const expected = list.split(',').map((t) => drCodeOf('impairmentType', t.trim()));
  const reported = results(this).flatMap(recordsOf)
    .flatMap((r) => (Array.isArray(r.disability_details) ? r.disability_details : []))
    .map((d) => drCodeOf('impairmentType', d.impairment_type));
  expect(reported, 'reported impairment types (codes)').to.include.members(expected);
});

Then('the disability details should report the disability status {string}', function (status) {
  const records = results(this).flatMap(recordsOf);
  expect(records, 'disability details').to.not.be.empty;
  records.forEach((r, i) => {
    const value = getPath(r, 'disability_status');
    if (value !== undefined) expect(drCodeOf('disabilityStatus', value), `reg_records[${i}].disability_status`).to.equal(drCodeOf('disabilityStatus', status));
  });
});
