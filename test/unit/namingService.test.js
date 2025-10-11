"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const namingService_1 = require("../../src/namingService");
describe('generateName', () => {
    it('returns 3-5 suggestions for function', async () => {
        const out = await (0, namingService_1.generateName)('function to calculate the total price of items', 'function', 5);
        assert_1.strict.ok(out.length >= 3 && out.length <= 5);
        assert_1.strict.ok(out.every(s => /[a-z][A-Za-z0-9]*/.test(s)));
    });
    it('returns camelCase for variable', async () => {
        const out = await (0, namingService_1.generateName)('total items count', 'variable', 3);
        assert_1.strict.ok(out[0][0].toLowerCase() === out[0][0]);
    });
    it('returns PascalCase for class', async () => {
        const out = await (0, namingService_1.generateName)('user account manager', 'class', 3);
        assert_1.strict.ok(/^[A-Z]/.test(out[0]));
    });
    it('returns kebab-case for file', async () => {
        const out = await (0, namingService_1.generateName)('user profile page', 'file', 3);
        assert_1.strict.ok(/-/.test(out[0]));
    });
    it('falls back when provider fails', async () => {
        const out = await (0, namingService_1.generateName)('', 'variable', 3);
        assert_1.strict.ok(out.length >= 1);
    });
});
//# sourceMappingURL=namingService.test.js.map