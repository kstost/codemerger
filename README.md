# CodeMerger
A CLI tool that merges source code files into a single markdown document, perfect for sharing code with LLMs.

## Introduction
When coding with AI assistance, the most crucial aspect is ensuring that the AI accurately understands the entire codebase of your project. While dedicated programs like Cursor AI handle this automatically, using chatbot-style AIs like ChatGPT or Claude presents a challenge - you need to manually copy and paste all the code, and it's often difficult to determine which code needs to be shared.

CodeMerger, developed by CodeGrindingOldman, is a program designed to address these inconveniences. It automatically consolidates code spread across multiple files, either copying it to your clipboard or saving it to a file, making it easier to work with AI chatbots for coding tasks.

This tool is particularly useful when working with next-generation models like o1 and o3-mini-high on the ChatGPT platform rather than Cursor, providing a streamlined way to share your code.

## Features
- Merges multiple files into a single markdown document with proper code fencing
- Automatically copies to clipboard or saves to file
- Supports `.gitignore`-style pattern matching for excluding files
- **NEW**: Inline ignore patterns (`-l`) for quick, one-off excludes
- **NEW**: Allow list option (`-a`) to include only specific files/folders
- Smart detection of binary and non-text files
- Intelligent code fence selection to handle files containing backticks
- UTF-8 and common encoding support

## Installation
```bash
# For Windows
npm install -g codemerger
# For macOS (requires sudo for global installation)
sudo npm install -g codemerger
```

## Usage
Basic usage:
```bash
codemerger <source-folder> [output-file] [options]
```

## Detailed Examples Guide

### 1. Basic Copy
```bash
# Copy current directory files to clipboard
codemerger .
```
**Explanation:**
- `codemerger`: The main command
- `.`: Represents the current directory
- No output file specified → Automatically copies to clipboard
- No options used → Uses default settings
- **Use case:** Quick sharing of entire project files

### 2. Directory to File
```bash
# Save src directory files to output.md
codemerger src output.md
```
**Explanation:**
- `codemerger`: The main command
- `src`: Source directory to process
- `output.md`: Target markdown file for output
- No options used → Uses default settings
- **Use case:** Converting source code to documentation

### 3. Explicit Clipboard
```bash
# Explicitly copy to clipboard
codemerger . -c
```
**Explanation:**
- `codemerger`: The main command
- `.`: Current directory
- `-c`: Force clipboard output
- Ignores any output file argument
- **Use case:** Ensures clipboard output even if filename is accidentally provided

### 4. With Ignore Patterns
```bash
# Apply gitignore patterns while merging
codemerger . result.md -i .gitignore
```
**Explanation:**
- `codemerger`: The main command
- `.`: Current directory
- `result.md`: Output file name
- `-i .gitignore`: Use patterns from .gitignore file
- **Use case:** Exclude version control and build files

### 5. Verbose Output
```bash
# Merge with verbose logging
codemerger src out.md -v
```
**Explanation:**
- `codemerger`: The main command
- `src`: Source directory
- `out.md`: Output file name
- `-v`: Enable verbose logging
- **Use case:** Debug or monitor the merging process

### 6. Inline Ignore Patterns (NEW)
```bash
# Provide inline ignore patterns and copy output to clipboard
codemerger src -c -l node_modules/ *.md .git
```
**Explanation:**
- `codemerger`: The main command
- `src`: Source directory
- `-c`: Copy merged output to clipboard
- `-l node_modules/ *.md .git`: Space-separated inline ignore patterns
- **Use case:** Quickly exclude specified files/folders without an ignore file

### 7. Allow List Option (NEW)
```bash
# Include only certain files, ignoring everything else
codemerger src -c -a saveData.js data.txt
```
**Explanation:**
- `codemerger`: The main command
- `src`: Source directory
- `-c`: Copy merged output to clipboard
- `-a saveData.js data.txt`: Only include these exact paths; everything else is excluded
- **Use case:** Whitelist approach for merging a small subset of files

## Options
- `-i, --ignore <file>`: Specify ignore pattern file (like .gitignore)
- `-l, --inline-ignore <patterns...>`: Provide space-separated ignore patterns inline  
- `-a, --allow <patterns...>`: Only include these exact paths; exclude everything else
- `-v, --verbose`: Show detailed processing logs
- `-c, --clipboard`: Force clipboard output (ignores output file argument)
- `--version`: Show version number
- `--help`: Show help information

## Common Parameters Guide

### Source Directory Options:
- `.`: Current directory
- `src`: Specific source directory
- `path/to/dir`: Any valid directory path

### Output Options:
- `output.md`: Standard output file
- `result.md`: Any custom filename
- `path/to/file.md`: Full path with filename

### Flag Options:
- `-c`: Clipboard output
- `-v`: Verbose logging
- `-i <file>`: Ignore pattern file
- `-l <patterns...>`: Inline ignore patterns
- `-a <patterns...>`: Allow list (only include these paths)

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

## Best Practices

1. **For Quick Sharing:**
   ```bash
   codemerger .
   ```
   - Fastest way to share current directory

2. **For Documentation:**
   ```bash
   codemerger . docs/code.md -i .gitignore
   ```
   - Creates organized documentation
   - Excludes unnecessary files

3. **For Debugging:**
   ```bash
   codemerger src debug.md -v
   ```
   - Shows detailed processing information
   - Helps identify issues

## Advanced Usage Examples

### Complex Ignore with Clipboard
```bash
codemerger src -c -i custom.ignore
```
**Explanation:**
- Processes `src` directory
- Forces clipboard output (`-c`)
- Uses custom ignore patterns
- No output file needed due to `-c`

### Full Project Documentation
```bash
codemerger . documentation.md -v -i .gitignore
```
**Explanation:**
- Processes current directory
- Creates documentation.md
- Shows verbose logs
- Uses .gitignore patterns
- Perfect for creating shareable documentation

### Specific Directory with All Options
```bash
codemerger src/components docs/components.md -v -i .mergeignore
```
**Explanation:**
- Processes only the components directory
- Outputs to docs folder
- Enables verbose logging
- Uses .mergeignore patterns
- Ideal for subsection documentation

### Combining Inline Ignore and Allow
```bash
codemerger src -v -l *.md -a index.js
```
**Explanation:**
- Ignores all `.md` files via `-l` (inline-ignore)
- Whitelists only `index.js` with `-a`
- Verbose logs are enabled
- Result: Only `index.js` remains in the final output

## Requirements
- Node.js v14 or later
- NPM v6 or later

## License
MIT License - See LICENSE file for details

## Author
Kim seungtae
- Email: monogatree@gmail.com
- YouTube: [@코드깎는노인](https://www.youtube.com/@%EC%BD%94%EB%93%9C%EA%B9%8E%EB%8A%94%EB%85%B8%EC%9D%B8)

The command structure provides flexibility while maintaining simplicity for common use cases. Each parameter and option serves a specific purpose in the workflow of code sharing and documentation.
