# 素材目录采集与规则回放

本工程通过 Playwright 操作本地素材目录站。采集器负责从页面导出类目和筛选选项，也负责把保存的规则应用回页面。测试站使用固定合成数据，通过异步方式重建菜单和加载筛选选项。

## 运行

需要 Node.js 22.18 或更新版本，以及 Google Chrome。本机可用 `nvm use 22.18.0` 切换版本。安装依赖后执行：

```bash
npm ci
npm run check
npm run catalog
npm run catalog -- --fault
npm run replay -- rules/legacy.json
npm run replay -- rules/composite.json
```

目录和回放命令各自启动临时测试站。添加 `--headed --hold` 可以观察浏览器，按回车后结束。若使用 Playwright Chromium，先运行 `npx playwright-core install chromium`，再用 `BROWSER_CHANNEL=chromium` 执行命令。

手动操作可用 `npm start`，然后打开终端打印的本地地址。给 URL 加 `?fault=1`，首次加载受众组的选项时会出现一次模拟失败。

## 输入与输出

- `src/collector.ts` 是采集和回放的入口。`public/` 是用于复现交互的测试站。
- 目录输出有 `categoryPaths` 和 `groups`。前者是由类目 ID 组成的完整叶子路径，后者按组和子维度保存选项 ID。
- 旧规则的类目字段为 `category`，新规则为 `categoryPath`。两者都可提供由 `group`、`dimension`、`options` 组成的筛选项。回放结果从页面「当前选择」区域读取。
