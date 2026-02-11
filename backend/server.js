const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Todo = require('./models/Todo');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
app.get('/api/ping', (req, res) => res.json({ message: 'pong' }));

// Get all todos
app.get('/api/todos', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new todo
app.post('/api/todos', async (req, res) => {
    console.log("POST /api/todos - body:", req.body);
    const todo = new Todo({
        task: req.body.task,
        dueDate: req.body.dueDate
    });

    try {
        const newTodo = await todo.save();
        res.status(201).json(newTodo);
    } catch (err) {
        console.error("Error saving todo:", err);
        res.status(400).json({ message: err.message });
    }
});

// Update a todo (toggle status or edit task)
app.put('/api/todos/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (!todo) return res.status(404).json({ message: 'Todo not found' });

        if (req.body.task !== undefined) todo.task = req.body.task;
        if (req.body.completed !== undefined) todo.completed = req.body.completed;
        if (req.body.dueDate !== undefined) todo.dueDate = req.body.dueDate;

        const updatedTodo = await todo.save();
        res.json(updatedTodo);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
    try {
        const todo = await Todo.findByIdAndDelete(req.params.id);
        if (!todo) return res.status(404).json({ message: 'Todo not found' });
        res.json({ message: 'Todo deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete all todos
app.delete('/api/todos', async (req, res) => {
    try {
        await Todo.deleteMany({});
        res.json({ message: 'All todos deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
