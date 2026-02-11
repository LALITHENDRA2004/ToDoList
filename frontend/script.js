// Abstract class for TodoItemFormatter
class TodoItemFormatter {
  formatTask(task) {
    return task.length > 14 ? task.slice(0, 14) + "..." : task;
  }

  formatDueDate(dueDate) {
    return dueDate || "No due date";
  }

  formatStatus(completed) {
    return completed ? "Completed" : "Pending";
  }
}

// Class responsible for managing Todo items
class TodoManager {
  constructor(todoItemFormatter) {
    this.todos = [];
    this.todoItemFormatter = todoItemFormatter;
    this.apiUrl = 'https://todolist-sej8.onrender.com/api/todos';
  }

  async fetchTodos() {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error("Failed to fetch todos");
      this.todos = await response.json();
      return this.todos;
    } catch (err) {
      console.error("Error fetching todos:", err);
      throw err;
    }
  }

  async addTodo(task, dueDate) {
    const todoData = {
      task: this.todoItemFormatter.formatTask(task),
      dueDate: this.todoItemFormatter.formatDueDate(dueDate)
    };
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoData)
      });
      if (!response.ok) {
        throw new Error("Failed to add task");
      }
      const newTodo = await response.json();
      this.todos.unshift(newTodo);
      return newTodo;
    } catch (err) {
      console.error("Error adding todo:", err);
      throw err;
    }
  }

  async editTodo(id, updatedTask) {
    try {
      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: updatedTask })
      });
      if (!response.ok) throw new Error("Failed to update task");
      const updatedTodo = await response.json();
      const index = this.todos.findIndex(t => (t._id || t.id) === id);
      if (index !== -1) this.todos[index] = updatedTodo;
      return updatedTodo;
    } catch (err) {
      console.error("Error editing todo:", err);
      throw err;
    }
  }

  async deleteTodo(id) {
    try {
      const response = await fetch(`${this.apiUrl}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to delete task");
      this.todos = this.todos.filter((todo) => (todo._id || todo.id) !== id);
    } catch (err) {
      console.error("Error deleting todo:", err);
      throw err;
    }
  }

  async toggleTodoStatus(id) {
    const todo = this.todos.find((t) => (t._id || t.id) === id);
    if (todo) {
      try {
        const response = await fetch(`${this.apiUrl}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !todo.completed })
        });
        if (!response.ok) throw new Error("Failed to toggle status");
        const updatedTodo = await response.json();
        const index = this.todos.findIndex(t => (t._id || t.id) === id);
        if (index !== -1) this.todos[index] = updatedTodo;
      } catch (err) {
        console.error("Error toggling status:", err);
        throw err;
      }
    }
  }

  async clearAllTodos() {
    try {
      const response = await fetch(this.apiUrl, { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to clear tasks");
      this.todos = [];
    } catch (err) {
      console.error("Error clearing todos:", err);
      throw err;
    }
  }

  filterTodos(status) {
    switch (status) {
      case "all":
        return this.todos;
      case "pending":
        return this.todos.filter((todo) => !todo.completed);
      case "completed":
        return this.todos.filter((todo) => todo.completed);
      default:
        return [];
    }
  }
}

// Class responsible for managing the UI and handling events
class UIManager {
  constructor(todoManager, todoItemFormatter) {
    this.todoManager = todoManager;
    this.todoItemFormatter = todoItemFormatter;
    this.taskInput = document.querySelector("input");
    this.dateInput = document.querySelector(".schedule-date");
    this.addBtn = document.querySelector(".add-task-button");
    this.todosListBody = document.querySelector(".todos-list-body");
    this.alertMessage = document.querySelector(".alert-message");
    this.deleteAllBtn = document.querySelector(".delete-all-btn");

    this.addEventListeners();
    this.refreshUI();
  }

  async refreshUI() {
    try {
      await this.todoManager.fetchTodos();
      this.showAllTodos();
    } catch (err) {
      this.showAlertMessage("Failed to connect to the backend server. Is it running?", "error");
    }
  }

  addEventListeners() {
    // Event listener for adding a new todo
    this.addBtn.addEventListener("click", () => {
      this.handleAddTodo();
    });

    // Event listener for pressing Enter key in the task input
    this.taskInput.addEventListener("keyup", (e) => {
      if (e.keyCode === 13 && this.taskInput.value.length > 0) {
        this.handleAddTodo();
      }
    });

    // Event listener for deleting all todos
    this.deleteAllBtn.addEventListener("click", () => {
      this.handleClearAllTodos();
    });

    // Event listeners for filter buttons
    const filterButtons = document.querySelectorAll(".todos-filter li");
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const status = button.textContent.toLowerCase();
        this.handleFilterTodos(status);
      });
    });
  }

  async handleAddTodo() {
    const task = this.taskInput.value.trim();
    const dueDate = this.dateInput.value;
    if (task === "") {
      this.showAlertMessage("Please enter a task", "error");
    } else {
      try {
        await this.todoManager.addTodo(task, dueDate);
        this.showAllTodos();
        this.taskInput.value = "";
        this.dateInput.value = "";
        this.showAlertMessage("Task added successfully", "success");
      } catch (err) {
        this.showAlertMessage("Failed to add task. Please check your connection.", "error");
      }
    }
  }

  async handleClearAllTodos() {
    const confirmed = await this.showConfirmModal("Delete All", "Are you sure you want to clear all tasks? This action cannot be undone.");
    if (!confirmed) return;
    try {
      await this.todoManager.clearAllTodos();
      this.showAllTodos();
      this.showAlertMessage("All todos cleared successfully", "success");
    } catch (err) {
      this.showAlertMessage("Failed to clear todos. Please try again.", "error");
    }
  }

  showAllTodos() {
    const todos = this.todoManager.filterTodos("all");
    this.displayTodos(todos);
  }

  displayTodos(todos) {

    this.todosListBody.innerHTML = "";

    if (todos.length === 0) {
      this.todosListBody.innerHTML = `<tr><td colspan="5" class="text-center">No task found</td></tr>`;
      return;
    }

    todos.forEach((todo) => {
      const id = todo._id || todo.id;
      this.todosListBody.innerHTML += `
          <tr class="todo-item" data-id="${id}">
            <td>${this.todoItemFormatter.formatTask(todo.task)}</td>
            <td>${this.todoItemFormatter.formatDueDate(todo.dueDate)}</td>
            <td>${this.todoItemFormatter.formatStatus(todo.completed)}</td>
            <td>
              <button class="btn btn-warning btn-sm" onclick="uiManager.handleEditTodo('${id}')">
                <i class="bx bx-edit-alt bx-bx-xs"></i>    
              </button>
              <button class="btn ${todo.completed ? 'btn-error' : 'btn-success'} btn-sm" onclick="uiManager.handleToggleStatus('${id}')">
                <i class="bx ${todo.completed ? 'bx-x' : 'bx-check'} bx-xs"></i>
              </button>
              <button class="btn btn-error btn-sm" onclick="uiManager.handleDeleteTodo('${id}')">
                <i class="bx bx-trash bx-xs"></i>
              </button>
            </td>
          </tr>
        `;
    });
  }



  async handleEditTodo(id) {
    const todo = this.todoManager.todos.find((t) => (t._id || t.id) === id);
    if (todo) {
      this.taskInput.value = todo.task;
      this.dateInput.value = todo.dueDate === "No due date" ? "" : todo.dueDate;

      const originalAddBtnHtml = this.addBtn.innerHTML;
      this.addBtn.innerHTML = "<i class='bx bx-check bx-sm'></i>";

      const handleUpdate = async () => {
        const updatedTask = this.taskInput.value;
        try {
          await this.todoManager.editTodo(id, updatedTask);
          this.addBtn.innerHTML = originalAddBtnHtml;
          this.showAlertMessage("Todo updated successfully", "success");
          this.showAllTodos();
          this.taskInput.value = "";
          this.dateInput.value = "";
          this.addBtn.removeEventListener("click", handleUpdate);
          // Restore original listener
          this.addBtn.addEventListener("click", () => this.handleAddTodo());
        } catch (err) {
          this.showAlertMessage("Failed to update task. Please try again.", "error");
        }
      };

      // Remove existing listener to avoid multiple additions
      const newAddBtn = this.addBtn.cloneNode(true);
      this.addBtn.parentNode.replaceChild(newAddBtn, this.addBtn);
      this.addBtn = newAddBtn;

      this.addBtn.addEventListener("click", handleUpdate);
    }
  }


  async handleToggleStatus(id) {
    try {
      await this.todoManager.toggleTodoStatus(id);
      this.showAllTodos();
    } catch (err) {
      this.showAlertMessage("Failed to update status. Please try again.", "error");
    }
  }

  async handleDeleteTodo(id) {
    const confirmed = await this.showConfirmModal("Delete Task", "Are you sure you want to delete this task?");
    if (!confirmed) return;
    try {
      await this.todoManager.deleteTodo(id);
      this.showAlertMessage("Todo deleted successfully", "success");
      this.showAllTodos();
    } catch (err) {
      this.showAlertMessage("Failed to delete task. Please try again.", "error");
    }
  }

  showConfirmModal(title, message) {
    return new Promise((resolve) => {
      const modalToggle = document.querySelector("#confirm-modal");
      const modalTitle = document.querySelector("#modal-title");
      const modalMessage = document.querySelector("#modal-message");
      const confirmBtn = document.querySelector("#modal-confirm-btn");
      const cancelBtn = document.querySelector("#modal-cancel-btn");

      modalTitle.innerText = title;
      modalMessage.innerText = message;
      modalToggle.checked = true;

      const onConfirm = () => {
        modalToggle.checked = false;
        cancelBtn.removeEventListener("click", onCancel);
        resolve(true);
      };

      const onCancel = () => {
        modalToggle.checked = false;
        confirmBtn.removeEventListener("click", onConfirm);
        resolve(false);
      };

      confirmBtn.addEventListener("click", onConfirm, { once: true });
      cancelBtn.addEventListener("click", onCancel, { once: true });
    });
  }

  handleFilterTodos(status) {
    const filteredTodos = this.todoManager.filterTodos(status);
    this.displayTodos(filteredTodos);
  }


  showAlertMessage(message, type) {
    const alertBox = `
  <div class="alert alert-${type} shadow-lg mb-5 w-full">
    <div>
      <span>${message}</span>
    </div>
  </div>
`;
    this.alertMessage.innerHTML = alertBox;
    this.alertMessage.classList.remove("hide");
    this.alertMessage.classList.add("show");
    setTimeout(() => {
      this.alertMessage.classList.remove("show");
      this.alertMessage.classList.add("hide");
    }, 3000);
  }
}

// Class responsible for managing the theme switcher
class ThemeSwitcher {
  constructor(toggle, html) {
    this.toggle = toggle;
    this.html = html;
    this.init();
  }

  init() {
    const theme = this.getThemeFromLocalStorage() || "night";
    this.setTheme(theme);
    this.toggle.checked = theme === "light";

    this.addThemeEventListeners();
  }

  addThemeEventListeners() {
    this.toggle.addEventListener("change", () => {
      const themeName = this.toggle.checked ? "light" : "night";
      this.setTheme(themeName);
      this.saveThemeToLocalStorage(themeName);
    });
  }

  setTheme(themeName) {
    this.html.setAttribute("data-theme", themeName);
  }

  saveThemeToLocalStorage(themeName) {
    localStorage.setItem("theme", themeName);
  }

  getThemeFromLocalStorage() {
    return localStorage.getItem("theme");
  }
}



// Instantiating the classes
const todoItemFormatter = new TodoItemFormatter();
const todoManager = new TodoManager(todoItemFormatter);
const uiManager = new UIManager(todoManager, todoItemFormatter);
const themeToggle = document.querySelector("#theme-toggle");
const html = document.querySelector("html");
const themeSwitcher = new ThemeSwitcher(themeToggle, html);
