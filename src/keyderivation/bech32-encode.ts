import BN from 'bn.js';
import { encode as bech32encode, decode as bech32decode } from 'bech32-buffer';
import { bytes, constants } from '../utils';

const prefixes: string[] = [];
prefixes[1] = 'rgeth';
prefixes[3] = 'rgtestropsten';
prefixes[5] = 'rgtestgoerli';
prefixes[56] = 'rgbsc';
prefixes[137] = 'rgpoly';

/**
 * Bech32 encodes address
 * @param pubkey - public key to encode
 * @param version - version
 * @param chainID - chainID to encode
 */
function encode(pubkey: bytes.BytesData, chainID: number | undefined = undefined) {
  // TODO: Remove reliance on bech32-buffer
  // TODO: Add bit for chain type (EVM, Solana, etc.)
  // Combine key and version byte
  const data = new Uint8Array(
    bytes.arrayify(bytes.combine([new BN(constants.VERSION), pubkey])),
  );

  // Prefix exists, encode and return with prefix
  if (chainID && prefixes[chainID]) return bech32encode(prefixes[chainID], data);

  // No chainID specified, throw error
  return bech32encode('rgany', data);
}

function decode(address: string) {
  // TODO: Remove reliance on bech32-buffer
  const decoded = bech32decode(address);

  // Hexlify data
  const data = bytes.hexlify(decoded.data);

  // Get version
  const version = bytes.numberify(data.slice(0, 2));

  // Throw if address version is not supported
  if (!version.eq(constants.VERSION)) throw new Error('Incorrect address version');

  // Get key
  const pubkey = data.slice(2);

  if (prefixes.includes(decoded.prefix)) {
    // If we know this prefix, then return with chainID
    return {
      chainID: prefixes.indexOf(decoded.prefix),
      pubkey,
    };
  }

  if (decoded.prefix === 'rgany') {
    // If this is the generic prefix, return undefined
    return {
      chainID: undefined,
      pubkey,
    };
  }

  // Don't know what this prefix is, throw
  throw new Error('Address prefix unrecognized');
}

export {
  encode,
  decode,
};
