import './parameter_types.js';
import { Given, Then } from '@cucumber/cucumber';
import chai from 'chai';
import {
  searchItem, searchMessage, idTypeValueQuery, predicateQuery, expressionQuery, graphqlQuery, consent,
  getPathValues,
} from '../helpers/payloads.js';
import { codes } from '../helpers/schemas.js';
import { recordTypeOf, requestedRecordType, drCodeOf, drAttributeCodeList } from '../helpers/validator.js';
import { identifiersOf } from '../fixtures/records.js';
import { useRequest } from './common_steps.js';

const { expect } = chai;

const items = (world) => world.request.message.search_request;
const results = (world) => {
  const message = world.inspected.body?.message;
  return message?.search_response || message?.txnstatus_response?.txn_status?.search_response || [];
};
const recordsOf = (item) => {
  const r = item?.data?.reg_records;
  return Array.isArray(r) ? r : r ? [r] : [];
};
// Untyped reg_records are persons with disability (DisabledPerson in the spec).
const typeOf = (item) => (item?.data?.reg_record_type === undefined ? 'PWDPerson' : recordTypeOf(item.data.reg_record_type));

// Named predicates of the DR process flows (eligibility queries).
export const predicates = {
  // Process flow 1: individuals with a specific disability criteria.
  'the person with disability is approved with a mobility impairment': [
    { attribute_name: 'disability_status', operator: 'eq', attribute_value: 'Approved' },
    { attribute_name: 'disability_details.impairment_type', operator: 'eq', attribute_value: 'Mobility' },
  ],
  'the person with disability is approved': [
    { attribute_name: 'disability_status', operator: 'eq', attribute_value: 'Approved' },
  ],
  'the person was born before 1966': [
    { attribute_name: 'birth_date', operator: 'lt', attribute_value: '1966-01-01' },
  ],
  'the member is disabled': [
    { attribute_name: 'is_disabled', operator: 'eq', attribute_value: true },
  ],
  'poverty_score is below 5': [{ attribute_name: 'poverty_score', operator: 'lt', attribute_value: 5 }],
  'group_size is below 5': [{ attribute_name: 'group_size', operator: 'lt', attribute_value: 5 }],
};

// ---------------------------------------------------------------------------
// Building search requests
// ---------------------------------------------------------------------------
Given('a search for the {string} {recordType} by identifier', function (name, type) {
  useRequest(this, searchMessage([searchItem(type, idTypeValueQuery(type, name))]));
});

// Without reg_record_type the DR answers with persons with disability (DisabledPerson).
Given('a search for the {string} PWDPerson by identifier without a reg_record_type', function (name) {
  useRequest(this, searchMessage([searchItem(undefined, idTypeValueQuery('PWDPerson', name))]));
});

// reg_record_type in the namespaced form of the spec ("spdci-extensions-dci:DisabledPerson").
Given('a search for the {string} {recordType} by identifier with reg_record_type {string}', function (name, type, regRecordType) {
  const item = searchItem(type, idTypeValueQuery(type, name));
  item.search_criteria.reg_record_type = regRecordType;
  useRequest(this, searchMessage([item]));
});

// Process flow 3 names the record type with response_entity instead of reg_record_type.
Given('a search for the {string} {recordType} by identifier with response_entity', function (name, type) {
  const item = searchItem(undefined, idTypeValueQuery(type, name));
  item.search_criteria.response_entity = type;
  useRequest(this, searchMessage([item]));
});

Given('a batch search for the {recordType} records {string}', function (type, list) {
  const names = list.split(',').map((n) => n.trim());
  useRequest(this, searchMessage(names.map((n) => searchItem(type, idTypeValueQuery(type, n)))));
});

// "PWDPerson:full, Member:disabled, Group:full": one request item per record type and name.
Given('a batch search mixing record types {string}', function (list) {
  const pairs = list.split(',').map((p) => p.trim().split(':'));
  useRequest(this, searchMessage(pairs.map(([type, name]) => searchItem(type, idTypeValueQuery(type, name)))));
});

Given('a predicate search for {recordType} records where {string}', function (type, name) {
  this.predicate = predicates[name];
  if (!this.predicate) throw new Error(`Unknown predicate "${name}". Known: ${Object.keys(predicates).join(', ')}`);
  useRequest(this, searchMessage([searchItem(type, predicateQuery(this.predicate))]));
});

Given('an expression search for {string}', function (name) {
  const type = name.split(' ')[0];
  useRequest(this, searchMessage([searchItem(type, expressionQuery(name))]));
});

Given('a graphql search for {recordType} records', function (type) {
  useRequest(this, searchMessage([searchItem(type, graphqlQuery(type))]));
});

Given('the search requests page {int} with page_size {int}', function (page, size) {
  items(this).forEach((i) => { i.search_criteria.pagination = { page_size: size, page_number: page }; });
});

Given('the search results are sorted by {string} in {string} order', function (attribute, order) {
  items(this).forEach((i) => { i.search_criteria.sort = [{ attribute_name: attribute, sort_order: order }]; });
});

Given('the search request asks for locale {string}', function (locale) {
  items(this).forEach((i) => { i.locale = locale; });
});

Given('the search request carries consent and authorize information', function () {
  items(this).forEach((i) => {
    i.search_criteria.consent = consent('Consent');
    i.search_criteria.authorize = consent('Authorize');
  });
});

// ---------------------------------------------------------------------------
// Functional checks on search results (response of sync search, on-search callback,
// txn status of a search)
// ---------------------------------------------------------------------------
Then('every search result should have status {string}', function (status) {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => expect(item.status, `search_response[${i}].status`).to.equal(status));
});

// Each request item is answered with records of the requested type that carry the queried
// identifier (a group carries the identifiers of its members, a person with disability those
// of their personal details).
function expectRecordsMatchQuery(requestItem, item) {
  const { type, value } = requestItem.search_criteria.query;
  const asked = requestedRecordType(requestItem);
  recordsOf(item).forEach((record, j) => {
    const recordType = typeOf(item);
    expect(recordType, `search_response for ${item.reference_id} record type`).to.equal(asked);
    const ids = identifiersOf[recordType](record).map((id) => `${id?.identifier_type}|${id?.identifier_value}`);
    expect(ids, `reg_records[${j}] (${recordType}) does not carry the queried identifier ${type} ${value}`).to.include(`${type}|${value}`);
  });
}

Then('the result should contain the record identified by the query', function () {
  const r = results(this);
  items(this).forEach((requestItem) => {
    const item = r.find((x) => x.reference_id === requestItem.reference_id);
    expect(item, `result for reference_id ${requestItem.reference_id}`).to.exist;
    const { type, value } = requestItem.search_criteria.query;
    expect(recordsOf(item), `records for ${type} ${value}`).to.not.be.empty;
    expectRecordsMatchQuery(requestItem, item);
  });
});

// Values are compared as the standard defines them: DR codes whether sent as code or label,
// flags as booleans, dates by calendar day. A path crossing a list (disability_details.impairment_type)
// is satisfied when one of the listed values satisfies it.
function satisfies(name, actual, op, expected) {
  const list = drAttributeCodeList[name.split('.').at(-1)];
  const norm = (v) => {
    if (list) return drCodeOf(list, v) ?? v;
    if (v === 1 || v === 0) return v === 1;
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v;
  };
  const a = norm(actual);
  const e = norm(expected);
  switch (op) {
    case 'eq': return a === e;
    case 'gt': return a > e;
    case 'lt': return a < e;
    case 'ge': return a >= e;
    case 'le': return a <= e;
    case 'in': return (Array.isArray(expected) ? expected : String(expected).split(',')).map(norm).includes(a);
    default: return true;
  }
}

Then('every returned record should satisfy the predicate', function () {
  results(this).flatMap(recordsOf).forEach((record, j) => {
    for (const { attribute_name: name, operator, attribute_value: value } of this.predicate) {
      const values = getPathValues(record, name);
      if (!values.length) continue; // optional attribute not disclosed
      expect(values.some((v) => satisfies(name, v, operator, value)),
        `reg_records[${j}].${name} = ${JSON.stringify(values)} does not satisfy "${operator} ${JSON.stringify(value)}"`).to.be.true;
    }
  });
});

Then('the returned records should be sorted by {string} in {string} order', function (attribute, order) {
  results(this).forEach((item, i) => {
    const values = recordsOf(item).map((r) => getPathValues(r, attribute)[0]).filter((v) => v !== undefined);
    const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (order === 'desc') sorted.reverse();
    expect(values, `search_response[${i}] ${attribute} order`).to.deep.equal(sorted);
  });
});

Then('the search result pagination should report page {int} with at most {int} record(s) per page', function (page, size) {
  results(this).forEach((item, i) => {
    expect(item.pagination, `search_response[${i}].pagination`).to.exist;
    expect(item.pagination.page_number, `search_response[${i}].pagination.page_number`).to.equal(page);
    expect(item.pagination.page_size, `search_response[${i}].pagination.page_size`).to.be.at.most(size);
    expect(recordsOf(item).length, `search_response[${i}] record count`).to.be.at.most(size);
  });
});

Then('every requested locale should be honoured', function () {
  const asked = Object.fromEntries(items(this).map((i) => [i.reference_id, i.locale]));
  results(this).forEach((item, i) => {
    if (item.locale !== undefined && asked[item.reference_id]) {
      expect(item.locale, `search_response[${i}].locale`).to.equal(asked[item.reference_id]);
    }
  });
});

Then('the search result should be empty or rejected with a valid reason code', function () {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => {
    if (item.status === 'rjct') {
      expect(codes.searchStatusReasonCode, `search_response[${i}].status_reason_code`).to.include(item.status_reason_code);
    } else {
      expect(recordsOf(item), `search_response[${i}] records for an unknown identifier`).to.be.empty;
      if (item.pagination) expect(item.pagination.total_count, `search_response[${i}].pagination.total_count`).to.equal(0);
    }
  });
});

Then('the search result should be rejected with reason code {string}', function (code) {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => {
    expect(item.status, `search_response[${i}].status`).to.equal('rjct');
    expect(item.status_reason_code, `search_response[${i}].status_reason_code`).to.equal(code);
  });
});

Then('each batch item should be answered with its own result', function () {
  const r = results(this);
  const refs = items(this).map((i) => i.reference_id);
  expect(r.map((x) => x.reference_id).sort(), 'answered reference_ids').to.deep.equal([...refs].sort());
  items(this).forEach((requestItem) => {
    const item = r.find((x) => x.reference_id === requestItem.reference_id);
    expectRecordsMatchQuery(requestItem, item);
  });
});
