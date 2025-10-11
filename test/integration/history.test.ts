import 'mocha';
import { strict as assert } from 'assert';
import { HistoryManager, HistoryItem } from '../../src/history';

class MockMemento {
  private store = new Map<string, any>();
  get<T>(key: string): T | undefined { return this.store.get(key); }
  update(key: string, value: any) { this.store.set(key, value); return Promise.resolve(); }
}

describe('HistoryManager', () => {
  it('saves and loads history items', async () => {
    const m = new MockMemento() as any;
    const hm = new HistoryManager(m);
    const item: HistoryItem = {
      id: '1', name: 'calculateTotalPrice', context: 'function to calculate price', type: 'function', timestamp: Date.now()
    };
    await hm.add(item);
    const all = await hm.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].name, 'calculateTotalPrice');
  });
});
