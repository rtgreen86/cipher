import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import CipheredTextFile from './CipheredTextFile';

const key = readFileSync(join(__dirname, normalize('../data/key.txt')), 'utf-8');
const text = readFileSync(join(__dirname, normalize('../data/example.txt')), 'utf-8');

const asyncOp = async () => {
  const newFile = new CipheredTextFile(normalize('dist/encrypted.dat'), key);
  newFile.content = text;
  await newFile.save();

  const encryptedFile = await CipheredTextFile.load(normalize('dist/encrypted.dat'), key);
  console.log(encryptedFile.content);
}

asyncOp();
