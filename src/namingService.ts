/*!
 * Code Namer Extension - Naming Service
 * Copyright (c) 2025 Vesis Solutions (OPC) Pvt. Ltd.
 * Licensed under EULA - See LICENSE file for details
 */

import * as vscode from 'vscode';

export type IdentifierType = 'function' | 'variable' | 'class' | 'file';

function toCamelCase(words: string[]): string {
  const [first, ...rest] = words;
  return [first.toLowerCase(), ...rest.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())].join('');
}

function toPascalCase(words: string[]): string {
  return words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function toKebabCase(words: string[]): string {
  return words.map(w => w.toLowerCase()).join('-');
}

function tokenize(context: string): string[] {
  return context
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function generateWithOpenAI(prompt: string, count: number): Promise<string[]> {
  const cfg = vscode.workspace.getConfiguration('codeNamer');
  const apiKey = cfg.get<string>('openai.apiKey') || process.env.OPENAI_API_KEY;
  const model = cfg.get<string>('openai.model') || 'gpt-4o-mini';
  if (!apiKey) return [];

  // We avoid external network calls in tests; VS Code marketplace policy allows optional usage.
  // If available environment permits, user can set API key.
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You generate concise, idiomatic programming identifier names.' },
          { role: 'user', content: prompt }
        ],
        n: 1,
        temperature: 0.6,
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const content: string = data.choices?.[0]?.message?.content || '';
    // Expect lines separated or comma separated suggestions
    const raw = content
      .split(/\r?\n|,\s*/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    return dedupe(raw).slice(0, count);
  } catch {
    return [];
  }
}

function heuristicSuggestions(context: string, type: IdentifierType, count: number): string[] {
  const tokens = tokenize(context);
  if (!tokens.length) return [getDefaultName(type)];

  // Enhanced keyword mappings
  const actionVerbs = ['get', 'set', 'fetch', 'retrieve', 'obtain', 'acquire'];
  const createVerbs = ['create', 'build', 'make', 'generate', 'construct', 'produce'];
  const processVerbs = ['process', 'handle', 'manage', 'compute', 'calculate', 'transform'];
  const updateVerbs = ['update', 'modify', 'change', 'edit', 'adjust', 'revise'];
  const checkVerbs = ['check', 'validate', 'verify', 'test', 'confirm', 'ensure'];
  const formatVerbs = ['format', 'parse', 'convert', 'serialize', 'stringify'];

  // Context-aware verb selection
  const getRelevantVerbs = (context: string): string[] => {
    const lowerContext = context.toLowerCase();
    
    if (lowerContext.includes('format') || lowerContext.includes('parse') || lowerContext.includes('convert')) {
      return formatVerbs;
    }
    if (lowerContext.includes('create') || lowerContext.includes('build') || lowerContext.includes('new')) {
      return createVerbs;
    }
    if (lowerContext.includes('update') || lowerContext.includes('modify') || lowerContext.includes('change')) {
      return updateVerbs;
    }
    if (lowerContext.includes('check') || lowerContext.includes('valid') || lowerContext.includes('test')) {
      return checkVerbs;
    }
    if (lowerContext.includes('calculate') || lowerContext.includes('compute') || lowerContext.includes('process')) {
      return processVerbs;
    }
    
    return actionVerbs;
  };

  const relevantVerbs = getRelevantVerbs(context);
  
  // Extract meaningful nouns (filter out common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might']);
  const meaningfulTokens = tokens
    .filter(t => t.length > 2 && !commonWords.has(t.toLowerCase()))
    .slice(0, 4)
    .map(t => t.toLowerCase());

  if (meaningfulTokens.length === 0) {
    return [getDefaultName(type)];
  }

  const suggestions: string[] = [];
  
  // Generate verb + noun combinations
  for (const verb of relevantVerbs.slice(0, 3)) {
    for (let i = 0; i < Math.min(meaningfulTokens.length, 2); i++) {
      const words = [verb, ...meaningfulTokens.slice(i, i + 2)];
      suggestions.push(formatName(words, type));
      
      // Add singular noun version
      if (meaningfulTokens[i].endsWith('s') && meaningfulTokens[i].length > 3) {
        const singular = meaningfulTokens[i].slice(0, -1);
        suggestions.push(formatName([verb, singular], type));
      }
    }
  }

  // Generate noun-only combinations
  for (let i = 0; i < Math.min(meaningfulTokens.length, 3); i++) {
    const words = meaningfulTokens.slice(i, i + 2);
    if (words.length > 0) {
      suggestions.push(formatName(words, type));
    }
  }

  // Generate context-specific patterns
  if (type === 'function') {
    // For functions, try different verb patterns
    const functionPatterns = [
      ...meaningfulTokens.map(noun => formatName(['is', noun], type)),
      ...meaningfulTokens.map(noun => formatName(['has', noun], type)),
      ...meaningfulTokens.slice(0, 2).map(noun => formatName(['find', noun], type)),
    ];
    suggestions.push(...functionPatterns);
  }

  if (type === 'variable') {
    // For variables, generate descriptive names
    const variablePatterns = [
      ...meaningfulTokens.map(noun => formatName([noun, 'data'], type)),
      ...meaningfulTokens.map(noun => formatName([noun, 'info'], type)),
      ...meaningfulTokens.map(noun => formatName(['current', noun], type)),
      ...meaningfulTokens.map(noun => formatName(['selected', noun], type)),
    ];
    suggestions.push(...variablePatterns);
  }

  if (type === 'class') {
    // For classes, generate entity names
    const classPatterns = [
      ...meaningfulTokens.map(noun => formatName([noun, 'manager'], type)),
      ...meaningfulTokens.map(noun => formatName([noun, 'handler'], type)),
      ...meaningfulTokens.map(noun => formatName([noun, 'service'], type)),
      ...meaningfulTokens.map(noun => formatName([noun, 'controller'], type)),
    ];
    suggestions.push(...classPatterns);
  }

  // Remove duplicates and filter out empty/invalid names
  const uniqueSuggestions = dedupe(suggestions)
    .filter(name => name && name.length > 1 && isValidIdentifier(name))
    .slice(0, count);

  // If we don't have enough suggestions, add some fallbacks
  if (uniqueSuggestions.length < count) {
    const fallbacks = generateFallbacks(meaningfulTokens, type, count - uniqueSuggestions.length);
    uniqueSuggestions.push(...fallbacks);
  }

  return uniqueSuggestions.slice(0, count);
}

function formatName(words: string[], type: IdentifierType): string {
  if (!words.length) return '';
  
  switch (type) {
    case 'variable':
    case 'function':
      return toCamelCase(words);
    case 'class':
      return toPascalCase(words);
    case 'file':
      return toKebabCase(words);
    default:
      return toCamelCase(words);
  }
}

function getDefaultName(type: IdentifierType): string {
  switch (type) {
    case 'variable': return 'data';
    case 'function': return 'execute';
    case 'class': return 'Handler';
    case 'file': return 'utility';
    default: return 'item';
  }
}

function isValidIdentifier(name: string): boolean {
  // Check if it's a valid identifier (starts with letter, contains only letters, numbers, underscores, hyphens for files)
  if (name.includes('-')) {
    // File names can have hyphens
    return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(name);
  }
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

function generateFallbacks(tokens: string[], type: IdentifierType, count: number): string[] {
  const fallbacks: string[] = [];
  
  if (tokens.length > 0) {
    // Generate simple combinations
    fallbacks.push(formatName(tokens.slice(0, 1), type));
    if (tokens.length > 1) {
      fallbacks.push(formatName(tokens.slice(0, 2), type));
    }
    
    // Add type-specific fallbacks
    switch (type) {
      case 'variable':
        fallbacks.push(formatName([tokens[0], 'value'], type));
        fallbacks.push(formatName([tokens[0], 'result'], type));
        break;
      case 'function':
        fallbacks.push(formatName(['handle', tokens[0]], type));
        fallbacks.push(formatName(['process', tokens[0]], type));
        break;
      case 'class':
        fallbacks.push(formatName([tokens[0], 'Helper'], type));
        fallbacks.push(formatName([tokens[0], 'Utility'], type));
        break;
      case 'file':
        fallbacks.push(formatName([tokens[0], 'utils'], type));
        fallbacks.push(formatName([tokens[0], 'helpers'], type));
        break;
    }
  }

  return dedupe(fallbacks).slice(0, count);
}

export async function generateName(contextText: string, type: IdentifierType, count = 5): Promise<string[]> {
  const cfg = vscode.workspace.getConfiguration('codeNamer');
  const provider = cfg.get<string>('provider') || 'fallback';
  const prompt = `Suggest ${count} ${type} names for: ${contextText}. Only output the names, comma or newline separated.`;

  if (provider === 'openai') {
    const ai = await generateWithOpenAI(prompt, count);
    if (ai.length >= 3) return ai.slice(0, count);
  }

  return heuristicSuggestions(contextText, type, count);
}
