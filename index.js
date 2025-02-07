#!/usr/bin/env node

/**
 * codemerger.js
 * Node.js용 CLI 스크립트
 *
 * Usage:
 *   codemerger <folder> <output> [옵션들]
 *
 *   -i, --ignore  무시 패턴 파일(.gitignore 등)
 *   -v, --verbose 추가 로그 출력
 */

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import ignore from 'ignore';
import clipboard from 'clipboardy';
import chardet from 'chardet';
import { isBinaryFileSync } from 'isbinaryfile'; // isbinaryfile 추가

const program = new Command();

/**
 * .gitignore 등 무시 패턴을 읽어서 ignore 라이브러리 인스턴스를 생성.
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
 * content 내부에 있는 연속된 backtick의 최대 길이를 찾고,
 * 그보다 1개 많은 backtick으로 fenced code block을 결정한다.
 */
function chooseFence(content) {
    if (!content) return '```';
    
    const matches = content.match(/`+/g);
    if (!matches) return '```';
    
    try {
        const maxCount = Math.max(...matches.map(m => m.length));
        return '`'.repeat(Math.max(3, maxCount + 1));
    } catch (err) {
        // 예외 발생시 기본값 반환
        return '```';
    }
}

/**
 * 파일이 "텍스트 파일"인지 판별.
 * 1) isbinaryfile 이용해서 바이너리 검사
 * 2) chardet 이용해서 알려진 텍스트 인코딩 여부 확인
 */
function isTextFile(filePath) {
    try {
        // --- 1) isbinaryfile 검사 ---
        // isBinaryFileSync(filePath, [optional size]) 인자로 부분만 읽을 수도 있지만, 여기선 생략
        if (isBinaryFileSync(filePath)) {
            // 바이너리로 판정되면 즉시 false
            return false;
        }

        // --- 2) chardet으로 추가 확인 ---
        const buffer = fs.readFileSync(filePath);
        const detected = chardet.detect(buffer);  // 예: 'UTF-8', 'ASCII', 'ISO-8859-1', 'Shift_JIS' 등

        if (!detected) {
            // 인코딩 추론 실패 -> 바이너리로 취급
            return false;
        }

        // 소문자로 변환해서 간단히 확인
        const enc = detected.toLowerCase();

        // 여기서는 utf, ascii, iso-8859, windows-125 계열 등을 텍스트로 가정
        // euc-kr, shift_jis 등을 허용하고 싶다면 조건에 추가
        if (
            enc.includes('utf') ||
            enc.includes('ascii') ||
            enc.includes('iso-8859') ||
            enc.includes('windows-125')
        ) {
            return true;
        }

        return false;
    } catch (err) {
        console.error(chalk.red(`Error reading file (${filePath}): ${err.message}`));
        return false;
    }
}

/**
 * baseFolder를 재귀 탐색하며, ignoreSpec으로부터 무시되지 않는 파일들을
 * 모아서 클립보드나 파일로 저장한다.
 */
function mergeCodes(baseFolder, resultFile, ignoreSpec, verbose = false, useClipboard = false) {
    const mergedItems = [];

    /**
     * 재귀적으로 파일/디렉토리 순회
     */
    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const absPath = path.join(dir, entry.name);
            // relPath는 baseFolder 기준 상대 경로 (슬래시 통일)
            const relPath = path.relative(baseFolder, absPath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                // 디렉토리 패턴 무시 여부 (디렉토리 끝에 '/' 붙여서 확인)
                if (!ignoreSpec.ignores(relPath + '/')) {
                    walk(absPath);
                } else if (verbose) {
                    console.log(chalk.yellow(`[IGNORE] Directory: ${relPath}/`));
                }
            } else if (entry.isFile()) {
                if (!ignoreSpec.ignores(relPath)) {
                    // 텍스트 파일인지 여부 검사
                    if (isTextFile(absPath)) {
                        mergedItems.push([`./${relPath}`, absPath]);
                    } else if (verbose) {
                        console.log(chalk.yellow(`[SKIP] Binary (or non-text) file: ${relPath}`));
                    }
                } else if (verbose) {
                    console.log(chalk.yellow(`[IGNORE] File: ${relPath}`));
                }
            }
        }
    }

    walk(baseFolder);

    // 경로 기준 정렬
    mergedItems.sort((a, b) => a[0].localeCompare(b[0]));

    let output = '';
    for (const [displayPath, absPath] of mergedItems) {
        output += `${displayPath}:\n`;
        let content = '';
        try {
            content = fs.readFileSync(absPath, 'utf8');
            const fence = chooseFence(content);
            output += fence + '\n';
            output += content;
            if (!content.endsWith('\n')) {
                output += '\n';
            }
            output += fence + '\n\n';
        } catch (err) {
            console.error(chalk.red(`Error processing file (${absPath}): ${err.message}`));
            output += '```\n';
            output += `Error reading file: ${err.message}\n`;
            output += '```\n\n';
        }
    }

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
 * 기본 ignore 패턴 샘플 생성
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

/**
 * CLI 정의
 */
program
    .name('codemerger')
    .description(`A tool to merge directory files into a single Markdown document

Examples:
  $ codemerger .                         # Copy current directory files to clipboard
  $ codemerger src output.md             # Save src directory files to output.md
  $ codemerger . -c                      # Explicitly copy to clipboard
  $ codemerger . result.md -i .gitignore # Apply gitignore patterns while merging
  $ codemerger src out.md -v             # Merge with verbose logging

Output Format:
  - Each file is shown with its relative path
  - Code is formatted in markdown code blocks
  - Binary or non-text files are skipped
  - Files matching ignore patterns are excluded`)
    .argument('<folder>', 'Source folder path to merge')
    .argument('[output]', 'Output file path (defaults to clipboard)')
    .option('-i, --ignore <file>', 'Ignore pattern file (like .gitignore)')
    .option('-v, --verbose', 'Show detailed processing logs', false)
    .option('-c, --clipboard', 'Copy output to clipboard (ignores output arg)', false)
    .version('1.0.0');

// init 명령어 추가
program
    .command('init')
    .description(`Create a default ignore pattern file

Examples:
  $ codemerger init                    # Create .mergeignore file
  $ codemerger init custom-ignore.txt  # Create with custom name

Included Pattern Rules:
  - System files (.DS_Store, Thumbs.db)
  - Node modules and logs
  - IDE settings
  - Build outputs
  - Environment files
  - Temporary files
  - Binary and media files
  - Other common excludes`)
    .argument('[filename]', 'Ignore file name (default: .mergeignore)', '.mergeignore')
    .action((filename) => {
        const filePath = path.resolve(filename);
        createSampleIgnore(filePath);
    });

// 메인 명령어 action 추가
program.action((folder, output, options) => {
    const folderPath = path.resolve(folder);
    const useClipboard = options.clipboard || !output;
    const resultPath = output ? path.resolve(output) : 'clipboard';

    // ignore 패턴 불러오기
    let ig = ignore();
    if (options.ignore) {
        ig = loadIgnorePatterns(path.resolve(options.ignore));
    }

    if (options.verbose) {
        console.log(chalk.green(`Target folder: ${folderPath}`));
        console.log(chalk.green(`Output target: ${useClipboard ? 'clipboard' : resultPath}`));
        if (options.ignore) {
            console.log(chalk.green(`Ignore pattern file: ${options.ignore}`));
        }
        console.log('');
    }

    mergeCodes(folderPath, resultPath, ig, options.verbose, useClipboard);
});

program.parse(process.argv);
