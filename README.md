# CodeMerger

A CLI tool that merges source code files into a single markdown document, perfect for sharing code with LLMs.

## Features

- Merges multiple files into a single markdown document with proper code fencing
- Automatically copies to clipboard or saves to file
- Supports `.gitignore`-style pattern matching for excluding files
- Smart detection of binary and non-text files
- Intelligent code fence selection to handle files containing backticks
- UTF-8 and common encoding support

## Installation

```bash
npm install -g codemerger
```

## Usage

Basic usage:
```bash
codemerger <source-folder> [output-file] [options]
```

Examples:
```bash
# Copy current directory files to clipboard
codemerger .

# Save src directory files to output.md
codemerger src output.md

# Explicitly copy to clipboard
codemerger . -c

# Apply gitignore patterns while merging
codemerger . result.md -i .gitignore

# Merge with verbose logging
codemerger src out.md -v
```

## Options

- `-i, --ignore <file>`: Specify ignore pattern file (like .gitignore)
- `-v, --verbose`: Show detailed processing logs
- `-c, --clipboard`: Force clipboard output (ignores output file argument)
- `--version`: Show version number
- `--help`: Show help information

## Ignore Patterns

Create a default ignore pattern file:
```bash
codemerger init [filename]
```

This creates a `.mergeignore` file (or custom filename) with common exclude patterns for:
- System files (.DS_Store, Thumbs.db)
- Node modules and logs
- IDE settings
- Build outputs
- Environment files
- Temporary files
- Binary and media files

## Output Format

The merged output follows this format:
````markdown
./path/to/file1.js:
```
// file1.js contents
```

./path/to/file2.py:
```
# file2.py contents
```
````

## Requirements

- Node.js v14 or later
- NPM v6 or later

## License

MIT License - See LICENSE file for details

## Author

Kim seungtae
- Email: monogatree@gmail.com
- YouTube: [@코드깎는노인](https://www.youtube.com/@%EC%BD%94%EB%93%9C%EA%B9%8E%EB%8A%94%EB%85%B8%EC%9D%B8)