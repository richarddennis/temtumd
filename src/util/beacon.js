"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const int64_buffer_1 = require("int64-buffer");
const moment = require("moment");
const request = require("request");
const logger_1 = require("./logger");
/**
 * Must have trailing slash
 * @type {string}
 */
const BEACON_API_URI_BASE = 'https://beacon.nist.gov/beacon/2.0/';
const certs = {};
let currentBeaconData = {};
let isBeaconDataRequested = false;
/**
 * Send response to server
 * @param {string} beaconPath
 * @param {boolean} isPulse
 * @returns {Promise<any>}
 */
const getBeacon = (beaconPath, isPulse = true) => {
    const options = {
        method: 'GET',
        uri: BEACON_API_URI_BASE + beaconPath,
        gzip: true
    };
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
            }
            else {
                if (isPulse) {
                    const parsedBody = JSON.parse(body);
                    /*validateSignature(parsedBody.pulse).then((result) => {
                      if (result) {
                        resolve(parsedBody);
                      } else {
                        reject('Failed to verify beacon signature');
                      }
                    });*/
                    resolve(parsedBody);
                }
                else {
                    resolve(body);
                }
            }
        });
    });
};
/**
 * Reverse buffer value
 * @param src
 * @returns {Buffer}
 */
const reverse = (src) => {
    const buffer = new Buffer(src.length);
    for (let i = 0, j = src.length - 1; i <= j; ++i, --j) {
        buffer[i] = src[j];
        buffer[j] = src[i];
    }
    return buffer;
};
/**
 * Return a valid epoch timestamp for the current
 * @returns {number} - time in seconds
 */
const currentTimestampInSeconds = () => {
    const d = new Date();
    return Math.round(d.getTime() / 1000);
};
exports.currentTimestampInSeconds = currentTimestampInSeconds;
/**
 * Check timestamp function
 * @param {number} timestamp
 * @returns {boolean}
 */
const isValidTimestamp = (timestamp) => {
    return !(timestamp < 1 || timestamp > currentTimestampInSeconds());
};
/**
 * Given a number of minutes, return a valid
 * @param {number} min
 * @returns {number}
 */
const timestampInSecondsMinutesAgo = (min) => {
    const currTime = new Date().getTime();
    const minInMs = min * 60000;
    const oldTime = new Date(currTime - minInMs);
    return Math.round(oldTime.getTime() / 1000);
};
exports.timestampInSecondsMinutesAgo = timestampInSecondsMinutesAgo;
/**
 * @param timestamp
 */
const current = (timestamp) => {
    if (!isValidTimestamp(timestamp)) {
        return 'Invalid timestamp';
    }
    return getBeacon(`pulse/time/${timestamp}`);
};
exports.current = current;
/**
 * @param timestamp
 * @returns {Promise}
 */
const previous = (timestamp) => {
    if (!isValidTimestamp(timestamp)) {
        return 'Invalid timestamp';
    }
    return getBeacon(`pulse/time/previous/${timestamp}`);
};
exports.previous = previous;
/**
 * @param timestamp
 * @returns {Promise}
 */
const next = (timestamp) => {
    if (!isValidTimestamp(timestamp)) {
        return 'Invalid timestamp';
    }
    return getBeacon(`pulse/time/next/${timestamp}`);
};
exports.next = next;
/**
 * @returns {Promise}
 */
const last = () => {
    return getBeacon('pulse/last');
};
exports.last = last;
const getByIndex = (index) => {
    return getBeacon(`chain/1/pulse/${index}`);
};
exports.getByIndex = getByIndex;
const getCertificateById = (certificateId) => {
    return new Promise((resolve, reject) => {
        getBeacon(`certificate/${certificateId}`, false)
            .then((result) => {
            if (/-----BEGIN CERTIFICATE-----./i.test(result)) {
                result = `${result.slice(0, 27)}\r\n${result.slice(27)}`;
            }
            resolve(result);
        })
            .catch((err) => reject(err));
    });
};
const validateCert = (cert, pulse, certVerifier, signatureValue, signatureInput, hash512) => {
    if (cert) {
        certs[pulse.certificateId] = cert;
        cert = certs[pulse.certificateId];
    }
    if (!certVerifier.verify(cert, signatureValue)) {
        return false;
    }
    const outputValueSource = Buffer.concat([signatureInput, signatureValue]);
    hash512 = crypto.createHash('sha512');
    const expectedOutputValue = hash512.update(outputValueSource).digest('hex');
    return pulse.outputValue.toLowerCase() === expectedOutputValue;
};
const validateSignature = (pulse) => {
    return new Promise((resolve, reject) => {
        // strlen(uri);
        const uriLength = Buffer.alloc(4);
        uriLength.writeInt32BE(pulse.uri.length, 0);
        // uri as a UTF-8 sequence of characters;
        const uri = Buffer.from(pulse.uri, 'utf8');
        // strlen(version);
        const versionLength = Buffer.alloc(4);
        versionLength.writeInt32BE(pulse.version.length, 0);
        // version as a UTF-8 sequence of characters;
        const version = Buffer.from(pulse.version, 'utf8');
        // cipherSuite as a 4-byte big-endian integer value;
        const cipherSuite = Buffer.alloc(4);
        cipherSuite.writeInt32BE(pulse.cipherSuite, 0);
        // period as a 4-byte big-endian integer value;
        const period = Buffer.alloc(4);
        period.writeInt32BE(pulse.period, 0);
        // length(certificateId);
        // certificateId as a hex-decoded sequence of bytes;
        const certificateId = Buffer.from(pulse.certificateId, 'hex');
        const certificateIdLength = Buffer.alloc(4);
        certificateIdLength.writeInt32BE(certificateId.length, 0);
        // chainIndex as an 8-byte big-endian integer value;
        const chainIndex = new int64_buffer_1.Int64BE(pulse.chainIndex).toBuffer();
        // pulseIndex as an 8-byte big-endian integer value;
        const pulseIndex = new int64_buffer_1.Int64BE(pulse.pulseIndex).toBuffer();
        // strlen(timestamp);
        const timestampLength = Buffer.alloc(4);
        timestampLength.writeInt32BE(pulse.timeStamp.length, 0);
        // timestamp as a UTF-8 sequence of characters;
        const timestamp = Buffer.from(pulse.timeStamp, 'utf8');
        // length(localRandomValue);
        // localRandomValue as a hex-decoded sequence of bytes;
        const localRandomValue = Buffer.from(pulse.localRandomValue, 'hex');
        const localRandomValueLength = Buffer.alloc(4);
        localRandomValueLength.writeInt32BE(localRandomValue.length, 0);
        // length(external/sourceId);
        // external/sourceId as a hex-decoded sequence of bytes;
        const externalSourceId = Buffer.from(pulse.external.sourceId, 'hex');
        const externalSourceIdLength = Buffer.alloc(4);
        externalSourceIdLength.writeInt32BE(externalSourceId.length, 0);
        // external/statusCode as a 4-byte big-endian integer value;
        const externalStatusCode = Buffer.alloc(4);
        externalStatusCode.writeInt32BE(pulse.external.statusCode, 0);
        // length(external/value);
        // external/value as a hex-decoded sequence of bytes;
        const externalValue = Buffer.from(pulse.external.value, 'hex');
        const externalValueLength = Buffer.alloc(4);
        externalValueLength.writeInt32BE(externalValue.length, 0);
        // length(listValue[x]);
        // listValue[x] as a hex-decoded sequence of bytes;
        const listValuesBuffers = [];
        for (const item of pulse.listValues) {
            const listValue = Buffer.from(item.value, 'hex');
            const listValueLength = Buffer.alloc(4);
            listValueLength.writeInt32BE(listValue.length, 0);
            listValuesBuffers.push(listValueLength, listValue);
        }
        const listValues = Buffer.concat(listValuesBuffers);
        // length(precommitmentValue);
        // precommitmentValue as a hex-decoded sequence of bytes;
        const precommitmentValue = Buffer.from(pulse.precommitmentValue, 'hex');
        const precommitmentValueLength = Buffer.alloc(4);
        precommitmentValueLength.writeInt32BE(precommitmentValue.length, 0);
        // statusCode as a 4-byte big-endian integer value.
        const statusCode = Buffer.alloc(4);
        statusCode.writeInt32BE(pulse.statusCode, 0);
        const signatureInput = Buffer.concat([
            uriLength,
            uri,
            versionLength,
            version,
            cipherSuite,
            period,
            certificateIdLength,
            certificateId,
            chainIndex,
            pulseIndex,
            timestampLength,
            timestamp,
            localRandomValueLength,
            localRandomValue,
            externalSourceIdLength,
            externalSourceId,
            externalStatusCode,
            externalValueLength,
            externalValue,
            listValues,
            precommitmentValueLength,
            precommitmentValue,
            statusCode
        ]);
        const hash512 = crypto.createHash('sha512');
        const signatureValue = Buffer.from(pulse.signatureValue, 'hex');
        const certVerifier = crypto.createVerify('RSA-SHA512');
        certVerifier.update(signatureInput);
        const cert = certs[pulse.certificateId];
        // if that cert if undefined, retreive from NIST and cache
        if (!cert) {
            getCertificateById(pulse.certificateId)
                .then((newCert) => {
                resolve(validateCert(newCert, pulse, certVerifier, signatureValue, signatureInput, hash512));
            })
                .catch((err) => {
                reject(err);
            });
        }
        else {
            resolve(validateCert(cert, pulse, certVerifier, signatureValue, signatureInput, hash512));
        }
    });
};
const updateBeacon = () => __awaiter(this, void 0, void 0, function* () {
    isBeaconDataRequested = true;
    try {
        currentBeaconData = yield last();
    }
    catch (error) {
        logger_1.default.error(`Failed to retrieve beacon data: ${error.message} ${error.stack}`);
    }
    isBeaconDataRequested = false;
    const currentTime = moment();
    const nextMinute = moment()
        .add(1, 'minute')
        .startOf('minute');
    setTimeout(() => {
        updateBeacon();
    }, nextMinute - currentTime);
});
const getCurrentBeaconData = () => {
    return currentBeaconData;
};
exports.getCurrentBeaconData = getCurrentBeaconData;
updateBeacon();
//# sourceMappingURL=beacon.js.map