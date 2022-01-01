import BN from 'bn.js';
// @ts-ignore-next-line
import { groth16 } from 'snarkjs';

import {
  bytes,
  hash,
  babyjubjub,
  constants,
} from '../utils';

const np = require('native-prover');

export type Artifacts = {
  zkey: ArrayLike<number>;
  wasm: ArrayLike<number>;
  vkey: object;
};

export type Circuits = 'erc20small' | 'erc20large';

export type Proof = {
  a: bytes.BytesData[];
  b: bytes.BytesData[][];
  c: bytes.BytesData[];
};

export type ERC20PrivateInputs = {
  type: 'erc20';
  adaptID: bytes.BytesData;
  tokenField: bytes.BytesData;
  depositAmount: bytes.BytesData;
  withdrawAmount: bytes.BytesData;
  outputTokenField: bytes.BytesData;
  outputEthAddress: bytes.BytesData;
  randomIn: bytes.BytesData[];
  valuesIn: bytes.BytesData[];
  spendingKeys: bytes.BytesData[];
  treeNumber: bytes.BytesData;
  merkleRoot: bytes.BytesData;
  nullifiers: bytes.BytesData[];
  pathElements: bytes.BytesData[][];
  pathIndices: bytes.BytesData[];
  recipientPK: bytes.BytesData[];
  randomOut: bytes.BytesData[];
  valuesOut: bytes.BytesData[];
  commitmentsOut: bytes.BytesData[];
  ciphertextHash: bytes.BytesData;
};

export type ERC20PublicInputs = {
  type: 'erc20';
  adaptID: bytes.BytesData;
  depositAmount: bytes.BytesData;
  withdrawAmount: bytes.BytesData;
  outputTokenField: bytes.BytesData;
  outputEthAddress: bytes.BytesData;
  treeNumber: bytes.BytesData;
  merkleRoot: bytes.BytesData;
  nullifiers: bytes.BytesData[];
  commitmentsOut: bytes.BytesData[];
  ciphertextHash: bytes.BytesData;
};

export type PrivateInputs = ERC20PrivateInputs; // | ERC721PrivateInputs
export type PublicInputs = ERC20PublicInputs; // | ERC721PublicInputs

export type FormattedCircuitInputs = {
  [key: string]: string | string[] | string[][];
}

// eslint-disable-next-line no-unused-vars
export type ArtifactsGetter = (circuit: Circuits) => Promise<Artifacts>;

class Prover {
  artifactsGetter: ArtifactsGetter;

  constructor(artifactsGetter: ArtifactsGetter) {
    this.artifactsGetter = artifactsGetter;
  }

  async verify(circuit: Circuits, inputs: PublicInputs, proof: Proof): Promise<boolean> {
    // Fetch artifacts
    const artifacts = await this.artifactsGetter(circuit);

    // Get inputs hash
    const hashOfInputs = Prover.hashInputs(inputs);

    // Format proof
    const proofFormatted = {
      pi_a: [bytes.numberify(proof.a[0]).toString(10), bytes.numberify(proof.a[1]).toString(10)],
      pi_b: [
        [bytes.numberify(proof.b[0][1]).toString(10), bytes.numberify(proof.b[0][0]).toString(10)],
        [bytes.numberify(proof.b[1][1]).toString(10), bytes.numberify(proof.b[1][0]).toString(10)],
      ],
      pi_c: [bytes.numberify(proof.c[0]).toString(10), bytes.numberify(proof.c[1]).toString(10)],
    };

    // Return output of groth16 verify
    return groth16.verify(artifacts.vkey, [hashOfInputs], proofFormatted);
  }

  async prove(
    circuit: Circuits,
    inputs: PrivateInputs,
  ): Promise<{proof: Proof, inputs: PublicInputs}> {
    // Fetch artifacts
    const artifacts = await this.artifactsGetter(circuit);

    // Get formatted inputs in decimal format for native calculator
    const formattedInputs = Prover.formatPrivateInputs(inputs, true);

    // Get public inputs
    const publicInputs = Prover.privateToPublicInputs(inputs);

    // Use native witness calculator
    const npInputs = JSON.stringify(formattedInputs);
    np.native_prove(npInputs, 'out.wtns');
    // Generate proof
    const { proof } = await groth16.prove(artifacts.zkey, 'out.wtns');
    // const { proof } = await groth16.fullProve(formattedInputs, artifacts.wasm, artifacts.zkey);

    // Format proof
    const proofFormatted = {
      a: [new BN(proof.pi_a[0]), new BN(proof.pi_a[1])],
      b: [
        [new BN(proof.pi_b[0][1]), new BN(proof.pi_b[0][0])],
        [new BN(proof.pi_b[1][1]), new BN(proof.pi_b[1][0])],
      ],
      c: [new BN(proof.pi_c[0]), new BN(proof.pi_c[1])],
    };

    // Throw if proof is invalid
    if (!(await this.verify(circuit, publicInputs, proofFormatted))) throw new Error('Proof generation failed');

    // Return proof with inputs
    return {
      proof: proofFormatted,
      inputs: publicInputs,
    };
  }

  static hashInputs(inputs: PublicInputs): string {
    // if (inputs.type === 'erc20') {
    // Inputs type is ERC20, hash as ERC20 inputs
    const preimage = bytes.combine([
      inputs.adaptID,
      inputs.depositAmount,
      inputs.withdrawAmount,
      inputs.outputTokenField,
      inputs.outputEthAddress,
      inputs.treeNumber,
      inputs.merkleRoot,
      ...inputs.nullifiers,
      ...inputs.commitmentsOut,
      inputs.ciphertextHash,
    ].map((el) => bytes.padToLength(el, 32)));

    return bytes.hexlify(
      bytes.numberify(
        hash.sha256(preimage),
      ).mod(constants.SNARK_PRIME),
    );
    // }
  }

  static privateToPublicInputs(inputs: PrivateInputs): PublicInputs {
    // if (inputs.type === 'erc20') {
    // Inputs type is ERC20
    return {
      type: inputs.type,
      adaptID: inputs.adaptID,
      depositAmount: inputs.depositAmount,
      withdrawAmount: inputs.withdrawAmount,
      outputTokenField: inputs.outputTokenField,
      outputEthAddress: inputs.outputEthAddress,
      treeNumber: inputs.treeNumber,
      merkleRoot: inputs.merkleRoot,
      nullifiers: inputs.nullifiers,
      commitmentsOut: inputs.commitmentsOut,
      ciphertextHash: inputs.ciphertextHash,
    };
    // }
  }

  static formatPrivateInputs(inputs: PrivateInputs, decimal = false): FormattedCircuitInputs {
    const publicInputs = Prover.privateToPublicInputs(inputs);
    const hashOfInputs = Prover.hashInputs(publicInputs);

    // if (inputs.type === 'erc20') {
    // Inputs type is ERC20
    const decimalify = (x:bytes.BytesData) => new BN(bytes.hexlify(x), 16).toString(10);
    const hexlify = (x:bytes.BytesData) => bytes.hexlify(x, true);
    const convert = decimal ? decimalify : hexlify;
    return {
      hashOfInputs: convert(hashOfInputs),
      adaptID: convert(inputs.adaptID),
      tokenField: convert(inputs.tokenField),
      depositAmount: convert(inputs.depositAmount),
      withdrawAmount: convert(inputs.withdrawAmount),
      outputTokenField: convert(inputs.outputTokenField),
      outputEthAddress: convert(inputs.outputEthAddress),
      randomIn: inputs.randomIn.map((el) => convert(el)),
      valuesIn: inputs.valuesIn.map((el) => convert(el)),
      spendingKeys: inputs.spendingKeys.map((el) => convert(el)),
      treeNumber: convert(inputs.treeNumber),
      merkleRoot: convert(inputs.merkleRoot),
      nullifiers: inputs.nullifiers.map((el) => convert(el)),
      pathElements: inputs.pathElements.map((el) => el.map((el2) => convert(el2))),
      pathIndices: inputs.pathIndices.map((el) => convert(el)),
      recipientPK: inputs.recipientPK.map(
        (el) => babyjubjub.unpackPoint(el).map(
          (el2) => convert(el2),
        ),
      ),
      randomOut: inputs.randomOut.map((el) => convert(el)),
      valuesOut: inputs.valuesOut.map((el) => convert(el)),
      commitmentsOut: inputs.commitmentsOut.map((el) => convert(el)),
      ciphertextHash: convert(inputs.ciphertextHash),
    };
    // }
  }
}

export { Prover };
