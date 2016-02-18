import zip from './zip';
import {EventEmitter} from 'events';

const PACK_SIGN = 0xFF;

export default class SocketBuffer extends EventEmitter {

  constructor() {
    super();
    this._headBuffer = Buffer.allocUnsafeSlow(5);
    this._headBufferLen = 0;
    this._buffer = null;
    this._receivedLength = 0;
    this._unpackedLength = 0;
    this._closed = false;
  }

  get length() { return this._receivedLength; }
  get unpackedLength() { return this._unpackedLength; }

  receive(data) {
    if(this._closed) {
      this.emit('error', new Error('SocketBuffer is closed'));
      return;
    }
    if(!(data instanceof Buffer)) {
      this._closed = true;
      this.emit('error', new Error('Type of data should be `Buffer`'));
      return;
    }

    if(data.length === 0) {
      return;
    }
    try {

      if(this._buffer === null) {

        if(this._headBufferLen === 0 && data[0] !== PACK_SIGN) {
          this._closed = true;
          this.emit('error', new Error('Invalid data package'));
          return;
        }

        const remainHeadLen = 5 - this._headBufferLen;

        if (data.length < remainHeadLen){
          data.copy(this._headBuffer, this._headBufferLen, 0, data.length);
          this._headBufferLen+=data.length;
          return;
        }

        data.copy(this._headBuffer, this._headBufferLen, 0, remainHeadLen);
        this._headBufferLen += remainHeadLen;

        data = data.slice(remainHeadLen);
        this._buffer = Buffer.allocUnsafeSlow(this._headBuffer.readUInt32BE(1));
      }

      let remainByteLength = this._buffer.length - this._receivedLength - data.length;

      if(remainByteLength < -1 || (remainByteLength === -1 && data[data.length-1] !== PACK_SIGN)) {
        this._closed = true;
        this.emit('error', new Error('invalid data size'));
        return;
      }

      let validDataLength = remainByteLength===-1 ? data.length-1: data.length;

      data.copy(this._buffer, this._receivedLength, 0, validDataLength);

      this._receivedLength += validDataLength;

      if(this._receivedLength === this._buffer.length) {
        this._closed = true;

        this._unpackedLength = this._receivedLength;
        let unpacked = this._buffer;
        if(zip.isZip(unpacked)) {
          unpacked = zip.extract(unpacked);
          this._unpackedLength = unpacked.length;
        }

        unpacked = JSON.parse(unpacked);
        this.emit('data', unpacked);
      }
    } catch(e) {
      this.emit('error', e);
    }
  }

  static encode(data, {deflateLimit=false}={}) {
    let body = JSON.stringify(data);

    if(deflateLimit!==false && body.length >= deflateLimit) {
      body = zip(body, 'Buffer');
    } else {
      const buf = Buffer.allocUnsafeSlow(Buffer.byteLength(body));
      buf.write(body);
      body = buf;
    }

    const dataPack = Buffer.allocUnsafeSlow(5 + body.length + 1);
    dataPack[0] = PACK_SIGN;
    dataPack[dataPack.length - 1] = PACK_SIGN;
    dataPack.writeUInt32BE(body.length, 1);
    body.copy(dataPack, 5);
    return dataPack;

  }
}