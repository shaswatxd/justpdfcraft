export function createZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const fileHeaders: Uint8Array[] = [];
  const fileDatas: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lhView = new DataView(localHeader.buffer);
    lhView.setUint32(0, 0x04034b50, true); // signature
    lhView.setUint16(4, 10, true); // version needed
    lhView.setUint16(6, 0, true); // flags
    lhView.setUint16(8, 0, true); // compression (0 = store)
    
    // MS-DOS time & date from current timestamp
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    lhView.setUint16(10, dosTime, true); // time
    lhView.setUint16(12, dosDate, true); // date
    
    const crc = crc32(data);
    lhView.setUint32(14, crc, true);
    lhView.setUint32(18, data.length, true); // compressed size
    lhView.setUint32(22, data.length, true); // uncompressed size
    lhView.setUint16(26, nameBytes.length, true); // name length
    lhView.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);

    fileHeaders.push(localHeader);
    fileDatas.push(data);

    // Central directory file header
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true); // signature
    cdView.setUint16(4, 10, true); // version made by
    cdView.setUint16(6, 10, true); // version needed
    cdView.setUint16(8, 0, true); // flags
    cdView.setUint16(10, 0, true); // compression
    cdView.setUint16(12, dosTime, true); // time
    cdView.setUint16(14, dosDate, true); // date
    cdView.setUint32(16, crc, true); // crc32
    cdView.setUint32(20, data.length, true); // compressed size
    cdView.setUint32(24, data.length, true); // uncompressed size
    cdView.setUint16(28, nameBytes.length, true); // name length
    cdView.setUint16(30, 0, true); // extra length
    cdView.setUint16(32, 0, true); // comment length
    cdView.setUint16(34, 0, true); // disk start
    cdView.setUint16(36, 0, true); // internal attrs
    cdView.setUint32(38, 0, true); // external attrs
    cdView.setUint32(42, offset, true); // offset
    cdHeader.set(nameBytes, 46);

    centralDirectory.push(cdHeader);

    offset += localHeader.length + data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDirectory) {
    cdSize += cd.length;
  }

  // End of central directory record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true); // disk number
  eocdView.setUint16(6, 0, true); // disk with cd
  eocdView.setUint16(8, files.length, true); // entries on disk
  eocdView.setUint16(10, files.length, true); // total entries
  eocdView.setUint32(12, cdSize, true); // cd size
  eocdView.setUint32(16, cdOffset, true); // cd offset
  eocdView.setUint16(20, 0, true); // comment length

  const totalSize = cdOffset + cdSize + eocd.length;
  const result = new Uint8Array(totalSize);

  let pos = 0;
  for (let i = 0; i < files.length; i++) {
    result.set(fileHeaders[i], pos);
    pos += fileHeaders[i].length;
    result.set(fileDatas[i], pos);
    pos += fileDatas[i].length;
  }
  for (const cd of centralDirectory) {
    result.set(cd, pos);
    pos += cd.length;
  }
  result.set(eocd, pos);

  return result;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
