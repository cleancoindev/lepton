import BN from 'bn.js';

const SNARK_PRIME: BN = new BN(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
  10,
);

const VERSION: BN = new BN('1', 10);

export {
  SNARK_PRIME,
  VERSION,
};
