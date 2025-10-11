/*!
 * Code Namer Extension - Tree View Provider
 * Copyright (c) 2025 Vesis Solutions (OPC) Pvt. Ltd.
 * Licensed under EULA - See LICENSE file for details
 */

import * as vscode from 'vscode';

import { HistoryItem, HistoryManager } from '../history';

export class NameHistoryItem extends vscode.TreeItem {
  constructor(public readonly item: HistoryItem) {
    super(item.name, vscode.TreeItemCollapsibleState.None);
    
    console.log('NameHistoryItem constructor called with:', item);
    
    (this as any).description = item.context.length > 60 ? item.context.slice(0, 57) + '…' : item.context;
    (this as any).tooltip = `${item.name}\n${item.context}` as vscode.MarkdownString | string;
    
    // Create a plain object to ensure proper serialization
    const itemData = {
      id: item.id,
      name: item.name,
      context: item.context,
      type: item.type,
      timestamp: item.timestamp
    };
    
    (this as any).command = {
      command: 'codeNamer.showHistoryDetail',
      title: 'Show Details',
      arguments: [itemData]
    };
    (this as any).contextValue = 'nameHistoryItem';
  }
}

export class CommandItem extends vscode.TreeItem {
  constructor(
    public readonly commandId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly icon?: string
  ) {
    super(title, vscode.TreeItemCollapsibleState.None);
    
    (this as any).description = description;
    (this as any).tooltip = description;
    (this as any).command = {
      command: commandId,
      title: title,
      arguments: []
    };
    (this as any).contextValue = 'commandItem';
    
    if (icon) {
      (this as any).iconPath = new vscode.ThemeIcon(icon);
    }
  }
}

export class SectionItem extends vscode.TreeItem {
  constructor(public readonly title: string) {
    super(title, vscode.TreeItemCollapsibleState.Expanded);
    (this as any).contextValue = 'sectionItem';
    (this as any).iconPath = new vscode.ThemeIcon('folder');
  }
}

export class EmptyStateItem extends vscode.TreeItem {
  constructor(public readonly message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    (this as any).contextValue = 'emptyStateItem';
    (this as any).iconPath = new vscode.ThemeIcon('info');
  }
}

type TreeItem = NameHistoryItem | CommandItem | SectionItem | EmptyStateItem;

export class NameHistoryProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private filterText = '';

  constructor(private history: HistoryManager) {}

  setFilter(text: string) {
    this.filterText = text.trim().toLowerCase();
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level - return sections
      return [
        new SectionItem('Commands'),
        new SectionItem('History')
      ];
    }

    if (element instanceof SectionItem) {
      if (element.title === 'Commands') {
        // Return command buttons
        return [
          new CommandItem(
            'codeNamer.generateName',
            'Generate Name',
            'Generate a new name for your code',
            'add'
          ),
          new CommandItem(
            'codeNamer.generateMoreVariations',
            'Generate More Variations',
            'Generate additional variations from recent context',
            'refresh'
          ),
          new CommandItem(
            'codeNamer.setOpenAIApiKey',
            'Set OpenAI API Key',
            'Configure OpenAI API key for better suggestions',
            'key'
          ),
          new CommandItem(
            'codeNamer.searchHistory',
            'Search History',
            'Filter history items by text',
            'search'
          ),
          new CommandItem(
            'codeNamer.clearHistory',
            'Clear History',
            'Clear all history items',
            'trash'
          )
        ];
      } else if (element.title === 'History') {
        // Return history items
        const items = await this.history.getAll();
        console.log('NameHistoryProvider.getChildren - items from history:', items);
        
        const filtered = this.filterText
          ? items.filter(i =>
              i.name.toLowerCase().includes(this.filterText) ||
              i.context.toLowerCase().includes(this.filterText)
            )
          : items;

        console.log('NameHistoryProvider.getChildren - filtered items:', filtered);
        
        if (filtered.length === 0) {
          return [new EmptyStateItem('No history items')];
        }
        
        return filtered.map(i => new NameHistoryItem(i));
      }
    }

    return [];
  }
}
