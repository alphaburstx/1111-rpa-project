const categories = [
  { id: 'image', label: '图片', children: [
    { id: 'poster', label: '海报' },
    { id: 'product', label: '商品图', children: [
      { id: 'studio', label: '棚拍' },
      { id: 'scene', label: '场景' },
    ] },
  ] },
  { id: 'video', label: '视频', children: [
    { id: 'trailer', label: '预告' },
    { id: 'review', label: '评测', children: [
      { id: 'studio', label: '棚拍' },
      { id: 'field', label: '外拍', children: [
        { id: 'indoor', label: '室内' },
        { id: 'outdoor', label: '户外' },
      ] },
    ] },
  ] },
  { id: 'audio', label: '音频', children: [
    { id: 'voice', label: '人声' },
    { id: 'music', label: '配乐' },
  ] },
];

const filterGroups = {
  creator: {
    label: '创作者',
    dimensions: {
      format: { label: '形式', options: { short: '短篇', long: '长篇' } },
      style: { label: '风格', options: { documentary: '纪实', studio: '棚拍' } },
    },
  },
  audience: {
    label: '受众',
    dimensions: {
      age: { label: '年龄', options: { adult: '成人', teen: '青少年' } },
      region: { label: '地区', options: { north: '北区', south: '南区', west: '西区' } },
    },
  },
  source: {
    label: '来源',
    dimensions: {
      license: { label: '许可', options: { open: '开放', review: '待审' } },
    },
  },
};

const categoryPicker = document.querySelector('#category-picker');
const columns = document.querySelector('#columns');
const categorySelection = document.querySelector('#category-selection');
const filterPicker = document.querySelector('#filter-picker');
const filterHeading = document.querySelector('#filter-heading');
const dimensions = document.querySelector('#dimensions');
const filterStatus = document.querySelector('#filter-status');
const options = document.querySelector('#options');
const filterSelection = document.querySelector('#filter-selection');

let activePath = [];
let categoryTimer;
let filterTimer;
let activeGroup = '';
let faultSpent = false;
const shouldInjectFault = new URLSearchParams(location.search).get('fault') === '1';
const selected = new Map();

function closeCategories() {
  clearTimeout(categoryTimer);
  activePath = [];
  columns.replaceChildren();
  columns.dataset.state = 'ready';
  categoryPicker.hidden = true;
}

function closeFilters() {
  clearTimeout(filterTimer);
  activeGroup = '';
  dimensions.replaceChildren();
  options.replaceChildren();
  filterStatus.textContent = '';
  filterStatus.dataset.state = 'idle';
  filterPicker.hidden = true;
}

function renderCategories() {
  const levels = [categories, ...activePath.map(node => node.children)];
  const newColumns = levels.map((nodes, depth) => {
    const column = document.createElement('div');
    column.dataset.level = String(depth);
    column.dataset.parentPath = activePath.slice(0, depth).map(node => node.id).join('/');
    for (const node of nodes) {
      const item = document.createElement('button');
      item.type = 'button';
      item.dataset.node = node.id;
      item.dataset.branch = String(Boolean(node.children));
      item.textContent = node.label + (node.children ? ' ›' : '');
      if (activePath[depth] === node) item.setAttribute('aria-current', 'true');
      if (node.children) {
        item.addEventListener('mouseenter', () => {
          if (activePath[depth] === node) {
            clearTimeout(categoryTimer);
            columns.dataset.state = 'ready';
            return;
          }
          clearTimeout(categoryTimer);
          columns.dataset.state = 'loading';
          categoryTimer = setTimeout(() => {
            activePath = [...activePath.slice(0, depth), node];
            renderCategories();
          }, 90 + depth * 35);
        });
      } else {
        item.addEventListener('click', () => {
          const path = [...activePath.slice(0, depth), node];
          categorySelection.dataset.path = path.map(entry => entry.id).join('/');
          categorySelection.textContent = path.map(entry => entry.label).join(' / ');
          closeCategories();
        });
      }
      column.append(item);
    }
    return column;
  });
  columns.replaceChildren(...newColumns);
  columns.dataset.state = 'ready';
}

function renderSelections() {
  const entries = [];
  for (const [key, labels] of selected) {
    if (labels.size === 0) continue;
    const item = document.createElement('li');
    const [group, dimension] = key.split('/');
    item.dataset.group = group;
    item.dataset.dimension = dimension;
    item.dataset.options = [...labels].sort().join(',');
    const definition = filterGroups[group].dimensions[dimension];
    item.textContent = `${filterGroups[group].label} / ${definition.label}：${[...labels].map(id => definition.options[id]).join('、')}`;
    entries.push(item);
  }
  filterSelection.replaceChildren(...entries);
}

function showDimension(dimension) {
  if (filterStatus.dataset.state === 'failed') return;
  clearTimeout(filterTimer);
  const group = activeGroup;
  const definition = filterGroups[group].dimensions[dimension];
  const key = `${group}/${dimension}`;
  options.replaceChildren();
  filterStatus.dataset.state = 'loading';
  filterStatus.dataset.dimension = dimension;
  filterStatus.textContent = '正在加载选项';
  for (const button of dimensions.children) {
    button.setAttribute('aria-current', String(button.dataset.dimension === dimension));
  }

  filterTimer = setTimeout(() => {
    if (shouldInjectFault && !faultSpent && group === 'audience') {
      faultSpent = true;
      filterStatus.dataset.state = 'failed';
      filterStatus.textContent = '选项加载失败，请关闭筛选后重试';
      return;
    }
    const current = selected.get(key) ?? new Set();
    for (const [id, label] of Object.entries(definition.options)) {
      const control = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.option = id;
      input.checked = current.has(id);
      input.addEventListener('change', () => {
        if (input.checked) current.add(id);
        else current.delete(id);
        selected.set(key, current);
        renderSelections();
      });
      control.append(input, label);
      options.append(control);
    }
    filterStatus.dataset.state = 'ready';
    filterStatus.textContent = '选项已加载';
  }, 120);
}

function openGroup(id) {
  closeCategories();
  closeFilters();
  activeGroup = id;
  const group = filterGroups[id];
  filterPicker.hidden = false;
  filterHeading.textContent = group.label;
  for (const [dimension, definition] of Object.entries(group.dimensions)) {
    const tab = document.createElement('button');
    tab.dataset.dimension = dimension;
    tab.textContent = definition.label;
    tab.addEventListener('click', () => showDimension(dimension));
    dimensions.append(tab);
  }
  showDimension(Object.keys(group.dimensions)[0]);
}

document.querySelector('[data-category-toggle]').addEventListener('click', () => {
  closeFilters();
  closeCategories();
  categoryPicker.hidden = false;
  renderCategories();
});
document.querySelector('[data-category-close]').addEventListener('click', closeCategories);
document.querySelector('[data-filter-close]').addEventListener('click', closeFilters);
for (const button of document.querySelectorAll('[data-filter-group]')) {
  button.addEventListener('click', () => openGroup(button.dataset.filterGroup));
}
