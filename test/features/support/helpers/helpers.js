// Runtime configuration of the compliance suite.
// Point DR_BASE_URL at the Disability Registry implementation under test (registry-side
// endpoints) and SP_BASE_URL at the SP implementation receiving callbacks (on-search, notify, ...).
// Both default to the bundled Mockoon mocks.

const withSlash = (url) => (url.endsWith('/') ? url : `${url}/`);

export const drBaseUrl = withSlash(process.env.DR_BASE_URL || 'http://127.0.0.1:3333/');
export const spBaseUrl = withSlash(process.env.SP_BASE_URL || 'http://127.0.0.1:3334/');

// Local listener used as header.sender_uri for async flows, so the callbacks the
// DR sends (on-search, on-subscribe, ...) can be captured and validated.
export const callbackPort = Number(process.env.CALLBACK_PORT || 3335);
export const callbackBaseUrl = withSlash(
  process.env.CALLBACK_BASE_URL || `http://127.0.0.1:${callbackPort}/`,
);

export const defaultResponseTime = Number(process.env.RESPONSE_TIMEOUT_MS || 15000);
export const defaultExpectedResponseTime = defaultResponseTime;
export const callbackTimeout = Number(process.env.CALLBACK_TIMEOUT_MS || 10000);

// Optional bearer token (spec security scheme: Authorization: Bearer <jwt>).
export const authToken = process.env.AUTH_TOKEN || '';

export const senderId = process.env.SENDER_ID || 'spmis.example.org';
export const receiverId = process.env.RECEIVER_ID || 'dr.example.org';

export const acceptHeader = {
  key: 'Accept',
  value: 'application/json',
};
export const contentTypeHeader = {
  key: 'content-type',
  value: 'application/json; charset=utf-8',
};

// Every endpoint of the DCI Disability Registry v1.0.0 API.
//  side          : which system exposes it (dr = disability registry, sp = SP-MIS / subscriber)
//  requestSchema : envelope schema the request must conform to
//  responseSchema: schema of the synchronous HTTP response
//  callback      : for async endpoints, the callback the DR must send to header.sender_uri
export const endpoints = {
  'search': {
    side: 'dr', path: 'dr/search', action: 'search',
    requestSchema: 'search', responseSchema: 'ack',
    callback: { path: 'dr/on-search', action: 'on-search', schema: 'on-search' },
  },
  'sync search': {
    side: 'dr', path: 'dr/sync/search', action: 'search',
    requestSchema: 'search', responseSchema: 'sync-search-response',
  },
  'subscribe': {
    side: 'dr', path: 'dr/subscribe', action: 'subscribe',
    requestSchema: 'subscribe', responseSchema: 'ack',
    callback: { path: 'dr/on-subscribe', action: 'on-subscribe', schema: 'on-subscribe' },
  },
  'unsubscribe': {
    side: 'dr', path: 'dr/unsubscribe', action: 'unsubscribe',
    requestSchema: 'unsubscribe', responseSchema: 'ack',
    callback: { path: 'dr/on-unsubscribe', action: 'on-unsubscribe', schema: 'on-unsubscribe' },
  },
  'txn status': {
    side: 'dr', path: 'dr/txn/status', action: 'txn-status',
    requestSchema: 'txn-status', responseSchema: 'ack',
    callback: { path: 'dr/txn/on-status', action: 'txn-on-status', schema: 'txn-on-status' },
  },
  'get disability support': {
    side: 'dr', path: 'dr/sync/get-disability-support', action: 'search',
    requestSchema: 'get-disability-support', responseSchema: 'get-disability-support-response',
  },
  'get disability details': {
    side: 'dr', path: 'dr/sync/get-disability-details', action: 'search',
    requestSchema: 'get-disability-details', responseSchema: 'get-disability-details-response',
  },
  // POST /registry/sync/disabled (summary: /registry/sync/get-disability-status).
  'disabled': {
    side: 'dr', path: 'dr/sync/disabled', action: 'search',
    requestSchema: 'disabled', responseSchema: 'disabled-response',
  },
  // Same operation under the name of its summary, as served by earlier versions of the mock.
  'get disability status': {
    side: 'dr', path: 'dr/sync/get-disability-status', action: 'search',
    requestSchema: 'disabled', responseSchema: 'disabled-response',
  },
  'on-search': {
    side: 'sp', path: 'dr/on-search', action: 'on-search',
    requestSchema: 'on-search', responseSchema: 'ack',
  },
  'on-subscribe': {
    side: 'sp', path: 'dr/on-subscribe', action: 'on-subscribe',
    requestSchema: 'on-subscribe', responseSchema: 'ack',
  },
  'on-unsubscribe': {
    side: 'sp', path: 'dr/on-unsubscribe', action: 'on-unsubscribe',
    requestSchema: 'on-unsubscribe', responseSchema: 'ack',
  },
  'txn on-status': {
    side: 'sp', path: 'dr/txn/on-status', action: 'txn-on-status',
    requestSchema: 'txn-on-status', responseSchema: 'ack',
  },
  'notify': {
    side: 'sp', path: 'dr/notify', action: 'notify',
    requestSchema: 'notify', responseSchema: 'ack',
  },
};

export const endpointUrl = (name) => {
  const endpoint = endpoints[name];
  if (!endpoint) throw new Error(`Unknown endpoint "${name}". Known: ${Object.keys(endpoints).join(', ')}`);
  return (endpoint.side === 'dr' ? drBaseUrl : spBaseUrl) + endpoint.path;
};

// Kept for backwards compatibility with the previous helper exports.
export const localhost = drBaseUrl;
export const searchEndpoint = endpoints['sync search'].path;
export const asyncsearchEndpoint = endpoints.search.path;
export const subscribeEndpoint = endpoints.subscribe.path;
export const unsubscribeEndpoint = endpoints.unsubscribe.path;
export const txnstatusEndpoint = endpoints['txn status'].path;
export const getdisabilitysupportEndpoint = endpoints['get disability support'].path;
export const getdisabilitydetailsEndpoint = endpoints['get disability details'].path;
export const getdisabilitystatusEndpoint = endpoints['get disability status'].path;
export const disabledEndpoint = endpoints.disabled.path;
export const onsearchEndpoint = endpoints['on-search'].path;
export const onsubscribeEndpoint = endpoints['on-subscribe'].path;
export const onunsubscribeEndpoint = endpoints['on-unsubscribe'].path;
export const ontxnstatusEndpoint = endpoints['txn on-status'].path;
export const notifyEndpoint = endpoints.notify.path;
