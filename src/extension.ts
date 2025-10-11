/*!
 * Code Namer Extension
 * Copyright (c) 2025 Vesis Solutions (OPC) Pvt. Ltd.
 * Licensed under EULA - See LICENSE file for details
 */

import * as vscode from 'vscode';

import { HistoryItem, HistoryManager } from './history';
import { IdentifierType, generateName } from './namingService';

import { HistoryDetailWebviewProvider } from './webview/HistoryDetailWebviewProvider';
import { NameHistoryProvider } from './tree/NameHistoryProvider';

// Interactive name suggestion function
async function showNameSuggestions(
  contextText: string, 
  type: IdentifierType, 
  history: HistoryManager, 
  provider: NameHistoryProvider,
  previousSuggestions: string[] = []
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('codeNamer');
  const count = Math.min(Math.max(cfg.get<number>('suggestions.count') ?? 5, 3), 7);

  // Generate new suggestions, avoiding previous ones
  const allSuggestions = await generateName(contextText, type, count + previousSuggestions.length * 2).catch(() => []);
  const newSuggestions = allSuggestions.filter(s => !previousSuggestions.includes(s)).slice(0, count);
  
  if (!newSuggestions.length) {
    vscode.window.showErrorMessage('No more suggestions could be generated.');
    return;
  }

  // Create options with suggestions and additional actions
  const options: vscode.QuickPickItem[] = [
    ...newSuggestions.map(suggestion => ({
      label: suggestion,
      description: '$(symbol-property) Use this name',
      detail: `Insert "${suggestion}" into your code`
    })),
    {
      label: '$(refresh) Generate More Variations',
      description: 'Generate additional name suggestions',
      detail: 'Get more creative alternatives for your identifier'
    },
    {
      label: '$(arrow-left) Back to Type Selection',
      description: 'Choose a different identifier type',
      detail: 'Start over with a different type (function, variable, class, file)'
    }
  ];

  const picked = await vscode.window.showQuickPick(options, { 
    placeHolder: `Select a name to insert or choose an action (${previousSuggestions.length + newSuggestions.length} suggestions generated so far)`,
    matchOnDescription: true,
    matchOnDetail: true
  });
  
  if (!picked) { return; }

  // Handle special actions
  if (picked.label === '$(refresh) Generate More Variations') {
    // Generate more suggestions, keeping track of previous ones
    const allPrevious = [...previousSuggestions, ...newSuggestions];
    await showNameSuggestions(contextText, type, history, provider, allPrevious);
    return;
  }

  if (picked.label === '$(arrow-left) Back to Type Selection') {
    // Restart the whole process
    vscode.commands.executeCommand('codeNamer.generateName');
    return;
  }

  // Handle name selection
  const selectedName = picked.label;
  
  // Insert the selected name
  const active = vscode.window.activeTextEditor;
  if (active) {
    await active.edit((edit: vscode.TextEditorEdit) => edit.insert(active.selection.active, selectedName));
  } else {
    await vscode.env.clipboard.writeText(selectedName);
    vscode.window.showInformationMessage('Copied to clipboard (no active editor).');
  }

  // Add to history
  await history.add({
    id: Date.now().toString(),
    name: selectedName,
    context: contextText,
    type: type,
    timestamp: Date.now(),
  });
  provider.refresh();

  // Show success message with additional options
  const result = await vscode.window.showInformationMessage(
    `Name "${selectedName}" inserted successfully!`,
    'Generate Another',
    'Done'
  );

  if (result === 'Generate Another') {
    vscode.commands.executeCommand('codeNamer.generateName');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const history = new HistoryManager(context.globalState);
  const provider = new NameHistoryProvider(history);

  const treeView = vscode.window.createTreeView('codeNamer.nameHistory', {
    treeDataProvider: provider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.generateName', async () => {
      const typePicked = await vscode.window.showQuickPick(
        ['function', 'variable', 'class', 'file'],
        { placeHolder: 'Select identifier type' }
      );
      if (!typePicked) { return; }

      const contextText = await vscode.window.showInputBox({
        prompt: 'Describe what this identifier does',
        placeHolder: 'e.g., function to calculate the total price of items',
      });
      if (!contextText) { return; }

      // Start the interactive name generation process
      await showNameSuggestions(contextText, typePicked as any, history, provider);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.generateMoreVariations', async () => {
      // Get the most recent history item to use its context
      const recentItems = await history.getAll();
      if (recentItems.length === 0) {
        vscode.window.showInformationMessage('No recent context found. Please generate a name first.');
        return;
      }

      const mostRecent = recentItems[0];
      const useRecent = await vscode.window.showInformationMessage(
        `Generate more variations for: "${mostRecent.context}"?`,
        'Yes, use this context',
        'No, enter new context'
      );

      let contextText = mostRecent.context;
      let type = mostRecent.type;

      if (useRecent !== 'Yes, use this context') {
        const typePicked = await vscode.window.showQuickPick(
          ['function', 'variable', 'class', 'file'],
          { placeHolder: 'Select identifier type' }
        );
        if (!typePicked) { return; }

        const newContext = await vscode.window.showInputBox({
          prompt: 'Describe what this identifier does',
          placeHolder: 'e.g., function to calculate the total price of items',
          value: contextText // Pre-fill with recent context
        });
        if (!newContext) { return; }

        contextText = newContext;
        type = typePicked as any;
      }

      // Get previously generated names for this context to avoid duplicates
      const previousNames = recentItems
        .filter(item => item.context === contextText && item.type === type)
        .map(item => item.name);

      await showNameSuggestions(contextText, type, history, provider, previousNames);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.setOpenAIApiKey', async () => {
      const key = await vscode.window.showInputBox({ prompt: 'Enter OpenAI API Key', password: true, ignoreFocusOut: true });
      if (!key) { return; }
      await vscode.workspace.getConfiguration('codeNamer').update('openai.apiKey', key, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('OpenAI API key saved to user settings.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.showHistoryDetail', async (receivedItem: any) => {
      console.log('=== showHistoryDetail Command Debug ===');
      console.log('Raw receivedItem:', receivedItem);
      console.log('ReceivedItem type:', typeof receivedItem);
      
      // Check if this is a valid call for showing history details
      if (!receivedItem) {
        console.log('No item provided - ignoring showHistoryDetail call');
        return;
      }
      
      // Extract the actual HistoryItem from the tree item structure
      let historyItem: HistoryItem;
      
      if (receivedItem && receivedItem.item) {
        // If it's a NameHistoryItem with nested item property
        historyItem = receivedItem.item;
        console.log('Extracted from receivedItem.item:', historyItem);
      } else if (receivedItem && receivedItem.id && receivedItem.name && receivedItem.context) {
        // If it's already a plain HistoryItem
        historyItem = receivedItem as HistoryItem;
        console.log('Using receivedItem directly as HistoryItem:', historyItem);
      } else {
        console.log('Could not extract valid HistoryItem from:', receivedItem);
        console.log('This might be a command button click - ignoring');
        return;
      }
      
      console.log('Final historyItem:', historyItem);
      console.log('HistoryItem.name:', historyItem.name);
      console.log('HistoryItem.type:', historyItem.type);
      console.log('=======================================');
      
      HistoryDetailWebviewProvider.show(context.extensionUri, historyItem);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.copyFromHistory', async (item?: HistoryItem) => {
      const toCopy = item?.name ?? (await vscode.window.showInputBox({ prompt: 'Name to copy' }));
      if (!toCopy) { return; }
      await vscode.env.clipboard.writeText(toCopy);
      vscode.window.showInformationMessage(`Copied '${toCopy}'`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.searchHistory', async () => {
      const q = await vscode.window.showInputBox({ prompt: 'Filter history by text' });
      provider.setFilter(q ?? '');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeNamer.clearHistory', async () => {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all history items?',
        { modal: true },
        'Clear All',
        'Cancel'
      );
      
      if (result === 'Clear All') {
        await history.clear();
        provider.refresh();
        vscode.window.showInformationMessage('History cleared successfully.');
      }
    })
  );
}

export function deactivate() {}
