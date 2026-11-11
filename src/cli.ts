import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { chromium } from 'playwright-core';
import { exportCatalog, readSelection, replayRule } from './collector.ts';
import type { Rule } from './collector.ts';
import { startFixture } from './fixture.mjs';

const [command, ...args] = process.argv.slice(2);
const positional = args.filter(arg => !arg.startsWith('--'));
if (
  (command !== 'catalog' && command !== 'replay') ||
  positional.length !== (command === 'replay' ? 1 : 0) ||
  args.some(arg => arg.startsWith('--') && !['--fault', '--headed', '--hold'].includes(arg))
) {
  console.error('用法：catalog [--fault] [--headed] [--hold] 或 replay <规则文件> [--fault] [--headed] [--hold]');
  process.exit(2);
}

const rule = command === 'replay'
  ? JSON.parse(await readFile(positional[0], 'utf8')) as Rule
  : undefined;
const fixture = await startFixture();
try {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL === 'chromium' ? undefined : 'chrome',
    headless: !args.includes('--headed'),
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(3000);
    await page.goto(fixture.url + (args.includes('--fault') ? '?fault=1' : ''));
    if (rule) await replayRule(page, rule);
    const result = rule ? await readSelection(page) : await exportCatalog(page);
    console.log(JSON.stringify(result, null, 2));
    if (args.includes('--hold')) {
      const input = createInterface({ input: process.stdin, output: process.stderr });
      try {
        await input.question('按回车关闭浏览器：');
      } finally {
        input.close();
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await fixture.close();
}
