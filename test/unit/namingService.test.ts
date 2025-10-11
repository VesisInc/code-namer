import 'mocha';
import { strict as assert } from 'assert';
import { generateName } from '../../src/namingService';

describe('generateName', () => {
  it('returns 3-5 suggestions for function', async () => {
    const out = await generateName('function to calculate the total price of items', 'function', 5);
    assert.ok(out.length >= 3 && out.length <= 5);
    assert.ok(out.every(s => /[a-z][A-Za-z0-9]*/.test(s)));
  });

  it('returns camelCase for variable', async () => {
    const out = await generateName('total items count', 'variable', 3);
    assert.ok(out[0][0].toLowerCase() === out[0][0]);
  });

  it('returns PascalCase for class', async () => {
    const out = await generateName('user account manager', 'class', 3);
    assert.ok(/^[A-Z]/.test(out[0]));
  });

  it('returns kebab-case for file', async () => {
    const out = await generateName('user profile page', 'file', 3);
    assert.ok(/-/.test(out[0]));
  });

  it('falls back when provider fails', async () => {
    const out = await generateName('', 'variable', 3);
    assert.ok(out.length >= 1);
  });
});
