const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

// Get all tasks for the authenticated user
router.get('/', authenticateToken, (req, res) => {
  try {
    const data = db.read();
    const userTasks = data.tasks.filter(task => task.userId === req.user.userId);
    res.json(userTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get a specific task
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const data = db.read();
    const task = data.tasks.find(t => t.id === req.params.id && t.userId === req.user.userId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create a new task
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, description, type, priority, agentId } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const data = db.read();
    
    const newTask = {
      id: Date.now().toString(),
      userId: req.user.userId,
      title,
      description: description || '',
      type: type || 'general',
      priority: priority || 'medium',
      status: 'pending',
      agentId: agentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };
    
    data.tasks.push(newTask);
    db.write(data);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const data = db.read();
    const taskIndex = data.tasks.findIndex(t => t.id === req.params.id && t.userId === req.user.userId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const { title, description, type, priority, status, agentId } = req.body;
    
    const updatedTask = {
      ...data.tasks[taskIndex],
      title: title || data.tasks[taskIndex].title,
      description: description !== undefined ? description : data.tasks[taskIndex].description,
      type: type || data.tasks[taskIndex].type,
      priority: priority || data.tasks[taskIndex].priority,
      status: status || data.tasks[taskIndex].status,
      agentId: agentId !== undefined ? agentId : data.tasks[taskIndex].agentId,
      updatedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : data.tasks[taskIndex].completedAt
    };
    
    data.tasks[taskIndex] = updatedTask;
    db.write(data);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const data = db.read();
    const taskIndex = data.tasks.findIndex(t => t.id === req.params.id && t.userId === req.user.userId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    data.tasks.splice(taskIndex, 1);
    db.write(data);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
