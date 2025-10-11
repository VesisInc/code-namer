"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const history_1 = require("../../src/history");
class MockMemento {
    constructor() {
        this.store = new Map();
    }
    get(key) { return this.store.get(key); }
    update(key, value) { this.store.set(key, value); return Promise.resolve(); }
}
describe('HistoryManager', () => {
    it('saves and loads history items', async () => {
        const m = new MockMemento();
        const hm = new history_1.HistoryManager(m);
        const item = {
            id: '1', name: 'calculateTotalPrice', context: 'function to calculate price', type: 'function', timestamp: Date.now()
        };
        await hm.add(item);
        const all = await hm.getAll();
        assert_1.strict.equal(all.length, 1);
        assert_1.strict.equal(all[0].name, 'calculateTotalPrice');
    });
});
//# sourceMappingURL=history.test.js.map