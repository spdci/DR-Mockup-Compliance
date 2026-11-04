#!/usr/bin/env node
// Generates the Mockoon environments of the DCI Disability Registry (DR) v1.0.0 API:
//   mockoon-dr.json    DR (registry) side, port 3003:
//                      search, sync/search, subscribe, unsubscribe, txn/status,
//                      sync/get-disability-support, sync/get-disability-details,
//                      sync/disabled (and its summary name sync/get-disability-status)
//   mockoon-sp.json    SP side (callbacks received from the DR), port 3004:
//                      on-search, on-subscribe, on-unsubscribe, txn/on-status, notify
//
// Every endpoint validates the request against the spec schema (Mockoon valid_json_schema
// rule) and answers an ERR acknowledgement when it does not conform. Async DR endpoints
// ACK and then call header.sender_uri back with the spec callback (on-search, ...).
//
// Searches return persons with disability (PWDPerson), persons (DRPerson), members (Member)
// or groups (Group) depending on search_criteria.reg_record_type / response_entity
// (persons with disability when neither is given, as the spec's DisabledPerson records).
//
// Schemas and records are imported from the test suite so that the mocks and the
// compliance tests always agree. Run after changing them:
//   node mock/generate-mocks.mjs

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { schemas } from '../test/features/support/helpers/schemas.js';
import {
  pwdPersons, recordsByIdentifier, predicateResults, disabilityIndex,
} from '../test/features/support/fixtures/records.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Stable UUIDs so regenerating produces minimal diffs.
const uuid = (seed) => {
  const h = createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const REG_TYPE = 'ns:org:RegistryType:DR';
const DR_ID = 'dr.example.org';
const NOW = '{{now "yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx"}}';
const JSON_HEADERS = [{ key: 'Content-Type', value: 'application/json' }];

// ---------------------------------------------------------------------------
// Handlebars templates
// ---------------------------------------------------------------------------
const ack = (status = 'ACK') => `{
  "message": {
    "ack_status": "${status}",
    "timestamp": "${NOW}",
    "correlation_id": "{{guid}}"
  }
}`;

const err = (what) => `{
  "message": {
    "ack_status": "ERR",
    "timestamp": "${NOW}",
    "error": {
      "code": "err.request.bad",
      "message": "Request does not conform to the DCI Disability Registry ${what} schema"
    },
    "correlation_id": "{{guid}}"
  }
}`;

// One SearchResponse item for the search_request item in scope (`this`).
// The record type is search_criteria.reg_record_type, else response_entity, else PWDPerson;
// the "alias" data bucket maps its spellings ("spdci-extensions-dci:DisabledPerson", ...) to
// PWDPerson, DRPerson, Member or Group. Records are looked up in the "index" data bucket:
// "<type>|<identifier_value>" for idtype-value queries, "<type>|<query_type>" for predicate,
// expression and graphql queries. Sort and pagination are honoured.
const searchItem = (indexVar) => `{{setVar 'all' (array)}}
      {{setVar 'rt' 'PWDPerson'}}{{#if this.search_criteria.response_entity}}{{setVar 'rt' this.search_criteria.response_entity}}{{/if}}{{#if this.search_criteria.reg_record_type}}{{setVar 'rt' this.search_criteria.reg_record_type}}{{/if}}
      {{setVar 'ct' (dataRaw 'alias' @rt)}}
      {{#if (eq this.search_criteria.query_type 'idtype-value')}}{{setVar 'found' (dataRaw 'index' (concat @ct '|' this.search_criteria.query.value))}}{{else}}{{setVar 'found' (dataRaw 'index' (concat @ct '|' this.search_criteria.query_type))}}{{/if}}
      {{#if @found}}{{setVar 'all' (slice @found 0)}}{{/if}}
      {{#if this.search_criteria.sort}}{{setVar 'all' (sortBy @all this.search_criteria.sort.[0].attribute_name this.search_criteria.sort.[0].sort_order)}}{{/if}}
      {{setVar 'size' (bodyRaw (concat 'message.search_request.' ${indexVar} '.search_criteria.pagination.page_size') 10)}}
      {{setVar 'page' (bodyRaw (concat 'message.search_request.' ${indexVar} '.search_criteria.pagination.page_number') 1)}}
      {{#if (eq this.search_criteria.query.value 'TOOMANY000')}}
      {
        "reference_id": "{{this.reference_id}}",
        "timestamp": "${NOW}",
        "status": "rjct",
        "status_reason_code": "rjct.search.too_many_records_found",
        "status_reason_message": "Too many records match the search criteria, refine the query",
        "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
      }
      {{else}}
      {
        "reference_id": "{{this.reference_id}}",
        "timestamp": "${NOW}",
        "status": "succ",
        "data": {
          "version": "1.0.0",
          "reg_type": "${REG_TYPE}",
          "reg_record_type": "{{@rt}}",
          "reg_records": {{{stringify (slice @all (multiply (subtract @page 1) @size) (multiply @page @size))}}}
        },
        "pagination": {
          "page_size": {{@size}},
          "page_number": {{@page}},
          "total_count": {{len @all}}
        },
        "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
      }
      {{/if}}`;

const searchMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "search_response": [
      {{#each (bodyRaw 'message.search_request')}}
      ${searchItem('@index')}{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }`;

const callbackHeader = (action, countPath) => `{
    "version": "1.0.0",
    "message_id": "{{guid}}",
    "message_ts": "${NOW}",
    "action": "${action}",
    "status": "succ",
    "total_count": ${countPath ? `{{len (bodyRaw '${countPath}')}}` : 1},
    "completed_count": ${countPath ? `{{len (bodyRaw '${countPath}')}}` : 1},
    "sender_id": "${DR_ID}",
    "receiver_id": "{{bodyRaw 'header.sender_id'}}",
    "is_msg_encrypted": false
  }`;

const msgHeader = (action, countPath) => `{
    "version": "1.0.0",
    "message_id": "{{guid}}",
    "message_ts": "${NOW}",
    "action": "${action}",
    "sender_id": "${DR_ID}",
    "receiver_id": "{{bodyRaw 'header.sender_id'}}",
    "total_count": ${countPath ? `{{len (bodyRaw '${countPath}')}}` : 1},
    "is_msg_encrypted": false
  }`;

const onSearchBody = `{
  "header": ${callbackHeader('on-search', 'message.search_request')},
  "message": ${searchMessage}
}`;

const subscribeMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "subscribe_response": [
      {{#each (bodyRaw 'message.subscribe_request')}}
      {
        "reference_id": "{{this.reference_id}}",
        "timestamp": "${NOW}",
        "status": "succ",
        "subscriptions": [
          {
            "version": "1.0.0",
            "code": "SUB-{{guid}}",
            "status": "subscribe",
            "timestamp": "${NOW}",
            "reg_type": "{{#if this.subscribe_criteria.reg_type}}{{this.subscribe_criteria.reg_type}}{{else}}${REG_TYPE}{{/if}}",
            "reg_event_type": "{{this.subscribe_criteria.reg_event_type}}",
            {{#if this.subscribe_criteria.frequency}}"frequency": {{{stringify this.subscribe_criteria.frequency}}},{{/if}}
            {{#if this.subscribe_criteria.filter_type}}"filter_type": "{{this.subscribe_criteria.filter_type}}",{{/if}}
            "filter": {{{stringify this.subscribe_criteria.filter}}},
            "notify_record_type": "{{this.subscribe_criteria.notify_record_type}}",
            "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
          }
        ],
        "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }`;

const unsubscribeMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "timestamp": "${NOW}",
    "status": "succ",
    "subscription_status": [
      {{#each (bodyRaw 'message.subscription_codes')}}
      { "code": "{{this}}", "status": "unsubscribe" }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }`;

// TxnStatusResponse for the txn_type asked: the search variant reports a search of the person
// with disability "full", the subscribe and unsubscribe variants a confirmed (un)subscription.
const txnStatusMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "txnstatus_response": {
      "txn_type": "{{bodyRaw 'message.txnstatus_request.txn_type'}}",
      "txn_status":
      {{#switch (bodyRaw 'message.txnstatus_request.txn_type')}}
      {{#case 'subscribe'}}
      {
        "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
        "correlation_id": "{{guid}}",
        "subscribe_response": [
          {
            "reference_id": "{{bodyRaw 'message.txnstatus_request.reference_id'}}",
            "timestamp": "${NOW}",
            "status": "succ",
            "subscriptions": [
              { "version": "1.0.0", "code": "SUB-0001", "status": "subscribe", "timestamp": "${NOW}", "reg_type": "${REG_TYPE}", "reg_event_type": "register", "notify_record_type": "PWDPerson" }
            ]
          }
        ]
      }
      {{/case}}
      {{#case 'unsubscribe'}}
      {
        "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
        "correlation_id": "{{guid}}",
        "timestamp": "${NOW}",
        "status": "succ",
        "subscription_status": [ { "code": "SUB-0001", "status": "unsubscribe" } ]
      }
      {{/case}}
      {{#default}}
      {
        "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
        "correlation_id": "{{guid}}",
        "search_response": [
          {
            "reference_id": "{{bodyRaw 'message.txnstatus_request.reference_id'}}",
            "timestamp": "${NOW}",
            "status": "succ",
            "data": {
              "version": "1.0.0",
              "reg_type": "${REG_TYPE}",
              "reg_record_type": "PWDPerson",
              "reg_records": {{{stringify (dataRaw 'index' 'PWDPerson|M500000003')}}}
            },
            "pagination": { "page_size": 10, "page_number": 1, "total_count": 1 },
            "locale": "{{bodyRaw 'message.txnstatus_request.locale' 'eng'}}"
          }
        ]
      }
      {{/default}}
      {{/switch}}
    }
  }`;

// The person a disabled_criteria designates: query.value (idtype-value), else the value of the
// first query attribute, given as { "eq": <value> } (spec example) or directly. `item` renders
// the result for that person (@v).
const forQueriedPerson = (item) => `{{#if (bodyRaw 'message.disabled_criteria.query.value')}}
      {{setVar 'v' (concat (bodyRaw 'message.disabled_criteria.query.value'))}}
      ${item}
      {{else}}
      {{#each (bodyRaw 'message.disabled_criteria.query')}}{{#if @first}}
      {{#if this.eq}}{{setVar 'v' (concat this.eq)}}{{else}}{{setVar 'v' (concat this)}}{{/if}}
      ${item}
      {{/if}}{{/each}}
      {{/if}}`;

// GetDisabilitySupportResponse / GetDisabilityInfoResponse item from a data bucket keyed by
// identifier value ("support" or "details").
const disabilityItem = (bucket, notFound) => `{{setVar 'found' (dataRaw '${bucket}' @v)}}
      {
        "reference_id": "{{bodyRaw 'message.transaction_id'}}",
        "timestamp": "${NOW}",
        "status": "succ",
        {{#unless @found}}"status_reason_message": "${notFound}",{{/unless}}
        "data": {
          "version": "1.0.0",
          "reg_records": {{#if @found}}{{{stringify @found}}}{{else}}[]{{/if}}
        },
        "pagination": { "page_size": 10, "page_number": 1, "total_count": {{#if @found}}{{len @found}}{{else}}0{{/if}} },
        "locale": "eng"
      }`;

const disabilityResponse = (bucket, notFound) => `{
  "header": ${callbackHeader('on-search')},
  "message": {
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "search_response": [
      ${forQueriedPerson(disabilityItem(bucket, notFound))}
    ]
  }
}`;

// DisabledResponse: "yes" for an approved disability, "no" otherwise (pending or expired
// assessment, person not registered as disabled).
const disabledItem = `{{setVar 'st' (dataRaw 'status' @v)}}
      {
        "reference_id": "{{bodyRaw 'message.transaction_id'}}",
        "timestamp": "${NOW}",
        "status": "succ",
        {{#unless @st}}"status_reason_message": "The person is not registered in the disability registry",{{/unless}}
        "disabled_status": "{{#if @st}}{{@st}}{{else}}no{{/if}}"
      }`;

const disabledResponse = `{
  "header": ${callbackHeader('on-search')},
  "message": {
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "disabled_response": [
      ${forQueriedPerson(disabledItem)}
    ]
  }
}`;

// ---------------------------------------------------------------------------
// Environment builders
// ---------------------------------------------------------------------------
const response = (seed, { statusCode = 200, label, body, rules = [], isDefault = false, callbacks = [] }) => ({
  uuid: uuid(seed),
  body,
  latency: 0,
  statusCode,
  label,
  headers: JSON_HEADERS,
  bodyType: 'INLINE',
  filePath: '',
  databucketID: '',
  sendFileAsBody: false,
  rules,
  rulesOperator: 'OR',
  disableTemplating: false,
  fallbackTo404: false,
  default: isDefault,
  crudKey: 'id',
  callbacks,
});

const invalidRequest = (schemaName) => [{
  target: 'body', modifier: '', value: `schemas.${schemaName}`, invert: true, operator: 'valid_json_schema',
}];

// POST route: ERR when the request breaks the spec schema, otherwise `ok`.
function route(env, endpoint, documentation, schemaName, ok) {
  return {
    uuid: uuid(`${env}:${endpoint}`),
    type: 'http',
    documentation,
    method: 'post',
    endpoint,
    responses: [
      response(`${env}:${endpoint}:ok`, { ...ok, isDefault: true }),
      response(`${env}:${endpoint}:err`, {
        statusCode: 400,
        label: `Request not conforming to the ${schemaName} schema`,
        body: err(schemaName),
        rules: invalidRequest(schemaName),
      }),
    ],
    responseMode: null,
    streamingMode: null,
    streamingInterval: 0,
  };
}

const healthcheck = (env) => ({
  uuid: uuid(`${env}:healthcheck`),
  type: 'http',
  documentation: 'Liveness probe used by the test runner',
  method: 'get',
  endpoint: 'healthcheck',
  responses: [response(`${env}:healthcheck:ok`, { label: 'UP', body: '{ "status": "UP" }', isDefault: true })],
  responseMode: null,
  streamingMode: null,
  streamingInterval: 0,
});

const callback = (env, name, documentation, body) => ({
  uuid: uuid(`${env}:callback:${name}`),
  id: name,
  uri: "{{bodyRaw 'header.sender_uri'}}",
  name,
  documentation,
  method: 'post',
  headers: JSON_HEADERS,
  bodyType: 'INLINE',
  body,
  databucketID: '',
  filePath: '',
  sendFileAsBody: true,
});

const bucket = (env, name, documentation, value) => ({
  uuid: uuid(`${env}:bucket:${name}`),
  id: name,
  name,
  documentation,
  value: JSON.stringify(value, null, 2),
});

function environment({ key, name, port, routes, data, callbacks = [] }) {
  return {
    uuid: uuid(`env:${key}`),
    lastMigration: 33,
    name,
    endpointPrefix: '',
    latency: 0,
    port,
    hostname: '',
    folders: [],
    routes,
    rootChildren: routes.map((r) => ({ type: 'route', uuid: r.uuid })),
    proxyMode: false,
    proxyHost: '',
    proxyRemovePrefix: false,
    tlsOptions: { enabled: false, type: 'CERT', pfxPath: '', certPath: '', keyPath: '', caPath: '', passphrase: '' },
    cors: true,
    headers: JSON_HEADERS,
    proxyReqHeaders: [{ key: '', value: '' }],
    proxyResHeaders: [{ key: '', value: '' }],
    data,
    callbacks,
  };
}

// ---------------------------------------------------------------------------
// DR (registry) side
// ---------------------------------------------------------------------------
// Predicate, expression and graphql searches return the same records per record type.
const byQueryType = Object.fromEntries(
  Object.entries(predicateResults).flatMap(([type, records]) => ['predicate', 'expression', 'graphql']
    .map((queryType) => [`${type}|${queryType}`, records])),
);
const index = { ...recordsByIdentifier(), ...byQueryType };

// Spellings of each record type accepted in reg_record_type / response_entity.
const NAMESPACES = ['', 'spdci-extensions-dci:', 'spdci-extensions-dr:'];
const alias = Object.fromEntries(Object.entries({
  PWDPerson: ['PWDPerson', 'PWD_Person', 'DisabledPerson'],
  DRPerson: ['DRPerson', 'DR_Person', 'Person'],
  Member: ['Member'],
  Group: ['Group'],
}).flatMap(([type, names]) => names.flatMap((n) => NAMESPACES.map((ns) => [`${ns}${n}`, type]))));

const { support, details, status } = disabilityIndex();

const drSchemas = Object.fromEntries(
  ['search', 'subscribe', 'unsubscribe', 'txn-status', 'get-disability-support', 'get-disability-details', 'disabled']
    .map((k) => [k, schemas[k]]),
);

const drCallbacks = [
  callback('dr', 'on-search', 'Async search results sent to header.sender_uri', onSearchBody),
  callback('dr', 'on-subscribe', 'Subscription result sent to header.sender_uri',
    `{\n  "header": ${msgHeader('on-subscribe', 'message.subscribe_request')},\n  "message": ${subscribeMessage}\n}`),
  callback('dr', 'on-unsubscribe', 'Unsubscribe result sent to header.sender_uri',
    `{\n  "header": ${msgHeader('on-unsubscribe')},\n  "message": ${unsubscribeMessage}\n}`),
  callback('dr', 'txn-on-status', 'Transaction status sent to header.sender_uri',
    `{\n  "header": ${callbackHeader('txn-on-status')},\n  "message": ${txnStatusMessage}\n}`),
];
const fire = (name) => [{ uuid: uuid(`dr:callback:${name}`), latency: 300 }];

const disabledRoute = (endpoint, documentation) => route('dr', endpoint, documentation, 'disabled', {
  label: 'Disabled status (header action on-search + DisabledResponse)',
  body: disabledResponse,
});

const dr = environment({
  key: 'dr',
  name: 'DCI Disability Registry v1.0.0 - registry',
  port: 3003,
  routes: [
    route('dr', 'dr/sync/search', 'POST /registry/sync/search - search persons with disability, persons, members or groups and get results in the response', 'search', {
      label: 'Search results (header action on-search + SearchResponse)',
      body: `{\n  "header": ${callbackHeader('on-search', 'message.search_request')},\n  "message": ${searchMessage}\n}`,
    }),
    route('dr', 'dr/search', 'POST /registry/search - async search, results are sent to header.sender_uri (on-search)', 'search', {
      label: 'ACK, then on-search callback', body: ack(), callbacks: fire('on-search'),
    }),
    route('dr', 'dr/subscribe', 'POST /registry/subscribe - subscribe to DR events, result sent to header.sender_uri (on-subscribe)', 'subscribe', {
      label: 'ACK, then on-subscribe callback', body: ack(), callbacks: fire('on-subscribe'),
    }),
    route('dr', 'dr/unsubscribe', 'POST /registry/unsubscribe - cancel subscriptions, result sent to header.sender_uri (on-unsubscribe)', 'unsubscribe', {
      label: 'ACK, then on-unsubscribe callback', body: ack(), callbacks: fire('on-unsubscribe'),
    }),
    route('dr', 'dr/txn/status', 'POST /registry/txn/status - async transaction status, result sent to header.sender_uri (txn/on-status)', 'txn-status', {
      label: 'ACK, then txn/on-status callback', body: ack(), callbacks: fire('txn-on-status'),
    }),
    route('dr', 'dr/sync/get-disability-support', 'POST /registry/sync/get-disability-support - disability support of a person', 'get-disability-support', {
      label: 'Disability support (header action on-search + GetDisabilitySupportResponse)',
      body: disabilityResponse('support', 'No disability support is registered for this person'),
    }),
    route('dr', 'dr/sync/get-disability-details', 'POST /registry/sync/get-disability-details - disability details of a person', 'get-disability-details', {
      label: 'Disability details (header action on-search + GetDisabilityInfoResponse)',
      body: disabilityResponse('details', 'The person is not registered in the disability registry'),
    }),
    disabledRoute('dr/sync/disabled', 'POST /registry/sync/disabled - is the person registered as disabled (yes / no)'),
    disabledRoute('dr/sync/get-disability-status', 'POST /registry/sync/get-disability-status - summary name of /registry/sync/disabled'),
    healthcheck('dr'),
  ],
  data: [
    bucket('dr', 'index', 'DR records by "<record type>|<identifier_value>" and by "<record type>|<query_type>"', index),
    bucket('dr', 'alias', 'reg_record_type / response_entity spellings by record type', alias),
    bucket('dr', 'support', 'get-disability-support results by identifier value', support),
    bucket('dr', 'details', 'get-disability-details results by identifier value', details),
    bucket('dr', 'status', 'disabled status (yes / no) by identifier value', status),
    bucket('dr', 'schemas', 'DCI DR request schemas (generated from test/features/support/helpers/schemas.js)', drSchemas),
  ],
  callbacks: drCallbacks,
});

// ---------------------------------------------------------------------------
// SP side (callbacks a DR sends)
// ---------------------------------------------------------------------------
const spSchemas = Object.fromEntries(['on-search', 'on-subscribe', 'on-unsubscribe', 'txn-on-status', 'notify'].map((k) => [k, schemas[k]]));

const sp = environment({
  key: 'sp',
  name: 'DCI Disability Registry v1.0.0 - SP callbacks',
  port: 3004,
  routes: [
    route('sp', 'dr/on-search', 'POST /registry/on-search - receive async search results', 'on-search', { label: 'ACK', body: ack() }),
    route('sp', 'dr/on-subscribe', 'POST /registry/on-subscribe - receive subscription result', 'on-subscribe', { label: 'ACK', body: ack() }),
    route('sp', 'dr/on-unsubscribe', 'POST /registry/on-unsubscribe - receive unsubscribe result', 'on-unsubscribe', { label: 'ACK', body: ack() }),
    route('sp', 'dr/txn/on-status', 'POST /registry/txn/on-status - receive transaction status', 'txn-on-status', { label: 'ACK', body: ack() }),
    route('sp', 'dr/notify', 'POST /registry/notify - receive DR event notifications', 'notify', { label: 'ACK', body: ack() }),
    healthcheck('sp'),
  ],
  data: [bucket('sp', 'schemas', 'DCI DR callback schemas (generated from test/features/support/helpers/schemas.js)', spSchemas)],
});

// Keep the reference person reachable for the txn status template.
if (!index['PWDPerson|M500000003']?.includes(pwdPersons.full)) throw new Error('The index must resolve PWDPerson|M500000003 to the full person with disability');

writeFileSync(path.join(root, 'mockoon-dr.json'), `${JSON.stringify(dr, null, 2)}\n`);
writeFileSync(path.join(root, 'mockoon-sp.json'), `${JSON.stringify(sp, null, 2)}\n`);
console.log('Generated mockoon-dr.json and mockoon-sp.json');
