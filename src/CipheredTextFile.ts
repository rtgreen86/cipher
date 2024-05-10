import { Buffer } from 'node:buffer';
import { ALGORITHM, IV_SIZE, KEY_SIZE } from './const';
import { createReadStream, createWriteStream } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { pipeline, finished } from 'node:stream/promises';
import { Readable } from 'node:stream';

export default class CipheredTextFile {
  path: string;

  content = '';

  private readonly hexKey: string;

  constructor(path: string, hexKey: string) {
    this.path = path;
    this.hexKey = hexKey;
  }

  async load() {
    this.content = await load(this.path, this.hexKey);
    return this;
  }

  async save() {
    await save(this.path, this.hexKey, this.content);
    return this;
  }

  static load(path: string, key: string) {
    return new CipheredTextFile(path, key).load();
  }
}

const save = (filepath: string, hexKey: string, content: string) => {
  const stream = createWriteStream(filepath);
  const iv = randomBytes(IV_SIZE);
  const bufferWithKey = Buffer.alloc(KEY_SIZE, hexKey, 'hex');
  const cipher = createCipheriv(ALGORITHM, bufferWithKey, iv);
  pipeline(cipher, stream);
  stream.write(iv);
  cipher.write(content);
  cipher.end();
  return finished(cipher);
};

const load = async (filepath: string, hexKey: string) => {
  const stream = createReadStream(filepath);
  const key = Buffer.alloc(KEY_SIZE, hexKey, 'hex');
  const iv = await readBytes(stream, IV_SIZE);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  stream.pipe(decipher);
  return readAllText(decipher);
};

const readBytes = (stream: Readable, byteSize: number) => new Promise<Buffer>((resolve, reject) => {
  let buffer: Buffer;

  const unsubscribe = () => {
    stream.off('readable', handleReadable);
    stream.off('end', handleEnd);
    stream.off('error', handleError);
  }

  const handleReadable = () => {
    buffer = stream.read(byteSize);
    if (!buffer) {
      stream.once('readable', handleReadable);
      return;
    }
    handleEnd();
  };

  const handleError = (error: Error) => {
    unsubscribe();
    reject(error);
  };

  const handleEnd = () => {
    unsubscribe();
    resolve(buffer);
  };

  stream.once('error', handleError);
  stream.once('end', handleEnd);
  handleReadable();
});

const readAllText = (stream: Readable) => new Promise<string>((resolve, reject) => {
  let chunks: string[] = [];

  const unsubscribe = () => {
    stream.off('readable', handleReadable);
    stream.off('error', handleError);
    stream.off('end', handleEnd);
  };

  const handleReadable = () => {
    let chunk;
    while (null !== (chunk = stream.read())) {
      chunks.push(chunk);
    }
  }

  const handleError = (error: Error) => {
    unsubscribe();
    reject(error);
  };

  const handleEnd = () => {
    unsubscribe();
    resolve(chunks.join(''));
  }

  stream.on('readable', handleReadable);
  stream.once('error', handleError);
  stream.once('end', handleEnd);
  handleReadable();
});
