#!/usr/bin/env node

/**
 * codemerger.js
 * Node.js CLI script
 *
 * Usage:
 *   codemerger <folder> <output> [options]
 *
 * Options:
 *   -i, --ignore <file>         Ignore pattern file (.gitignore, etc.)
 *   -l, --inline-ignore         Space-separated ignore patterns (skip matched)
 *   -a, --allow                 Space-separated allow patterns (include only matched)
 *   -v, --verbose               Show extra logs
 *   -c, --clipboard             Copy result to clipboard (ignores output arg)
 */

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import ignore from 'ignore';
import clipboard from 'clipboardy';
import chardet from 'chardet';
import { isBinaryFileSync } from 'isbinaryfile';

/**
 * Load ignore patterns from a file (e.g., .gitignore).
 */
function loadIgnorePatterns(ignoreFile) {
    const lines = [];
    try {
        const data = fs.readFileSync(ignoreFile, 'utf8');
        data.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return;
            }
            lines.push(trimmed);
        });
    } catch (err) {
        console.error(chalk.red(`Error reading ignore pattern file: ${err.message}`));
        return ignore();
    }
    return ignore().add(lines);
}

/**
 * Determine the fenced code block delimiter based on backticks in the file.
 */
function chooseFence(content) {
    if (!content) return '```';

    const matches = content.match(/`+/g);
    if (!matches) return '```';

    try {
        const maxCount = Math.max(...matches.map((m) => m.length));
        return '`'.repeat(Math.max(3, maxCount + 1));
    } catch {
        return '```';
    }
}

/**
 * Check if a file is a text file by:
 *  - using isbinaryfile to detect binary
 *  - using chardet to detect known text encodings
 */
function isTextFile(filePath) {
    try {
        // 1) Quick check with isbinaryfile
        if (isBinaryFileSync(filePath)) {
            return false;
        }
        // 2) Additional check with chardet
        const buffer = fs.readFileSync(filePath);
        const detected = chardet.detect(buffer);
        if (!detected) return false;

        const enc = detected.toLowerCase();
        // We'll treat utf, ascii, iso-8859, windows-125 as text
        return (
            enc.includes('utf') ||
            enc.includes('ascii') ||
            enc.includes('iso-8859') ||
            enc.includes('windows-125')
        );
    } catch (err) {
        console.error(chalk.red(`Error reading file (${filePath}): ${err.message}`));
        return false;
    }
}

/**
 * Git-Ignore 스타일 패턴을 적용한 매칭:
 *  - 디렉터리면 relPath + '/'
 *  - 파일이면 relPath
 * ex) pattern이 "index.js" 라면 "foo/bar/index.js" 도 매칭됨
 */
function isMatched(ig, relPath, isDir) {
    if (isDir) {
        return ig.ignores(relPath + '/');
    }
    return ig.ignores(relPath);
}

/**
 * mergeCodes
 *  - allowIg가 있으면: "매칭된" 파일만 최종 포함
 *  - allowIg가 없으면: "매칭된" 파일(패턴과 일치하는 것)을 제외
 * 
 * 주의: Allow 모드에서도 디렉터리가 매칭되지 않더라도, 자식 파일이 매칭될 수 있으므로
 *       무조건 디렉터리는 재귀 탐색한다.
 */
function mergeCodes(baseFolder, resultFile, ignoreSpec, options) {
    const { verbose, useClipboard, allowIg } = options;
    const mergedItems = [];

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const absPath = path.join(dir, entry.name);
            const relPath = path.relative(baseFolder, absPath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                // Allow 모드라도 디렉터리 자체가 매칭 안 되어도, 혹시 자식 중 매칭될 파일이 있을 수 있으므로
                // 무조건 들어가서 탐색
                walk(absPath);
            } else if (entry.isFile()) {
                if (allowIg) {
                    // ALLOW 모드: 패턴과 매칭되어야 포함
                    if (isMatched(allowIg, relPath, false)) {
                        if (verbose) {
                            console.log(chalk.green(`[ALLOW] ${relPath}`));
                        }
                        // 텍스트 파일인지 확인 후 push
                        if (isTextFile(absPath)) {
                            mergedItems.push([`./${relPath}`, absPath]);
                        } else if (verbose) {
                            if (false) console.log(chalk.yellow(`[SKIP] Binary (or non-text) file: ${relPath}`));
                        }
                    } else {
                        if (verbose) {
                            if (false) console.log(chalk.yellow(`[SKIP not allowed] ${relPath}`));
                        }
                    }
                } else {
                    // IGNORE 모드: 패턴과 매칭되면 제외
                    if (isMatched(ignoreSpec, relPath, false)) {
                        if (verbose) {
                            if (false) console.log(chalk.yellow(`[IGNORE] File:  ${relPath}`));
                        }
                    } else {
                        // 매칭 안 된 파일은 포함
                        if (isTextFile(absPath)) {
                            mergedItems.push([`./${relPath}`, absPath]);
                            if (verbose) {
                                console.log(chalk.green(`[ALLOW] ${relPath}`));
                            }

                        } else if (verbose) {
                            if (false) console.log(chalk.yellow(`[SKIP] Binary (or non-text) file: ${relPath}`));
                        }

                    }
                }
            }
        }
    }

    walk(baseFolder);

    // 정렬
    mergedItems.sort((a, b) => a[0].localeCompare(b[0]));

    // Markdown 결과 생성
    let output = '';
    for (const [displayPath, absPath] of mergedItems) {
        output += `${displayPath}:\n`;
        try {
            const content = fs.readFileSync(absPath, 'utf8');
            const fence = chooseFence(content);
            output += fence + '\n';
            output += content.endsWith('\n') ? content : `${content}\n`;
            output += fence + '\n\n';
        } catch (err) {
            console.error(chalk.red(`Error processing file (${absPath}): ${err.message}`));
            output += '```\n';
            output += `Error reading file: ${err.message}\n`;
            output += '```\n\n';
        }
    }

    // 클립보드 or 파일 출력
    if (useClipboard) {
        try {
            clipboard.writeSync(output);
            console.log(chalk.cyan('Code has been copied to clipboard!'));
        } catch (err) {
            console.error(chalk.red(`Error copying to clipboard: ${err.message}`));
            fs.writeFileSync(resultFile, output, 'utf8');
            console.log(chalk.yellow(`Fallback: Saved to file due to clipboard error: ${resultFile}`));
        }
    } else {
        fs.writeFileSync(resultFile, output, 'utf8');
        console.log(chalk.cyan(`Code merge complete! Output file: ${resultFile}`));
    }
}

/**
 * Create a sample ignore file.
 */
function createSampleIgnore(filePath) {
    try {
        const templatePath = new URL('./templates/default.mergeignore', import.meta.url);
        const sampleContent = fs.readFileSync(templatePath, 'utf8');
        fs.writeFileSync(filePath, sampleContent, 'utf8');
        console.log(chalk.green(`Sample ignore file created: ${filePath}`));
    } catch (err) {
        console.error(chalk.red(`Error creating ignore file: ${err.message}`));
    }
}

/** Commander CLI setup */
const program = new Command();

program
    .name('codemerger')
    .description(`A tool to merge directory files into a single Markdown document

Examples:
  $ codemerger .                          
  $ codemerger src output.md              
  $ codemerger . -c                       
  $ codemerger . result.md -i .gitignore  
  $ codemerger src out.md -v              
  $ codemerger src -c -a node_modules     
`)
    .argument('<folder>', 'Source folder path to merge')
    .argument('[output]', 'Output file path (defaults to clipboard)')
    .option('-i, --ignore <file>', 'Ignore pattern file (like .gitignore)')
    .option('-l, --inline-ignore <patterns...>', 'Space-separated ignore patterns (skip matched)')
    .option('-a, --allow <patterns...>', 'Space-separated allow patterns (include only matched)')
    .option('-v, --verbose', 'Show detailed processing logs', false)
    .option('-c, --clipboard', 'Copy output to clipboard (ignores output arg)', false)
    .version('1.0.0');

/**
 * 'init' subcommand
 */
program
    .command('init')
    .description(`Create a default ignore pattern file`)
    .argument('[filename]', 'Ignore file name (default: .mergeignore)', '.mergeignore')
    .action((filename) => {
        const filePath = path.resolve(filename);
        createSampleIgnore(filePath);
    });

/**
 * Main action
 */
program.action((folder, output, options) => {
    const folderPath = path.resolve(folder);
    const useClipboard = options.clipboard || !output;
    const resultPath = output ? path.resolve(output) : 'clipboard';

    // 일반 ignore 인스턴스
    let ig = ignore();
    // allowIg 인스턴스
    let allowIg = null;

    // --allow가 있으면 allow 모드
    if (options.allow && options.allow.length > 0) {
        allowIg = ignore().add(options.allow);

        // 만약 -i 또는 -l이 함께 들어온 경우 경고
        if (options.ignore || (options.inlineIgnore && options.inlineIgnore.length > 0)) {
            console.log(
                chalk.yellow(
                    '[WARNING] -a(allow)와 -i / -l(ignore)은 동시에 사용할 수 없습니다. ' +
                    'allow가 우선 적용되고, ignore 패턴은 무시됩니다.'
                )
            );
        }
    }
    // allow가 아닌 경우에만 ignore 로직
    else {
        if (options.ignore) {
            ig = loadIgnorePatterns(path.resolve(options.ignore));
        }
        if (options.inlineIgnore && options.inlineIgnore.length > 0) {
            ig.add(options.inlineIgnore);
        }
    }

    // Verbose
    if (options.verbose) {
        console.log(chalk.green(`Target folder: ${folderPath}`));
        console.log(chalk.green(`Output target: ${useClipboard ? 'clipboard' : resultPath}`));

        if (allowIg) {
            console.log(chalk.green(`Allow patterns: ${options.allow.join(', ')}`));
        } else {
            if (options.ignore) {
                console.log(chalk.green(`Ignore pattern file: ${options.ignore}`));
            }
            if (options.inlineIgnore && options.inlineIgnore.length > 0) {
                console.log(chalk.green(`Inline ignore patterns: ${options.inlineIgnore.join(', ')}`));
            }
        }
        console.log('');
    }

    // 병합
    mergeCodes(folderPath, resultPath, ig, {
        verbose: options.verbose,
        useClipboard,
        allowIg
    });
});

program.parse(process.argv);
