import np from 'native-prover';
import {readFileSync} from 'fs';

const input = readFileSync('input.json').toString('utf8');
const res = np.native_prove(input);
console.log(res);
