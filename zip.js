import pako from 'pako';

function zip(data, to='string') {
  if(to === 'Buffer') {
    const deflated = pako.deflate(data, {to});
    if(typeof(deflated) === 'string') {
      const buf = Buffer.allocUnsafeSlow(Buffer.byteLength(deflated));
      buf.write(deflated);
      return buf;
    }
    return Buffer.from(deflated);
  }
  return pako.deflate(data, {to})
}

zip.extract = function(data, to='string') {
  if(to === 'Buffer') {
    const inflated = pako.inflate(data, {to});
    if(typeof(inflated) === 'string') {
      const buf = Buffer.allocUnsafeSlow(Buffer.byteLength(inflated));
      buf.write(inflated);
      return buf;
    }
    return Buffer.from(inflated);
  }
  return pako.inflate(data, {to});
};

zip.isZip = function(data) {
  if(typeof(data) === 'string' || Array.isArray(data) || (data instanceof Buffer)) {
    if(data.length < 2) {
      return false;
    }
    return data[0] === 0x78 && data[1] === 0x9c;
  }
  return false;
};

export default zip;
