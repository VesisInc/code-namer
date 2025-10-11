/*!
 * Code Namer Extension - History Management
 * Copyright (c) 2025 Vesis Solutions (OPC) Pvt. Ltd.
 * Licensed under EULA - See LICENSE file for details
 */

import * as vscode from 'vscode';

export interface HistoryItem {
  id: string;
  name: string;
  context: string;
  type: 'function' | 'variable' | 'class' | 'file';
  timestamp: number;
}

const KEY = 'codeNamer.history';

export class HistoryManager {
  constructor(private memento: vscode.Memento) {}

  async add(item: HistoryItem): Promise<void> {
    const all = await this.getAll();
    all.unshift(item);
    await this.memento.update(KEY, all);
  }

  async getAll(): Promise<HistoryItem[]> {
    const items = this.memento.get<HistoryItem[]>(KEY) ?? [];
    console.log('HistoryManager.getAll() returning:', items);
    console.log('First item:', items[0]);
    if (items[0]) {
      console.log('First item properties:', Object.keys(items[0]));
      console.log('First item name:', items[0].name);
      console.log('First item type:', items[0].type);
    }
    return items;
  }

  async clear(): Promise<void> {
    await this.memento.update(KEY, []);
  }
}
