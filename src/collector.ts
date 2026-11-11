import type { Page } from 'playwright-core';

type Filter = { group: string; dimension: string; options: string[] };
export type Rule =
  | { category: string[]; filters?: Filter[] }
  | { categoryPath: string[]; filters?: Filter[] };

export type Catalog = {
  categoryPaths: string[][];
  groups: Record<string, Record<string, string[]>>;
};

function nodesAt(page: Page, level: number) {
  return page.locator(`[data-level="${level}"] [data-node]`);
}

async function attributeValues(page: Page, selector: string, attribute: string) {
  return page.locator(selector).evaluateAll(
    (elements, name) => elements.map(element => element.getAttribute(name) ?? ''),
    attribute,
  );
}

async function waitForOptions(page: Page) {
  const status = page.locator('#filter-status:is([data-state="ready"], [data-state="failed"])');
  await status.waitFor();
  return await status.getAttribute('data-state') === 'ready';
}

export async function exportCatalog(page: Page): Promise<Catalog> {
  const catalog: Catalog = { categoryPaths: [], groups: {} };
  await page.locator('[data-category-toggle]').click();
  const roots = await attributeValues(page, '[data-level="0"] [data-node]', 'data-node');
  for (const root of roots) {
    await nodesAt(page, 0).and(page.locator(`[data-node="${root}"]`)).hover();
    await page.locator(`[data-level="1"][data-parent-path="${root}"]`).waitFor();
    const children = await attributeValues(page, '[data-level="1"] [data-node]', 'data-node');
    catalog.categoryPaths.push(...children.map(child => [root, child]));
  }
  await page.locator('[data-category-close]').click();

  const groups = await attributeValues(page, '[data-filter-group]', 'data-filter-group');
  for (const group of groups) {
    await page.locator(`[data-filter-group="${group}"]`).click();
    if (await waitForOptions(page)) {
      const dimension = await page.locator('#filter-status').getAttribute('data-dimension');
      const options = await attributeValues(page, '#options [data-option]', 'data-option');
      if (dimension) catalog.groups[group] = { [dimension]: options };
    }
    await page.locator('[data-filter-close]').click();
  }
  return catalog;
}

export async function replayRule(page: Page, rule: Rule) {
  const categoryPath = 'categoryPath' in rule ? rule.categoryPath : rule.category;
  const [root, child] = categoryPath;
  await page.locator('[data-category-toggle]').click();
  await nodesAt(page, 0).and(page.locator(`[data-node="${root}"]`)).hover();
  await page.locator(`[data-level="1"][data-parent-path="${root}"]`).waitFor();
  await nodesAt(page, 1).and(page.locator(`[data-node="${child}"]`)).click();
  if (await page.locator('#category-picker').isVisible()) {
    await page.locator('[data-category-close]').click();
  }

  const filter = rule.filters?.[0];
  if (filter) {
    await page.locator(`[data-filter-group="${filter.group}"]`).click();
    if (await waitForOptions(page)) {
      for (const option of filter.options) {
        await page.locator(`#options [data-option="${option}"]`).check();
      }
    }
    await page.locator('[data-filter-close]').click();
  }
}

export async function readSelection(page: Page) {
  const path = await page.locator('#category-selection').getAttribute('data-path');
  const filters = await page.locator('#filter-selection li').evaluateAll(elements =>
    elements.map(element => ({
      group: element.getAttribute('data-group'),
      dimension: element.getAttribute('data-dimension'),
      options: element.getAttribute('data-options')?.split(',') ?? [],
    })),
  );
  return { categoryPath: path?.split('/') ?? null, filters };
}
