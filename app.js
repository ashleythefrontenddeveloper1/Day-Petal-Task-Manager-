'use strict';

const STORAGE_KEY = 'daypetal.tasks.v1';
const CATEGORIES = ['Personal', 'Work', 'Study', 'Wellness', 'Other'];
const STATUSES = ['todo', 'progress', 'done'];
const STATUS_LABELS = { todo: 'To do', progress: 'In progress', done: 'Done' };

const elements = {
  board: document.getElementById('task-board'),
  dialog: document.getElementById('task-dialog'),
  form: document.getElementById('task-form'),
  title: document.getElementById('task-title'),
  description: document.getElementById('task-description'),
  category: document.getElementById('task-category'),
  status: document.getElementById('task-status'),
  dueDate: document.getElementById('task-due-date'),
  priority: document.getElementById('task-priority'),
  id: document.getElementById('task-id'),
  error: document.getElementById('form-error'),
  search: document.getElementById('search-input'),
  categoryFilter: document.getElementById('category-filter'),
  sort: document.getElementById('sort-select'),
  activeFilterRow: document.getElementById('active-filter-row'),
  activeFilterText: document.getElementById('active-filter-text'),
  toast: document.getElementById('toast')
};

let tasks = loadTasks();
let quickFilter = 'all';
let categoryNavFilter = 'all';
let draggedTaskId = null;
let toastTimer = null;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  const date = dateFromInput(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStarterTasks() {
  const today = localDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const dayAfter = (date) => localDateString(date);
  return [
    {
      id: makeId(), title: 'Plan a lovely weekend', description: 'Make a little list of things that sound fun.', category: 'Personal', status: 'todo', dueDate: dayAfter(inThreeDays), priority: 'low', createdAt: Date.now() - 3000
    },
    {
      id: makeId(), title: 'Finish the portfolio homepage', description: 'Polish the layout and check it on mobile.', category: 'Study', status: 'progress', dueDate: dayAfter(tomorrow), priority: 'high', createdAt: Date.now() - 2000
    },
    {
      id: makeId(), title: 'Take a screen break', description: 'A few minutes away from the screen can help.', category: 'Wellness', status: 'todo', dueDate: today, priority: 'medium', createdAt: Date.now() - 1000
    },
    {
      id: makeId(), title: 'Organise project notes', description: '', category: 'Work', status: 'done', dueDate: '', priority: 'medium', createdAt: Date.now()
    }
  ];
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      const starterTasks = getStarterTasks();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(starterTasks));
      return starterTasks;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTask).map(task => ({
      ...task,
      description: typeof task.description === 'string' ? task.description : '',
      dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
      priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium'
    }));
  } catch (error) {
    console.warn('Daypetal could not load saved tasks:', error);
    return [];
  }
}

function isValidTask(task) {
  return task && typeof task.id === 'string' && typeof task.title === 'string' &&
    CATEGORIES.includes(task.category) && STATUSES.includes(task.status);
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Daypetal could not save tasks:', error);
    showToast('Could not save changes in this browser.');
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2400);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function getDueState(task) {
  if (!task.dueDate || task.status === 'done') return 'normal';
  const today = localDateString();
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  return 'normal';
}

function getVisibleTasks() {
  const searchTerm = elements.search.value.trim().toLowerCase();
  const selectedCategory = categoryNavFilter !== 'all' ? categoryNavFilter : elements.categoryFilter.value;
  let visible = tasks.filter(task => {
    const matchesQuick = quickFilter === 'all' ||
      (quickFilter === 'today' && task.dueDate === localDateString() && task.status !== 'done') ||
      (quickFilter === 'upcoming' && task.dueDate > localDateString() && task.status !== 'done') ||
      (quickFilter === 'completed' && task.status === 'done');
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    const matchesSearch = !searchTerm || `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(searchTerm);
    return matchesQuick && matchesCategory && matchesSearch;
  });

  const sortBy = elements.sort.value;
  visible.sort((a, b) => {
    if (sortBy === 'due') return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || b.createdAt - a.createdAt;
    if (sortBy === 'priority') {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] || b.createdAt - a.createdAt;
    }
    if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
    return b.createdAt - a.createdAt;
  });
  return visible;
}

function renderTask(task) {
  const categoryClass = task.category.toLowerCase();
  const dueState = getDueState(task);
  let dueText = 'No due date';
  if (task.dueDate) {
    if (dueState === 'overdue') dueText = `Overdue · ${formatDate(task.dueDate)}`;
    else if (dueState === 'today') dueText = 'Due today';
    else dueText = `Due ${formatDate(task.dueDate)}`;
  }
  const description = task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : '';
  return `
    <article class="task-card ${task.status === 'done' ? 'is-done' : ''}" draggable="true" data-task-id="${escapeHTML(task.id)}" tabindex="0" aria-label="${escapeHTML(task.title)}. ${STATUS_LABELS[task.status]}. Press Enter to edit.">
      <div class="task-card-top">
        <span class="category-pill ${categoryClass}">${escapeHTML(task.category)}</span>
        <span class="priority ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
      </div>
      <h4 class="task-title">${escapeHTML(task.title)}</h4>
      ${description}
      <div class="task-card-bottom">
        <span class="due-date ${dueState} ${task.dueDate ? '' : 'no-date'}"><span class="due-icon">${task.dueDate ? '◷' : '—'}</span>${escapeHTML(dueText)}</span>
        <div class="card-actions">
          <button class="card-action edit" type="button" data-action="edit" data-id="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.title)}" title="Edit">✎</button>
          <button class="card-action delete" type="button" data-action="delete" data-id="${escapeHTML(task.id)}" aria-label="Delete ${escapeHTML(task.title)}" title="Delete">×</button>
        </div>
      </div>
    </article>`;
}

function getEmptyMessage(status, visibleCount) {
  if (visibleCount === 0 && (elements.search.value.trim() || quickFilter !== 'all' || categoryNavFilter !== 'all' || elements.categoryFilter.value !== 'all')) {
    return '<div class="empty-state"><div class="empty-illustration">⌕</div><strong>No matching tasks</strong><span>Try changing your search or filters.</span></div>';
  }
  const messages = {
    todo: ['Nothing waiting here', 'Add a task whenever something comes to mind.'],
    progress: ['A clear little space', 'Move a task here when you start working on it.'],
    done: ['Your wins will live here', 'Finish a task or move one here to celebrate it.']
  };
  return `<div class="empty-state"><div class="empty-illustration">✿</div><strong>${messages[status][0]}</strong><span>${messages[status][1]}</span></div>`;
}

function render() {
  const visibleTasks = getVisibleTasks();
  for (const status of STATUSES) {
    const tasksForColumn = visibleTasks.filter(task => task.status === status);
    const list = document.getElementById(`list-${status}`);
    document.getElementById(`count-${status}`).textContent = tasksForColumn.length;
    list.innerHTML = tasksForColumn.length ? tasksForColumn.map(renderTask).join('') : getEmptyMessage(status, visibleTasks.length);
  }

  const total = tasks.length;
  const completed = tasks.filter(task => task.status === 'done').length;
  const inProgress = tasks.filter(task => task.status === 'progress').length;
  const dueToday = tasks.filter(task => task.dueDate === localDateString() && task.status !== 'done').length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-progress').textContent = inProgress;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-today').textContent = dueToday;
  document.getElementById('nav-all-count').textContent = total;
  document.getElementById('completion-message').textContent = total && completed === total ? 'You did it all!' : 'You’ve got this';
  updateViewLabels();
}

function updateViewLabels() {
  const quickLabels = { all: 'All tasks', today: 'Due today', upcoming: 'Upcoming', completed: 'Completed' };
  let label = quickLabels[quickFilter];
  if (categoryNavFilter !== 'all') label = categoryNavFilter;
  else if (elements.categoryFilter.value !== 'all') label = elements.categoryFilter.value;
  document.getElementById('breadcrumb-current').textContent = label;
  document.getElementById('page-heading').innerHTML = quickFilter === 'all' && categoryNavFilter === 'all' && elements.categoryFilter.value === 'all'
    ? 'Make today <span>a good one.</span>'
    : `${escapeHTML(label)} <span>at a glance.</span>`;
  document.querySelectorAll('[data-quick-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.quickFilter === quickFilter && categoryNavFilter === 'all');
  });
  document.querySelectorAll('[data-category-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.categoryFilter === categoryNavFilter && categoryNavFilter !== 'all');
  });
  const hasFilters = quickFilter !== 'all' || categoryNavFilter !== 'all' || elements.categoryFilter.value !== 'all' || elements.search.value.trim();
  elements.activeFilterRow.hidden = !hasFilters;
  if (hasFilters) {
    const details = [];
    if (quickFilter !== 'all') details.push(quickLabels[quickFilter]);
    if (categoryNavFilter !== 'all') details.push(categoryNavFilter);
    else if (elements.categoryFilter.value !== 'all') details.push(elements.categoryFilter.value);
    if (elements.search.value.trim()) details.push(`“${elements.search.value.trim()}”`);
    elements.activeFilterText.textContent = `Showing: ${details.join(' · ')}`;
  }
}

function openDialog(task = null, presetStatus = 'todo') {
  elements.form.reset();
  elements.error.textContent = '';
  elements.id.value = task ? task.id : '';
  elements.title.value = task ? task.title : '';
  elements.description.value = task ? task.description : '';
  elements.category.value = task ? task.category : 'Personal';
  elements.status.value = task ? task.status : presetStatus;
  elements.dueDate.value = task ? task.dueDate : '';
  elements.priority.value = task ? task.priority : 'medium';
  document.getElementById('dialog-title').textContent = task ? 'Edit your task' : 'Add a task';
  document.getElementById('save-task-button').innerHTML = task ? 'Save changes <span aria-hidden="true">✧</span>' : 'Save task <span aria-hidden="true">✧</span>';
  elements.dialog.showModal();
  window.setTimeout(() => elements.title.focus(), 30);
}

function closeDialog() {
  elements.dialog.close();
  elements.error.textContent = '';
}

function handleFormSubmit(event) {
  event.preventDefault();
  const title = elements.title.value.trim();
  if (!title) {
    elements.error.textContent = 'Give your task a name before saving.';
    elements.title.focus();
    return;
  }
  const existingId = elements.id.value;
  const existing = tasks.find(task => task.id === existingId);
  const task = {
    id: existingId || makeId(),
    title,
    description: elements.description.value.trim(),
    category: CATEGORIES.includes(elements.category.value) ? elements.category.value : 'Other',
    status: STATUSES.includes(elements.status.value) ? elements.status.value : 'todo',
    dueDate: elements.dueDate.value,
    priority: ['low', 'medium', 'high'].includes(elements.priority.value) ? elements.priority.value : 'medium',
    createdAt: existing ? existing.createdAt : Date.now()
  };
  if (existing) {
    tasks = tasks.map(item => item.id === existingId ? task : item);
    showToast('Your task has been updated ✧');
  } else {
    tasks.unshift(task);
    showToast('A new little plan has been added ✿');
  }
  saveTasks();
  closeDialog();
  render();
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
  tasks = tasks.filter(item => item.id !== id);
  saveTasks();
  render();
  showToast('Task deleted.');
}

function moveTask(id, status) {
  if (!STATUSES.includes(status)) return;
  const task = tasks.find(item => item.id === id);
  if (!task || task.status === status) return;
  task.status = status;
  saveTasks();
  render();
  showToast(`Moved to ${STATUS_LABELS[status].toLowerCase()} ✧`);
}

function clearCompleted() {
  const completedCount = tasks.filter(task => task.status === 'done').length;
  if (!completedCount) {
    showToast('No completed tasks to clear just yet.');
    return;
  }
  if (!window.confirm(`Remove all ${completedCount} completed task${completedCount === 1 ? '' : 's'}?`)) return;
  tasks = tasks.filter(task => task.status !== 'done');
  saveTasks();
  render();
  showToast('Completed tasks cleared.');
}

function resetFilters() {
  quickFilter = 'all';
  categoryNavFilter = 'all';
  elements.categoryFilter.value = 'all';
  elements.search.value = '';
  render();
}

function setupEvents() {
  document.getElementById('add-task-button').addEventListener('click', () => openDialog());
  document.querySelectorAll('[data-add-status]').forEach(button => button.addEventListener('click', () => openDialog(null, button.dataset.addStatus)));
  document.getElementById('close-dialog-button').addEventListener('click', closeDialog);
  document.getElementById('cancel-dialog-button').addEventListener('click', closeDialog);
  elements.form.addEventListener('submit', handleFormSubmit);
  elements.search.addEventListener('input', render);
  elements.categoryFilter.addEventListener('change', () => { categoryNavFilter = 'all'; render(); });
  elements.sort.addEventListener('change', render);
  document.getElementById('clear-completed-button').addEventListener('click', clearCompleted);
  document.getElementById('reset-filters-button').addEventListener('click', resetFilters);

  document.querySelectorAll('[data-quick-filter]').forEach(button => button.addEventListener('click', () => {
    quickFilter = button.dataset.quickFilter;
    categoryNavFilter = 'all';
    elements.categoryFilter.value = 'all';
    render();
  }));
  document.querySelectorAll('[data-category-filter]').forEach(button => button.addEventListener('click', () => {
    quickFilter = 'all';
    categoryNavFilter = categoryNavFilter === button.dataset.categoryFilter ? 'all' : button.dataset.categoryFilter;
    elements.categoryFilter.value = 'all';
    render();
  }));

  elements.board.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const id = actionButton.dataset.id;
    if (actionButton.dataset.action === 'edit') {
      const task = tasks.find(item => item.id === id);
      if (task) openDialog(task);
    } else if (actionButton.dataset.action === 'delete') {
      deleteTask(id);
    }
  });
  elements.board.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.task-card')) {
      event.preventDefault();
      const task = tasks.find(item => item.id === event.target.dataset.taskId);
      if (task) openDialog(task);
    }
  });

  elements.board.addEventListener('dragstart', event => {
    const card = event.target.closest('.task-card');
    if (!card) return;
    draggedTaskId = card.dataset.taskId;
    card.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedTaskId);
    }
  });
  elements.board.addEventListener('dragend', event => {
    const card = event.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.task-column.drag-over').forEach(column => column.classList.remove('drag-over'));
    draggedTaskId = null;
  });
  document.querySelectorAll('[data-dropzone]').forEach(zone => {
    zone.addEventListener('dragover', event => {
      event.preventDefault();
      const column = zone.closest('.task-column');
      if (column) column.classList.add('drag-over');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    zone.addEventListener('dragleave', event => {
      if (!zone.contains(event.relatedTarget)) zone.closest('.task-column')?.classList.remove('drag-over');
    });
    zone.addEventListener('drop', event => {
      event.preventDefault();
      const column = zone.closest('.task-column');
      if (column) column.classList.remove('drag-over');
      const id = event.dataTransfer?.getData('text/plain') || draggedTaskId;
      if (id) moveTask(id, zone.dataset.dropzone);
    });
  });

  elements.dialog.addEventListener('click', event => {
    if (event.target === elements.dialog) closeDialog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !elements.dialog.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === 'Escape' && elements.dialog.open) closeDialog();
  });
}

function initialise() {
  const now = new Date();
  document.getElementById('today-date').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric'
  }).format(now);
  setupEvents();
  render();
}

initialise();
