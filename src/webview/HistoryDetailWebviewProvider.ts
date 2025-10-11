/*!
 * Code Namer Extension - Webview Provider
 * Copyright (c) 2025 Vesis Solutions (OPC) Pvt. Ltd.
 * Licensed under EULA - See LICENSE file for details
 */

import * as vscode from 'vscode';

import { HistoryItem } from '../history';

export class HistoryDetailWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;

  public static show(extensionUri: vscode.Uri, historyItem: HistoryItem) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    // Debug logging
    console.log('HistoryDetailWebviewProvider.show called with:', historyItem);
    
    if (!historyItem) {
      vscode.window.showErrorMessage('No history item provided to webview');
      return;
    }

    // If we already have a panel, dispose it
    if (HistoryDetailWebviewProvider.currentPanel) {
      HistoryDetailWebviewProvider.currentPanel.dispose();
    }

    // Create and show a new webview panel
    HistoryDetailWebviewProvider.currentPanel = vscode.window.createWebviewPanel(
      'historyDetail',
      `Name Details: ${historyItem.name}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    HistoryDetailWebviewProvider.currentPanel.webview.html = HistoryDetailWebviewProvider.getWebviewContent(
      HistoryDetailWebviewProvider.currentPanel.webview,
      extensionUri,
      historyItem
    );

    // Handle messages from the webview
    HistoryDetailWebviewProvider.currentPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'copyName':
            await vscode.env.clipboard.writeText(historyItem.name);
            vscode.window.showInformationMessage(`Copied '${historyItem.name}' to clipboard`);
            break;
          case 'insertName':
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              await editor.edit((editBuilder) => {
                editBuilder.insert(editor.selection.active, historyItem.name);
              });
            } else {
              vscode.window.showWarningMessage('No active editor to insert into');
            }
            break;
        }
      },
      undefined
    );

    // When the panel is disposed, clear the current panel reference
    HistoryDetailWebviewProvider.currentPanel.onDidDispose(
      () => {
        HistoryDetailWebviewProvider.currentPanel = undefined;
      },
      null
    );
  }

  private static getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, item: HistoryItem): string {
    // Debug logging
    console.log('Item details:', item);
    console.log('getWebviewContent called with item:', JSON.stringify(item, null, 2));
    // Format timestamp
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    // Get a styled type badge color
    const getTypeColor = (type: string): string => {
      switch (type) {
        case 'function': return '#007ACC';
        case 'variable': return '#4CAF50';
        case 'class': return '#FF9800';
        case 'file': return '#9C27B0';
        default: return '#6C6C6C';
      }
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Name Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        
        .name-title {
            font-size: 24px;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: var(--vscode-editor-foreground);
        }
        
        .type-badge {
            display: inline-block;
            background-color: ${getTypeColor(item.type)};
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        
        .timestamp {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: var(--vscode-editor-foreground);
            margin-bottom: 10px;
        }
        
        .context-content {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            font-family: var(--vscode-editor-font-family);
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-family: var(--vscode-font-family);
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px 20px;
            margin-bottom: 20px;
        }
        
        .info-label {
            font-weight: bold;
            color: var(--vscode-editor-foreground);
        }
        
        .info-value {
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
                <div class="header">
            <h1 class="name-title">${HistoryDetailWebviewProvider.escapeHtml(item.name || '[NO NAME]')}</h1>
            <div class="type-badge">${item.type || '[NO TYPE]'}</div>
            <div class="timestamp">Generated on ${formattedDate}</div>
        </div>
        
        <div class="section">
            <h2 class="section-title">Details</h2>
            <div class="info-grid">
                <div class="info-label">ID:</div>
                <div class="info-value">${HistoryDetailWebviewProvider.escapeHtml(item?.id || '[NO ID]')}</div>
                <div class="info-label">Type:</div>
                <div class="info-value">${HistoryDetailWebviewProvider.escapeHtml(item?.type || '[NO TYPE]')}</div>
                <div class="info-label">Generated:</div>
                <div class="info-value">${formattedDate}</div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">Context Description</h2>
            <div class="context-content">${HistoryDetailWebviewProvider.escapeHtml(item.context || '[NO CONTEXT]')}</div>
        </div>
        
        <div class="actions">
            <button class="btn" onclick="copyName()">Copy Name</button>
            <button class="btn btn-secondary" onclick="insertName()">Insert into Editor</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function copyName() {
            vscode.postMessage({
                command: 'copyName'
            });
        }
        
        function insertName() {
            vscode.postMessage({
                command: 'insertName'
            });
        }
    </script>
</body>
</html>`;
  }

  private static escapeHtml(unsafe: string | undefined | null): string {
    if (!unsafe) {
      return '';
    }
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}