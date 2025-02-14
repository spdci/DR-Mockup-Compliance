export const localhost = 'http://127.0.0.1:3333/';
export const defaultResponseTime = 15000;
export const defaultExpectedResponseTime = 15000;
export const acceptHeader = {
  key: 'Accept',
  value: 'application/json',
};
export const contentTypeHeader = {
  key: 'content-type',
  value: 'application/json; charset=utf-8',
};
export const searchEndpoint = 'dr/sync/search';
export const searchResponseSchema ={
  type: "object",
  properties: {
    message: {
      type: "object"
    }
  },
  required: ["message"]
};
export const subscribeEndpoint = 'dr/subscribe'
export const subscribeResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'object',
      required: ['ack_status', 'timestamp', 'error', 'correlation_id'],
      properties: {
        ack_status: { type: 'string' },
        timestamp: { type: 'string' },
        error: { type: 'object' },
        correlation_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};
export const unsubscribeEndpoint = 'dr/unsubscribe'
export const unsubscribeResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'object',
      properties: {
        ack_status: { type: 'string' },
        timestamp: { type: 'string' },
        error: { type: 'object' },
        correlation_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

// Define the schema for validation
export const regRecordsSchema = {
  "type": "object",
  "properties": {
    "personal_details": {
      "type": "object",
      "properties": {
        "identifier": { "type": "string" },
        "name": {
          "type": "object",
          "properties": {
            "first_name": { "type": "string" },
            "last_name": { "type": "string" }
          }
        },
        "date_of_birth": { "type": "string", "format": "date" },
        "gender": { "type": "string" }
      }
    },
    "disability_status": { "type": "string" },
    "disability_level": { "type": "string" },
    "disability_details": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "impairment_type": { "type": "string" },
          "impairment_level": { "type": "string" },
          "impairment_cause": { "type": "string" },
          "age_on_set": { "type": "string" }
        }
      }
    },
    "disability_support": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "human_assistance": {
            "type": "object",
            "properties": {
              "frequency": { "type": "string" },
              "type": { "type": "string" },
              "support_status": { "type": "string" }
            }
          }
        }
      }
    },
    "transport_requirement": { "type": "string" },
    "housing_type": { "type": "string" },
    "programs_enrollments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "programme_name": { "type": "string" },
          "programme_identifier": { "type": "string" }
        }
      }
    },
    "registration_date": { "type": "string", "format": "date-time" },
    "last_updated": { "type": "string", "format": "date-time" }
  }
}

export const asyncsearchEndpoint = 'dr/search';
export const asyncsearchResponseSchema = {
  type: "object",
  properties: {
    message: {
      type: "object",
      properties: {
        transaction_id: { type: "integer" },
        correlation_id: { type: "string" },
        search_response: {
          type: "array",
          items: {
            type: "object",
            properties: {
              reference_id: { type: "string" },
              timestamp: { type: "string" },
              status: { type: "string" },
              status_reason_code: { type: "string" },
              status_reason_message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  version: { type: "string" },
                  reg_type: { type: "string" },
                  reg_event_type: { type: "string" },
                  reg_record_type: { type: "string" },
                  reg_records: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        personal_details: {
                          type: "object",
                          properties: {
                            identifier: { type: "string" },
                            name: {
                              type: "object",
                              properties: {
                                first_name: { type: "string" },
                                last_name: { type: "string" }
                              }
                            },
                            date_of_birth: { type: "string" },
                            gender: { type: "string" }
                          }
                        },
                        disability_status: { type: "string" },
                        disability_level: { type: "string" },
                        disability_details: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              impairment_type: { type: "string" },
                              impairment_level: { type: "string" },
                              impairment_cause: { type: "string" },
                              age_on_set: { type: "string" }
                            }
                          }
                        },
                        disability_support: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              human_assistance: {
                                type: "object",
                                properties: {
                                  frequency: { type: "string" },
                                  type: { type: "string" },
                                  support_status: { type: "string" }
                                }
                              }
                            }
                          }
                        },
                        transport_requirement: { type: "string" },
                        housing_type: { type: "string" },
                        registration_date: { type: "string" },
                        last_updated: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        pagination: {
          type: "object",
          properties: {
            page_size: { type: "integer" },
            page_number: { type: "integer" },
            total_count: { type: "integer" }
          }
        },
        locale: { type: "string" }
      }
    }
  }
};

export const onsearchEndpoint= 'dr/on-search';
export const onsearchResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'object',
      properties: {
        ack_status: { type: 'string' },
        timestamp: { type: 'string' },
        error: { type: 'object' },
        correlation_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

export const onsubscribeEndpoint = 'dr/on-subscribe';
export const onsubscribeResponseSchema =  {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'object',
      required: ['ack_status', 'timestamp', 'error', 'correlation_id'],
      properties: {
        ack_status: { type: 'string' },
        timestamp: { type: 'string' },
        error: { type: 'object' },
        correlation_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

export const onunsubscribeEndpoint = 'dr/on-unsubscribe';
export const onunsubscribeResponseSchema =  {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'object',
      required: ['ack_status', 'timestamp', 'error', 'correlation_id'],
      properties: {
        ack_status: { type: 'string' },
        timestamp: { type: 'string' },
        error: { type: 'object' },
        correlation_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};



export const getdisabilitystatusEndpoint = "dr/sync/get-disability-status";
export const getdisabilitystatusResponseSchema = {
  "type": "object",
  "properties": {
    "message": {
      "type": "object",
      "properties": {
        "transaction_id": { "type": "integer" },
        "correlation_id": { "type": "string" },
        "disabled_response": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "reference_id": { "type": "string" },
              "timestamp": { "type": "string", "format": "date-time" },
              "status": { "type": "string" },
              "status_reason_message": { "type": "string" },
              "disabled_status": { "type": "string", "enum": ["yes", "no"] }
            }
          }
        }
      }
    }
  }
}


export const getdisabilitysupportEndpoint = "dr/sync/get-disability-support";
export const getdisabilitysupportResponseSchema =  {
  "type": "object",
  "properties": {
    "message": {
      "type": "object",
      "properties": {
        "transaction_id": { "type": "integer" },
        "correlation_id": { "type": "string" },
        "search_response": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "reference_id": { "type": "string" },
              "timestamp": { "type": "string", "format": "date-time" },
              "status": { "type": "string" },
              "status_reason_code": { "type": "string" },
              "status_reason_message": { "type": "string" },
              "data": {
                "type": "object",
                "properties": {
                  "version": { "type": "string" },
                  "reg_records": {
                    "type": "array",
                  }
                },
              },
            }
          }
        }
      }
    }
  }
};

export const getdisabilitydetailsEndpoint = "dr/sync/get-disability-details";
export const getdisabilitydetailsResponseSchema = {
  "type": "object",
  "properties": {
    "message": {
      "type": "object",
      "properties": {
        "transaction_id": { "type": "integer" },
        "correlation_id": { "type": "string" },
        "search_response": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "reference_id": { "type": "string" },
              "timestamp": { "type": "string", "format": "date-time" },
              "status": { "type": "string" },
              "status_reason_code": { "type": "string" },
              "status_reason_message": { "type": "string" },
              "data": {
                "type": "object",
                "properties": {
                  "version": { "type": "string" },
                  "reg_records": {
                    "type": "array",
                  }
                },
              },
            }
          }
        }
      }
    }
  }
};