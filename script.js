// Task management
let tasks = {
  start: [],
  todo: [],
  inprogress: [],
  completed: []
};

// Current filter
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const board = document.getElementById('board');
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const taskColumnInput = document.getElementById('taskColumn');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const taskDueDateInput = document.getElementById('taskDueDate');
const taskPriorityInput = document.getElementById('taskPriority');
const taskLabelInput = document.getElementById('taskLabel');
const priorityOptions = document.querySelectorAll('.priority-option');
const saveTaskBtn = document.getElementById('saveTask');
const deleteTaskBtn = document.getElementById('deleteTask');
const cancelTaskBtn = document.getElementById('cancelTask');
const modalCloseBtn = document.getElementById('modalClose');
const themeToggle = document.getElementById('themeToggle');
const addTaskBtn = document.getElementById('addTaskBtn');
const sortButtons = document.querySelectorAll('.sort-button');
const searchInput = document.getElementById('searchInput');
const filterLinks = document.querySelectorAll('.sidebar-link[data-filter]');
const labelItems = document.querySelectorAll('.label-item');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const currentViewTitle = document.getElementById('currentView');

// Theme management
function loadTheme() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function toggleTheme() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
}

// Task rendering
function createTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.classList.add('task');
  taskElement.setAttribute('draggable', 'true');
  taskElement.setAttribute('data-id', task.id);
  
  // Add priority class
  if (task.priority) {
    taskElement.classList.add(`priority-${task.priority}`);
  }
  
  // Add label data attribute
  if (task.label) {
    taskElement.setAttribute('data-label', task.label);
  }
  
  // Check if task is overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  
  if (dueDate && dueDate < today && task.column !== 'completed') {
    taskElement.classList.add('overdue');
  }
  
  if (task.column === 'completed') {
    taskElement.classList.add('completed');
  }
  
  // Get priority text
  const priorityText = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '';
  
  taskElement.innerHTML = `
    <div class="task-header">
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <div class="task-actions">
        <button class="task-action edit-task" title="Edit Task">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
    </div>
    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
    <div class="task-meta">
      ${task.dueDate ? `
        <div class="task-due-date">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${formatDate(task.dueDate)}
        </div>
      ` : ''}
      ${task.priority ? `
        <div class="task-priority ${task.priority}">
          <span class="priority-indicator"></span>
          ${priorityText}
        </div>
      ` : ''}
    </div>
    ${task.label ? `<div class="task-label" style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">${getLabelName(task.label)}</div>` : ''}
    <div class="completed-checkmark">✓</div>
  `;
  
  // Add event listeners
  taskElement.addEventListener('dragstart', handleDragStart);
  taskElement.addEventListener('dragend', handleDragEnd);
  
  const editBtn = taskElement.querySelector('.edit-task');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditTaskModal(task);
  });
  
  return taskElement;
}

function getLabelName(labelValue) {
  const labels = {
    'work': 'Work',
    'personal': 'Personal',
    'study': 'Study',
    'health': 'Health'
  };
  return labels[labelValue] || labelValue;
}

function renderTasks() {
  // Clear all task containers
  document.querySelectorAll('.tasks').forEach(container => {
    container.innerHTML = '';
  });
  
  // Get all tasks for counting
  const allTasks = getAllTasks();
  
  // Update counts
  updateCounts(allTasks);
  updateTracker();
  
  // Filter tasks based on current filter and search query
  const filteredTasks = filterTasks(allTasks);
  
  // Group filtered tasks by column
  const groupedTasks = groupTasksByColumn(filteredTasks);
  
  // Render tasks for each column
  for (const column in tasks) {
    const tasksContainer = document.getElementById(`${column}-tasks`);
    const columnTasks = groupedTasks[column] || [];
    
    // Update column count
    const countElement = document.getElementById(`${column}-count`);
    countElement.textContent = columnTasks.length;
    
    // Render tasks or empty state
    if (columnTasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <p class="empty-state-text">No tasks here</p>
          <p class="empty-state-subtext">Add a task or drag one here</p>
        </div>
      `;
    } else {
      columnTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksContainer.appendChild(taskElement);
      });
    }
  }
}

function getAllTasks() {
  let allTasks = [];
  for (const column in tasks) {
    allTasks = allTasks.concat(tasks[column].map(task => ({...task, column})));
  }
  return allTasks;
}

function updateCounts(allTasks) {
  // Update all tasks count
  document.getElementById('all-count').textContent = allTasks.length;
  
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get date 7 days from now
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  // Count tasks for each filter
  const todayTasks = allTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate.toDateString() === today.toDateString();
  });
  
  const upcomingTasks = allTasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate > today && dueDate <= nextWeek;
  });
  
  const overdueTasks = allTasks.filter(task => {
    if (!task.dueDate || task.column === 'completed') return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
  });
  
  // Count tasks by priority
  const highPriorityTasks = allTasks.filter(task => task.priority === 'high');
  const mediumPriorityTasks = allTasks.filter(task => task.priority === 'medium');
  const lowPriorityTasks = allTasks.filter(task => task.priority === 'low');
  
  // Update counts in sidebar
  document.getElementById('today-count').textContent = todayTasks.length;
  document.getElementById('upcoming-count').textContent = upcomingTasks.length;
  document.getElementById('overdue-count').textContent = overdueTasks.length;
  document.getElementById('high-count').textContent = highPriorityTasks.length;
  document.getElementById('medium-count').textContent = mediumPriorityTasks.length;
  document.getElementById('low-count').textContent = lowPriorityTasks.length;
}

function updateTracker() {
  const allTasks = getAllTasks();
  const completed = allTasks.filter(task => task.column === 'completed').length;
  const total = allTasks.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Update text display
  const stats = document.getElementById('taskStats');
  if (stats) stats.textContent = `${completed} of ${total} tasks completed`;

  // Update progress bar width
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${percent}%`;
}

function filterTasks(allTasks) {
  // First apply search filter
  let filtered = allTasks;
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(task => 
      task.title.toLowerCase().includes(query) || 
      (task.description && task.description.toLowerCase().includes(query))
    );
  }
  
  // Then apply category filter
  switch (currentFilter) {
    case 'today':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
       return dueDate.toDateString() === today.toDateString();

      });
      break;
      
    case 'upcoming':
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate > currentDate && dueDate <= nextWeek;
      });
      break;
      
    case 'overdue':
      const today2 = new Date();
      today2.setHours(0, 0, 0, 0);
      filtered = filtered.filter(task => {
        if (!task.dueDate || task.column === 'completed') return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < today2;
      });
      break;
      
    case 'priority-high':
      filtered = filtered.filter(task => task.priority === 'high');
      break;
      
    case 'priority-medium':
      filtered = filtered.filter(task => task.priority === 'medium');
      break;
      
    case 'priority-low':
      filtered = filtered.filter(task => task.priority === 'low');
      break;
  }
  
  return filtered;
}

function groupTasksByColumn(filteredTasks) {
  const grouped = {
    start: [],
    todo: [],
    inprogress: [],
    completed: []
  };
  
  filteredTasks.forEach(task => {
    if (grouped[task.column]) {
      grouped[task.column].push(task);
    }
  });
  
  return grouped;
}

// Task operations
function addTask(title, description, dueDate, column, priority, label) {
  const newTask = {
    id: Date.now().toString(),
    title,
    description,
    dueDate,
    column,
    priority,
    label
  };
  
  tasks[column].push(newTask);
  saveTasks();
  renderTasks();
  return newTask;
}

function updateTask(id, title, description, dueDate, priority, label) {
  for (const column in tasks) {
    const taskIndex = tasks[column].findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      tasks[column][taskIndex].title = title;
      tasks[column][taskIndex].description = description;
      tasks[column][taskIndex].dueDate = dueDate;
      tasks[column][taskIndex].priority = priority;
      tasks[column][taskIndex].label = label;
      saveTasks();
      renderTasks();
      return tasks[column][taskIndex];
    }
  }
  return null;
}

function deleteTask(id) {
  for (const column in tasks) {
    const taskIndex = tasks[column].findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      tasks[column].splice(taskIndex, 1);
      saveTasks();
      renderTasks();
      return true;
    }
  }
  return false;
}

function moveTask(id, targetColumn) {
  let task = null;
  let sourceColumn = null;
  
  // Find the task
  for (const column in tasks) {
    const taskIndex = tasks[column].findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      task = tasks[column][taskIndex];
      sourceColumn = column;
      tasks[column].splice(taskIndex, 1);
      break;
    }
  }
  
  if (task) {
    // Add to target column
    tasks[targetColumn].push(task);
    
    // Add animation class if moving to completed
    if (targetColumn === 'completed' && sourceColumn !== 'completed') {
      setTimeout(() => {
        const taskElement = document.querySelector(`.task[data-id="${task.id}"]`);
        if (taskElement) {
          taskElement.classList.add('just-completed');
        }
      }, 50);
    }
    
    saveTasks();
    renderTasks();
    return task;
  }
  
  return null;
}

function sortTasksByDueDate(column) {
  tasks[column].sort((a, b) => {
    // Tasks without due dates go to the bottom
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  
  saveTasks();
  renderTasks();
}

// Modal operations
function openAddTaskModal() {
  modalTitle.textContent = 'Add Task';
  taskIdInput.value = '';
  taskColumnInput.value = 'todo'; // Default to "To Do" column
  taskTitleInput.value = '';
  taskDescriptionInput.value = '';
  taskDueDateInput.value = '';
  taskPriorityInput.value = 'medium';
  taskLabelInput.value = '';
  
  // Reset priority selection
  priorityOptions.forEach(option => {
    option.classList.remove('selected');
    if (option.getAttribute('data-priority') === 'medium') {
      option.classList.add('selected');
    }
  });
  
  deleteTaskBtn.style.display = 'none';
  
  openModal();
}

function openEditTaskModal(task) {
  modalTitle.textContent = 'Edit Task';
  taskIdInput.value = task.id;
  taskColumnInput.value = task.column;
  taskTitleInput.value = task.title;
  taskDescriptionInput.value = task.description || '';
  taskDueDateInput.value = task.dueDate || '';
  taskPriorityInput.value = task.priority || 'medium';
  taskLabelInput.value = task.label || '';
  
  // Set priority selection
  priorityOptions.forEach(option => {
    option.classList.remove('selected');
    if (option.getAttribute('data-priority') === task.priority) {
      option.classList.add('selected');
    }
  });
  
  deleteTaskBtn.style.display = 'block';
  
  openModal();
}

function openModal() {
  taskModal.classList.add('active');
  taskTitleInput.focus();
}

function closeModal() {
  taskModal.classList.remove('active');
  taskForm.reset();
}

// Drag and drop functionality
function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
  e.target.classList.add('dragging');
  
  // Add a slight delay to make the drag visual more apparent
  setTimeout(() => {
    e.target.style.opacity = '0.4';
  }, 0);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  e.target.style.opacity = '1';
  
  // Remove drag-over class from all columns
  document.querySelectorAll('.column').forEach(column => {
    column.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  const taskId = e.dataTransfer.getData('text/plain');
  const targetColumn = this.getAttribute('data-column');
  
  moveTask(taskId, targetColumn);
}

// Utility functions
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Local storage operations
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const savedTasks = localStorage.getItem('tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
  } else {
    // Add sample tasks if no tasks exist
    addTask('Welcome to TaskFlow', 'Drag this card to another column to get started', '2023-12-31', 'start', 'medium', 'work');
    addTask('Create your first task', 'Click the "+ Add Task" button at the top', null, 'todo', 'low', 'personal');
    addTask('Try dark mode', 'Click the theme toggle button in the header', null, 'inprogress', 'high', 'study');
    addTask('Sample completed task', 'This is how completed tasks look', '2023-12-01', 'completed', 'medium', 'health');
  }
}

// Event listeners
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Add task button
  addTaskBtn.addEventListener('click', openAddTaskModal);
  
  // Sort buttons
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      const column = button.getAttribute('data-column');
      sortTasksByDueDate(column);
    });
  });
  
  // Priority options
  priorityOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      priorityOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Update hidden input
      taskPriorityInput.value = option.getAttribute('data-priority');
    });
  });
  
  // Task form
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const dueDate = taskDueDateInput.value;
    const id = taskIdInput.value;
    const column = taskColumnInput.value;
    const priority = taskPriorityInput.value;
    const label = taskLabelInput.value;
    
    if (title) {
      if (id) {
        // Update existing task
        updateTask(id, title, description, dueDate, priority, label);
      } else {
        // Add new task
        addTask(title, description, dueDate, column, priority, label);
      }
      closeModal();
    }
  });
  
  // Delete task button
  deleteTaskBtn.addEventListener('click', () => {
    const id = taskIdInput.value;
    if (id) {
      deleteTask(id);
      closeModal();
    }
  });
  
  // Cancel and close buttons
  cancelTaskBtn.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
      closeModal();
    }
  });
  
  // Drag and drop for columns
  document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
  
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTasks();
  });
  
  // Filter links
  filterLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      filterLinks.forEach(l => l.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      // Update current filter
      currentFilter = link.getAttribute('data-filter');
      
      // Update page title
      currentViewTitle.textContent = link.textContent.trim().replace(/\d+/g, '').trim();
      
      // Render tasks with new filter
      renderTasks();
    });
  });
  
  // Label items
  labelItems.forEach(item => {
    item.addEventListener('click', () => {
      const label = item.getAttribute('data-label');
      
      // Remove active class from all filter links
      filterLinks.forEach(l => l.classList.remove('active'));
      
      // Update current filter to show only tasks with this label
      currentFilter = `label-${label}`;
      
      // Update page title
      currentViewTitle.textContent = `${getLabelName(label)} Tasks`;
      
      // Filter tasks by label
      const allTasks = getAllTasks();
      const filteredTasks = allTasks.filter(task => task.label === label);
      const groupedTasks = groupTasksByColumn(filteredTasks);
      
      // Render tasks
      for (const column in tasks) {
        const tasksContainer = document.getElementById(`${column}-tasks`);
        tasksContainer.innerHTML = '';
        
        const columnTasks = groupedTasks[column] || [];
        
        // Update column count
        const countElement = document.getElementById(`${column}-count`);
        countElement.textContent = columnTasks.length;
        
        // Render tasks or empty state
        if (columnTasks.length === 0) {
          tasksContainer.innerHTML = `
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <p class="empty-state-text">No tasks here</p>
              <p class="empty-state-subtext">Add a task or drag one here</p>
            </div>
          `;
        } else {
          columnTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksContainer.appendChild(taskElement);
          });
        }
      }
    });
  });
  
  // Mobile sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && 
        e.target !== sidebarToggle) {
      sidebar.classList.remove('active');
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape' && taskModal.classList.contains('active')) {
      closeModal();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    
    // Ctrl/Cmd + N to add new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openAddTaskModal();
    }
  });
}

// Initialize the app
function init() {
  loadTheme();
  loadTasks();
  renderTasks();
  setupEventListeners();
}

// Start the app
init();