# Code Namer

Generate context-aware names for variables, functions, classes, and files. Keep a searchable history in a dedicated sidebar.

## Features
- Generate 3–5 relevant name suggestions based on your description
- Insert the chosen name at the cursor or copy it if no editor is active
- Persistent Name History with context snippets
- Quick search/filter across history
- Optional OpenAI provider, with safe offline fallback heuristics

## Commands
- Code Namer: Generate Name (`codeNamer.generateName`)
- Code Namer: Copy From History (`codeNamer.copyFromHistory`)
- Code Namer: Search History (`codeNamer.searchHistory`)

## Settings
- `codeNamer.provider`: `fallback` | `openai` (default: `fallback`)
- `codeNamer.openai.apiKey`: OpenAI API key
- `codeNamer.openai.model`: Model name (default: `gpt-4o-mini`)
- `codeNamer.suggestions.count`: 3–7 suggestions to return (default: 5)

Security and keys
- Do not hardcode or commit API keys. Configure them via the command "Code Namer: Set OpenAI API Key" or set the `OPENAI_API_KEY` environment variable. The extension reads the setting first and falls back to the environment variable.

## Usage
1. Run "Code Namer: Generate Name"
2. Select identifier type (function, variable, class, file)
3. Enter a description of what the identifier represents
4. Pick from suggestions; the selected name is inserted or copied
5. Open the "Code Namer" sidebar to view and search your history

## Development
- `npm install`
- `npm run watch` to compile in watch mode
- `F5` to launch the Extension Development Host
- `npm test` to run tests

## Testing
- Unit tests cover the `generateName` function
- Integration tests cover history persistence using a mock Memento

## License
EULA (End User License Agreement) - See LICENSE file for details

## Copyright
Copyright (c) 2025 Vesis Solutions (OPC) Pvt. Ltd.
