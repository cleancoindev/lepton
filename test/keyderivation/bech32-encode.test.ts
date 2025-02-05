/* globals describe it */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  encode,
  decode,
} from '../../src/keyderivation/bech32-encode';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Key Derivation/Bech32 Encode', () => {
  it('Should encode and decode addresses', () => {
    const vectors = [
      {
        pubkey: '00000000',
        chainID: 1,
        address: 'rgeth1qyqqqqqqqz8wnw',
      },
      {
        pubkey: '01bfd5681c0479be9a8ef8dd8baadd97115899a9af30b3d2455843afb41b',
        chainID: 56,
        address: 'rgbsc1qyqml4tgrsz8n0563mudmza2mkt3zkye4xhnpv7jg4vy8ta5rvr770qf',
      },
      {
        pubkey: 'ee6b4c702f8070c8ddea1cbb8b0f6a4a518b77fa8d3f9b68617b664550e75f649ed233',
        chainID: undefined,
        address: 'rgany1q8hxknrs97q8pjxaagwthzc0df99rzmhl2xnlxmgv9akv32sua0kf8kjxvy4unfw',
      },
    ];

    vectors.forEach((vector) => {
      expect(encode(vector.pubkey, vector.chainID))
        .to.equal(vector.address);

      expect(decode(vector.address)).to.deep.equal({
        pubkey: vector.pubkey,
        chainID: vector.chainID,
      });
    });

    expect(() => { decode('rgany1qthxknrs97q8pjxaagwthzc0df99rzmhl2xnlxmgv9akv32sua0kf8kjxvewd2r7'); })
      .to.throw('Incorrect address version');
    expect(() => { decode('rgunknown1q8hxknrs97q8pjxaagwthzc0df99rzmhl2xnlxmgv9akv32sua0kf8kjxv0uzkrc'); })
      .to.throw('Address prefix unrecognized');
  });
});
