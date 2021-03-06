import { IMerchantConfig, IMerchantApiEndpointConfig, IMerchantApiEndpointGroupConfig } from '@interfaces/IConfig';
import * as bsv from 'bsv';
import { MerchantapilogEventTypes } from '../merchantapilog';
import * as axios from 'axios';

/**
 * A policy interface for how to execute broadcasts against merchantapi endpoints
 */
// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestorPolicy {
  constructor(private merchantConfig: IMerchantApiEndpointGroupConfig, protected logger: any, protected responseSaver?: Function) {
  }

  execute(params: any): Promise<any> {
    throw new Error('Missing implementation');
  }

  logError(name, data) {
    if (this.logger) {
      this.logger.error(name, data);
    }
  }

  logInfo(name, data) {
    if (this.logger) {
      this.logger.info(name, data);
    }
  }
}

const serialMultiSender = async (url: string, httpVerb: 'post' | 'get', eventType: MerchantapilogEventTypes, endpoints: any[], payload?: any, responseSaver?: Function) => {
  return new Promise(async (resolve, reject) => {
    let responseReturnList = [];
    let validResponseWithSuccessPayload = null;
    let firstValidResponseWithAnyPayload = null;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < endpoints.length; i++) {
      try {
        let response = null;
        if (httpVerb === 'get') {
          response = await axios.default.get(`${endpoints[i].url}${url}`, {
            headers: {
            ...(endpoints[i].headers),
            'content-type': 'application/json',
            },
            maxContentLength: 52428890,
            maxBodyLength: 52428890
          });
        }
        if (httpVerb === 'post') {
          response = await axios.default.post(`${endpoints[i].url}${url}`, payload, {
            headers: {
              ...(endpoints[i].headers),
              'content-type': 'application/json',
              },
              maxContentLength: 52428890,
              maxBodyLength: 52428890
          });
        }
        if (responseSaver) {
          await responseSaver(endpoints[i].name, eventType, response.data);
        }
        if (typeof response.data.payload === 'string') {
          response.data.payload = JSON.parse(response.data.payload);
        }
        if (response && response.data && response.data.payload && response.data.payload.returnResult === 'success') {
          const toSave = {...(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
          validResponseWithSuccessPayload = toSave;
          if (!firstValidResponseWithAnyPayload) {
            firstValidResponseWithAnyPayload = toSave;
          }
          // Do not break, this ensures all endpoints are sent to
          // break;
        } else if (response && response.data && response.data.payload) {
          const toSave = {...(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
          if (!firstValidResponseWithAnyPayload) {
            firstValidResponseWithAnyPayload = toSave;
          }
        } else {
          const toSave = { error: JSON.stringify(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
        }
      } catch (err) {
        let code = err && err.response && err.response.status ? err.response.status : 500;
        if (responseSaver) {
          await responseSaver(endpoints[i].name, eventType, { error: err.toString(), stack: err.stack });
        }
        responseReturnList.push({error: err.toString(), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: code});
      }
    }

    const formattedResponse = {
      ...(validResponseWithSuccessPayload || firstValidResponseWithAnyPayload || responseReturnList[0]),
      mapiResponses: responseReturnList
    };
    if (validResponseWithSuccessPayload || firstValidResponseWithAnyPayload) {
      return resolve(formattedResponse);
    } else {
      return reject(formattedResponse);
    }
  });
};

const backupMultiSender = async (url: string, httpVerb: 'post' | 'get', eventType: MerchantapilogEventTypes, endpoints: any[], payload?: any, responseSaver?: Function) => {
  return new Promise(async (resolve, reject) => {
    let responseReturnList = [];
    let validResponseWithSuccessPayload = null;
    let validResponseWithAnyPayload = null;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < endpoints.length; i++) {
      try {
        let response = null;
        if (httpVerb === 'get') {
          response = await axios.default.get(`${endpoints[i].url}${url}`, {
            headers: {
              ...(endpoints[i].headers),
              'content-type': 'application/json',
              },
              maxContentLength: 52428890,
              maxBodyLength: 52428890
          });
        }
        if (httpVerb === 'post') {
          response = await axios.default.post(`${endpoints[i].url}${url}`, payload, {
            headers: {
              ...(endpoints[i].headers),
              'content-type': 'application/json',
              },
              maxContentLength: 52428890,
              maxBodyLength: 52428890
          });
        }
        if (responseSaver) {
          await responseSaver(endpoints[i].name, eventType, response.data);
        }
        if (typeof response.data.payload === 'string') {
          response.data.payload = JSON.parse(response.data.payload);
        }
        if (response && response.data && response.data.payload && response.data.payload.returnResult === 'success') {
          const toSave = {...(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
          validResponseWithSuccessPayload = toSave;
          break;
        } else if (response && response.data && response.data.payload) {
          const toSave = {...(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          validResponseWithAnyPayload = toSave;
          responseReturnList.push(toSave);
        } else {
          const toSave = { error: JSON.stringify(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
        }
      } catch (err) {
        let code = err && err.response && err.response.status ? err.response.status : 500;
        if (responseSaver) {
          await responseSaver(endpoints[i].name, eventType, { error: err.toString(), stack: err.stack });
        }
        responseReturnList.push({error: err.toString(), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: code});
      }
    }

    const formattedResponse = {
      ...(validResponseWithSuccessPayload || validResponseWithAnyPayload || responseReturnList[0]),
      mapiResponses: responseReturnList
    };
    if (validResponseWithSuccessPayload || validResponseWithAnyPayload) {
      return resolve(formattedResponse);
    } else {
      return reject(formattedResponse);
    }
  });
};

const backupMultiSenderFeeQuote = async (url: string, httpVerb: 'post' | 'get', eventType: MerchantapilogEventTypes, endpoints: any[], payload?: any, responseSaver?: Function) => {
  return new Promise(async (resolve, reject) => {
    let responseReturnList = [];
    let validResponseWithSuccessPayload = null;
    let validResponseWithAnyPayload = null;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < endpoints.length; i++) {
      try {
        let response = null;
        if (httpVerb === 'get') {
          response = await axios.default.get(`${endpoints[i].url}${url}`, {
            headers: {
              ...(endpoints[i].headers),
              'content-type': 'application/json',
              },
              maxContentLength: 52428890,
              maxBodyLength: 52428890
          });
        }
        if (httpVerb === 'post') {
          response = await axios.default.post(`${endpoints[i].url}${url}`, payload, {
            headers: {
              ...(endpoints[i].headers),
              'content-type': 'application/json',
              },
              maxContentLength: 52428890,
              maxBodyLength: 52428890
          });
        }
        if (responseSaver) {
          await responseSaver(endpoints[i].name, eventType, response.data);
        }
        if (typeof response.data.payload === 'string') {
          response.data.payload = JSON.parse(response.data.payload);
        }
        if (response && response.data && response.data.payload && response.data.payload.returnResult !== 'failure') {
          const toSave = {...(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
          validResponseWithSuccessPayload = toSave;
          break;
        } else if (response && response.data && response.data.payload) {
          const toSave = {...(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          validResponseWithAnyPayload = toSave;
          responseReturnList.push(toSave);
        } else {
          const toSave = { error: JSON.stringify(response.data), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: 200};
          responseReturnList.push(toSave);
        }
      } catch (err) {
        let code = err && err.response && err.response.status ? err.response.status : 500;
        if (responseSaver) {
          await responseSaver(endpoints[i].name, eventType, { error: err.toString(), stack: err.stack });
        }
        responseReturnList.push({error: err.toString(), mapiName: endpoints[i].name, mapiEndpoint: endpoints[i].url, mapiStatusCode: code});
      }
    }

    const formattedResponse = {
      ...(validResponseWithSuccessPayload || validResponseWithAnyPayload || responseReturnList[0]),
      mapiResponses: responseReturnList
    };
    if (validResponseWithSuccessPayload || validResponseWithAnyPayload) {
      return resolve(formattedResponse);
    } else {
      return reject(formattedResponse);
    }
  });
};

/**
 * Does a sequential loop over all merchantapi's until 1 is successful
 */
// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestorSendPolicySerialBackup extends MerchantRequestorPolicy {

  constructor(private network: string, private endpointConfigGroup: IMerchantApiEndpointGroupConfig, logger: any, responseSaver?: Function) {
    super(endpointConfigGroup, logger, responseSaver);
  }
  /**
   * Execute this policy for broadcasting
   * @param rawtx Tx to broadcast
   */
  execute(params: { txid: string, rawtx: string }): Promise<any> {
    return backupMultiSender(`/mapi/tx`, 'post', MerchantapilogEventTypes.PUSHTX, this.endpointConfigGroup[this.network], params, (miner, evt, res) => {
        return this.responseSaver(miner, evt, res, params.txid);
    });
  }
}

/**
 * Does a sequential loop over all merchantapi's until 1 is successful
 */
// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestorFeeQuotePolicySerialBackup extends MerchantRequestorPolicy {
  constructor(private network: string, private endpointConfigGroup: IMerchantApiEndpointGroupConfig, logger: any, responseSaver?: Function) {
    super(endpointConfigGroup, logger, responseSaver);
  }
  execute(params: any): Promise<any> {
    return backupMultiSenderFeeQuote('/mapi/feeQuote', 'get', MerchantapilogEventTypes.FEEQUOTE, this.endpointConfigGroup[this.network], (miner, evt, res) => {
      return this.responseSaver(miner, evt, res);
    });
  }
}

/**
 * Does a sequential loop over all merchantapi's until 1 is successful
 */
// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestorStatusPolicySerialBackup extends MerchantRequestorPolicy {
  constructor(private network: string, private endpointConfigGroup: IMerchantApiEndpointGroupConfig, logger: any, responseSaver?: Function) {
    super(endpointConfigGroup, logger, responseSaver);
  }

  /**
   * Execute this policy for broadcasting
   * @param rawtx Tx to broadcast
   */
  execute(params: {txid: string}): Promise<any> {
    return backupMultiSender(`/mapi/tx/${params.txid}`, 'get', MerchantapilogEventTypes.STATUSTX, this.endpointConfigGroup[this.network], (miner, evt, res) => {
      return this.responseSaver(miner, evt, res, params.txid);
    });
  }
}

/**
 * Sends API requests in parallel, logs them (if enabled) and then returns the authorative result by priority ordering
 *
 * From the client it will appear as this behaves like a single merchant-api (albet might return different miner id info)
 */
// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestorSendPolicySendAllTakeFirstPrioritySuccess extends MerchantRequestorPolicy {
  constructor(private network: string, private endpointConfigGroup: IMerchantApiEndpointGroupConfig, logger: any, responseSaver?: Function) {
    super(endpointConfigGroup, logger, responseSaver);
  }
  /**
   * Execute this policy for broadcasting
   * @param rawtx Tx to broadcast
   */
  execute(params: { txid: string, rawtx: string }): Promise<any> {
    return serialMultiSender(`/mapi/tx`, 'post', MerchantapilogEventTypes.PUSHTX, this.endpointConfigGroup[this.network], params, (miner, evt, res) => {
      return this.responseSaver(miner, evt, res, params.txid);
    });
  }
}
// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestorPolicyFactory {

  static getSendPolicy(network: string, config: IMerchantConfig, logger: any, responseSaver?: Function): MerchantRequestorPolicy {

    if (config.sendPolicy === 'ALL_FIRST_PRIORITY_SUCCESS') {
      return new MerchantRequestorSendPolicySendAllTakeFirstPrioritySuccess(network, config.endpoints, logger, responseSaver);
    }

    if (config.sendPolicy === undefined || config.sendPolicy === 'SERIAL_BACKUP') {
      // do nothing as it is the default
    }

    // Default
    return new MerchantRequestorSendPolicySerialBackup(network, config.endpoints, logger, responseSaver);
  }

  static getStatusPolicy(network: string, config: IMerchantConfig, logger: any, responseSaver?: Function): MerchantRequestorPolicy {
    // Only 1 policy supported now
    if (config.statusPolicy === undefined || config.statusPolicy === 'SERIAL_BACKUP') {
      // do nothing as it is the default
    }

    // Default
    return new MerchantRequestorStatusPolicySerialBackup(network, config.endpoints, logger, responseSaver);
  }

  static getFeeQuotePolicy(network: string, config: IMerchantConfig, logger: any, responseSaver?: Function): MerchantRequestorPolicy {
    // Only 1 policy supported now
    if (config.statusPolicy === undefined || config.statusPolicy === 'SERIAL_BACKUP') {
      // do nothing as it is the default
    }

    // Default
    return new MerchantRequestorFeeQuotePolicySerialBackup(network, config.endpoints, logger, responseSaver);
  }
}

// tslint:disable-next-line: max-classes-per-file
export class MerchantRequestor {
  private sendPolicy;
  private statusPolicy;
  private feeQuotePolicy;

  constructor(private network: string, private config: IMerchantConfig, private logger: any, private responseSaver: Function) {
    this.config.sendPolicy = this.config.sendPolicy || 'ALL_FIRST_PRIORITY_SUCCESS';
    this.config.statusPolicy = this.config.statusPolicy || 'SERIAL_BACKUP';
    this.sendPolicy = this.sendPolicy || MerchantRequestorPolicyFactory.getSendPolicy(network, this.config, this.logger, this.responseSaver);
    this.statusPolicy = this.statusPolicy || MerchantRequestorPolicyFactory.getStatusPolicy(network, this.config, this.logger, this.responseSaver);
    this.feeQuotePolicy = this.feeQuotePolicy || MerchantRequestorPolicyFactory.getFeeQuotePolicy(network, this.config, this.logger, this.responseSaver);
  }

  public async pushTx(rawtx: string): Promise<any> {
    const tx = new bsv.Transaction(rawtx);
    return new Promise(async (resolve, reject) => {
      this.sendPolicy.execute({txid: tx.hash, rawtx})
      .then((result) => {
        resolve(result);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  public async statusTx(txid: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.statusPolicy.execute({txid})
      .then((result) => {
        resolve(result);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  public async feeQuote(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.feeQuotePolicy.execute()
      .then((result) => {
        resolve(result);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

