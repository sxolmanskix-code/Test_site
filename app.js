'use strict';

const STORAGE_KEY = 'po-poryadku.tasks.v1';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const formError = document.querySelector('#form-error');
let tasks = [];
let filter = 'all';
let storageReadable = true;

function storageWarning(message) {
  const warning = document.querySelector('#storage-error');
  warning.textContent = message;
  warning.hidden = false;
  document.querySelector('#save-note').textContent = 'Сохранение недоступно';
}

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  const saved = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(saved) || saved.some(task => !task || typeof task.id !== 'string' || typeof task.text !== 'string' || !task.text.trim() || typeof task.completed !== 'boolean') || new Set(saved.map(task => task.id)).size !== saved.length) {
    throw new Error('Invalid saved tasks');
  }
  tasks = saved;
} catch {
  storageReadable = false;
  storageWarning('Не удалось прочитать сохранённый список. Новые задачи будут доступны только до перезагрузки. Прежние данные не перезаписаны.');
}

function save() {
  if (!storageReadable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    document.querySelector('#storage-error').hidden = true;
    document.querySelector('#save-note').textContent = 'Сохраняются в этом браузере';
  } catch {
    storageWarning('Не удалось сохранить изменения. Они могут потеряться при перезагрузке. Проверьте, разрешено ли браузеру хранить данные сайта.');
  }
}

function announce(message) {
  document.querySelector('#announcement').textContent = message;
}

function render() {
  const completed = tasks.filter(task => task.completed).length;
  document.querySelector('#count-all').textContent = tasks.length;
  document.querySelector('#count-active').textContent = tasks.length - completed;
  document.querySelector('#count-completed').textContent = completed;
  const visible = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  list.replaceChildren();
  for (const task of visible) {
    const row = document.createElement('li');
    row.className = `task${task.completed ? ' done' : ''}`;
    row.dataset.id = task.id;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.dataset.action = 'toggle';
    const text = document.createElement('span');
    text.className = 'task-text';
    // User input stays text, never executable HTML.
    text.textContent = task.text;
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.dataset.action = 'delete';
    remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
    remove.title = 'Удалить задачу';
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg>';
    row.append(label, remove);
    list.append(row);
  }
  document.querySelector('#empty-state').hidden = visible.length > 0;
  const messages = tasks.length === 0 ? ['Здесь начинается порядок', 'Добавьте первую задачу — и сделайте шаг к своим планам.'] : filter === 'active' ? ['Всё сделано. Вы молодец!', 'Можно выдохнуть или добавить новую задачу.'] : ['Здесь будут ваши победы', 'Отметьте выполненную задачу — она появится здесь.'];
  document.querySelector('#empty-title').textContent = messages[0];
  document.querySelector('#empty-description').textContent = messages[1];
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector('#progress-label').textContent = tasks.length ? `Выполнено ${completed} из ${tasks.length}` : 'Всё начинается с одной задачи';
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', percent);
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', button.dataset.filter === filter));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    formError.textContent = 'Введите название задачи — одних пробелов недостаточно.';
    formError.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'form-error');
    input.focus();
    return;
  }
  tasks.unshift({id: crypto.randomUUID(), text, completed: false});
  save();
  filter = 'all';
  render();
  form.reset();
  input.focus();
  announce('Задача добавлена.');
});
input.addEventListener('input', () => {
  formError.hidden = true;
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
});

list.addEventListener('change', event => {
  if (event.target.dataset.action !== 'toggle') return;
  const row = event.target.closest('[data-id]');
  const task = tasks.find(task => task.id === row.dataset.id);
  task.completed = event.target.checked;
  const index = [...list.children].indexOf(row);
  save();
  render();
  const sameRow = [...list.children].find(item => item.dataset.id === task.id);
  (sameRow?.querySelector('input') || list.children[Math.min(index, list.children.length - 1)]?.querySelector('input') || input).focus();
  announce(task.completed ? 'Задача выполнена.' : 'Задача возвращена в работу.');
});

list.addEventListener('click', event => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const row = button.closest('[data-id]');
  const index = [...list.children].indexOf(row);
  tasks = tasks.filter(task => task.id !== row.dataset.id);
  save();
  render();
  (list.children[Math.min(index, list.children.length - 1)]?.querySelector('button') || input).focus();
  announce('Задача удалена.');
});

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  render();
}));

render();
