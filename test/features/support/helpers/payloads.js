// Builders for spec-compliant DCI DR requests ({ signature, header, message }).

import { randomUUID } from 'node:crypto';
import { senderId, receiverId } from './helpers.js';
import { testData, testRecord } from './testdata.js';

const nowTs = () => new Date().toISOString();
const shortId = (prefix) => `${prefix}${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

export const newTransactionId = () => shortId('TXN');
export const newReferenceId = () => shortId('REF');

export function msgHeader(action, { totalCount = 1, senderUri } = {}) {
  return {
    version: '1.0.0',
    message_id: randomUUID(),
    message_ts: nowTs(),
    action,
    sender_id: senderId,
    ...(senderUri ? { sender_uri: senderUri } : {}),
    receiver_id: receiverId,
    total_count: totalCount,
    is_msg_encrypted: false,
  };
}

export function callbackHeader(action, { status = 'succ', totalCount = 1, completedCount = totalCount } = {}) {
  return {
    version: '1.0.0',
    message_id: randomUUID(),
    message_ts: nowTs(),
    action,
    status,
    total_count: totalCount,
    completed_count: completedCount,
    sender_id: receiverId,
    receiver_id: senderId,
    is_msg_encrypted: false,
  };
}

export const envelope = (header, message) => ({ header, message });

// ----- queries -----
export function idTypeValueQuery(recordType, name) {
  const { identifier_type, identifier_value } = testRecord(recordType, name);
  return { query_type: 'idtype-value', query: { type: identifier_type, value: identifier_value } };
}

export function predicateQuery(conditions) {
  // conditions: [{ attribute_name, operator, attribute_value }, ...] joined with "and"
  const query = [];
  for (let i = 0; i < conditions.length; i += 2) {
    const item = { seq_num: i / 2 + 1, expression1: conditions[i] };
    if (conditions[i + 1]) Object.assign(item, { condition: 'and', expression2: conditions[i + 1] });
    query.push(item);
  }
  return { query_type: 'predicate', query };
}

// Expression queries of the DR process flows (ExpTemplate: NoSQL-style expression).
export const expressionQueries = {
  // Process flow 1: individuals with a specific disability criteria.
  'PWDPerson who are approved with a mobility impairment': {
    collection: 'PWDPerson',
    query: { $and: [{ disability_status: { $eq: 'Approved' } }, { 'disability_details.impairment_type': { $eq: 'Mobility' } }] },
  },
  'DRPerson born before 1966': {
    collection: 'DRPerson', query: { $and: [{ birth_date: { $lt: '1966-01-01' } }] },
  },
  'Member who are disabled': {
    collection: 'Member', query: { $and: [{ is_disabled: { $eq: true } }] },
  },
  'Group with poverty_score below 5': {
    collection: 'Group', query: { $and: [{ poverty_score: { $lt: 5 } }] },
  },
};

export function expressionQuery(name) {
  const expression = expressionQueries[name];
  if (!expression) throw new Error(`Unknown expression "${name}". Known: ${Object.keys(expressionQueries).join(', ')}`);
  return { query_type: 'expression', query: { type: 'ns:org:QueryType:expression', value: { expression } } };
}

export const graphqlQuery = (recordType) => ({
  query_type: 'graphql',
  query: {
    type: 'ns:org:QueryType:graphql',
    value: { expression: `query { ${recordType}(where: { disability_status: { eq: "Approved" } }) { personal_details { member_identifier } disability_status disability_details { impairment_type } } }` },
  },
});

export const consent = (type) => ({
  '@context': `https://schema.spdci.org/common/v1/api-schemas/${type}.jsonld`,
  '@type': type,
  ts: nowTs(),
  purpose: { text: 'Disability benefit eligibility', code: 'SP-ELIG', ref_uri: 'https://example.org/consent-codes' },
});

// Search criteria for a record type (reg_record_type; omitted for an untyped search).
export function searchItem(recordType, criteria, { locale } = {}) {
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    search_criteria: {
      version: '1.0.0',
      reg_type: testData.regType,
      ...(recordType ? { reg_record_type: recordType } : {}),
      ...criteria,
    },
    ...(locale ? { locale } : {}),
  };
}

export const searchMessage = (items) => ({ transaction_id: newTransactionId(), search_request: items });

// ----- disability endpoints (get-disability-support, get-disability-details, disabled) -----
// disabled_criteria forms: the spec example ({ "member.member_identifier": { "eq": ... } }), the
// process flow 2 form ({ "personal_details.member_identifier": { "eq": ... } }) and idtype-value.
export function disabledCriteria(identifier, form = 'personal details') {
  const { identifier_type, identifier_value } = identifier;
  const forms = {
    'personal details': { query_type: 'expression', query: { 'personal_details.member_identifier': { eq: identifier_value } } },
    'member': { query_type: 'expression', query: { 'member.member_identifier': { eq: identifier_value } } },
    'idtype-value': { query_type: 'idtype-value', query: { type: identifier_type, value: identifier_value } },
  };
  if (!forms[form]) throw new Error(`Unknown disabled_criteria form "${form}". Known: ${Object.keys(forms).join(', ')}`);
  return forms[form];
}

export const disabledMessage = (identifier, form) => ({
  transaction_id: newTransactionId(),
  disabled_criteria: disabledCriteria(identifier, form),
});

// ----- subscriptions -----
export function subscribeItem(eventType, recordType = 'PWDPerson', filterType = 'idtype-value') {
  const filter = {
    'idtype-value': () => idTypeValueQuery(recordType, 'full'),
    'predicate': () => predicateQuery([{ attribute_name: 'disability_status', operator: 'eq', attribute_value: 'Approved' }]),
    'expression': () => expressionQuery('PWDPerson who are approved with a mobility impairment'),
    'graphql': () => graphqlQuery(recordType),
  }[filterType]();
  const start = new Date();
  const end = new Date(start.getTime() + 365 * 24 * 3600 * 1000);
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    subscribe_criteria: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_event_type: eventType,
      frequency: { start_time: start.toISOString(), end_time: end.toISOString(), frequency: '0 0 0 5,15 * ? *' },
      filter_type: filter.query_type,
      filter: filter.query,
      notify_record_type: recordType,
      authorize: consent('Authorize'),
    },
    locale: 'eng',
  };
}

export const subscribeMessage = (items) => ({ transaction_id: newTransactionId(), subscribe_request: items });

export const unsubscribeMessage = (codes) => ({ transaction_id: newTransactionId(), timestamp: nowTs(), subscription_codes: codes });

// ----- transaction status -----
export function txnStatusMessage(txnType, attributeType) {
  const attributeValue = {
    transaction_id: newTransactionId(),
    reference_id_list: [newReferenceId(), newReferenceId()],
    correlation_id: `CORR-${randomUUID().slice(0, 8)}`,
    subscription_code_list: ['SUB-0001', 'SUB-0002'],
  }[attributeType];
  return {
    transaction_id: newTransactionId(),
    txnstatus_request: {
      reference_id: newReferenceId(),
      txn_type: txnType,
      attribute_type: attributeType,
      attribute_value: attributeValue,
      locale: 'eng',
    },
  };
}

// ----- callback payloads (what a DR sends to an SP) -----
const correlationId = () => `DR-${randomUUID().slice(0, 8)}`;

export function searchResponseMessage(recordType, records, { status = 'succ', reasonCode, transactionId = newTransactionId() } = {}) {
  // reg_records is a list, or a single record as declared by the spec.
  const count = Array.isArray(records) ? records.length : 1;
  return {
    transaction_id: transactionId,
    correlation_id: correlationId(),
    search_response: [{
      reference_id: newReferenceId(),
      timestamp: nowTs(),
      status,
      ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Search could not be completed' } : {}),
      ...(status === 'rjct' ? {} : {
        data: {
          version: '1.0.0',
          reg_type: testData.regType,
          ...(recordType ? { reg_record_type: recordType } : {}),
          reg_records: records,
        },
        pagination: { page_size: Math.max(count, 1), page_number: 1, total_count: count },
      }),
      locale: 'eng',
    }],
  };
}

export function subscribeResponseMessage({ status = 'succ', reasonCode } = {}) {
  const item = subscribeItem('register');
  const { authorize, ...criteria } = item.subscribe_criteria;
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    subscribe_response: [{
      reference_id: item.reference_id,
      timestamp: nowTs(),
      status,
      ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Subscription refused' } : {}),
      ...(status === 'succ' ? {
        subscriptions: [{
          code: 'SUB-0001',
          status: 'subscribe',
          timestamp: nowTs(),
          ...criteria,
          locale: 'eng',
        }],
      } : {}),
      locale: 'eng',
    }],
  };
}

export function unsubscribeResponseMessage({ status = 'succ', reasonCode } = {}) {
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    timestamp: nowTs(),
    status,
    ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Unsubscribe refused' } : {}),
    subscription_status: [{ code: 'SUB-0001', status: 'unsubscribe' }],
  };
}

export function txnStatusResponseMessage(txnType, { recordType = 'PWDPerson', records = [] } = {}) {
  const txnStatus = {
    search: () => searchResponseMessage(recordType, records),
    subscribe: () => subscribeResponseMessage(),
    unsubscribe: () => unsubscribeResponseMessage(),
  }[txnType]();
  return {
    transaction_id: txnStatus.transaction_id,
    correlation_id: txnStatus.correlation_id || correlationId(),
    txnstatus_response: { txn_type: txnType, txn_status: txnStatus },
  };
}

export function notifyEvent(eventType, recordType, records) {
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    data: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_event_type: eventType,
      reg_record_type: recordType,
      reg_records: records,
    },
    locale: 'eng',
  };
}

export const notifyMessage = (events) => ({ transaction_id: newTransactionId(), notify_event: events });

export const encryptedMessage = () => ({
  header: { alg: 'RSA-OAEP-256', enc: 'A256GCM', kid: `${senderId}|key-1` },
  ciphertext: 'eyJ0cmFuc2FjdGlvbl9pZCI6IlRYTjEyMyJ9',
  encrypted_key: 'OKOawDo13gRp2ojaHV7LFpZcgV7T6DVZKTyKOMTYUmKoTCVJRgckCL9kiMT03JGeipsEdY3mx',
  tag: 'Mz-VPPyU4RlcuYv1IwIvzw',
  iv: '48V1_ALb6US04U3b',
});

// ----- path helpers ("message.search_request.0.locale") -----
const parsePath = (path) => path.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));

export function getPath(obj, path) {
  return parsePath(path).reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Every value reached by a path, looking into the items of the lists it crosses
// ("disability_details.impairment_type" → the impairment_type of every disability detail).
export function getPathValues(obj, path) {
  let current = [obj];
  for (const key of parsePath(path)) {
    current = current
      .flatMap((o) => (Array.isArray(o) && typeof key !== 'number' ? o : [o]))
      .map((o) => (o == null ? undefined : o[key]))
      .filter((v) => v !== undefined);
  }
  return current.flatMap((v) => (Array.isArray(v) ? v : [v]));
}

export function setPath(obj, path, value) {
  const keys = parsePath(path);
  let o = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = typeof keys[i + 1] === 'number' ? [] : {};
    o = o[k];
  });
  o[keys.at(-1)] = value;
}

export function deletePath(obj, path) {
  const keys = parsePath(path);
  const parent = getPath(obj, keys.slice(0, -1).join('.')) ?? (keys.length === 1 ? obj : undefined);
  if (parent && typeof parent === 'object') {
    if (Array.isArray(parent)) parent.splice(keys.at(-1), 1);
    else delete parent[keys.at(-1)];
  }
}

export const clone = (o) => structuredClone(o);
