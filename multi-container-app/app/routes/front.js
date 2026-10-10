const express = require('express');
const Todo = require('./../models/Todo');

const router = express.Router();

function getBasePath(req) {
    if (req.baseUrl && req.baseUrl.includes('dashboard')) return req.baseUrl;
    if (process.env.BASE_PATH) return process.env.BASE_PATH;
    const referer = req.headers.referer || '';
    if (referer.includes('/dashboard')) return '/dashboard';
    return '';
}

// Home page route
router.get('/', async (req, res) => {
    let tasks = {};
    try {
        const todos = await Todo.find();
        if (todos && Object.keys(todos).length > 0) {
            tasks = todos;
        }
    } catch (e) {
        tasks = {};
    }

    const basePath = getBasePath(req);
    res.render("todos", {
        tasks,
        basePath,
        backendUrl: process.env.BACKEND_URL || ''
    });
});

// POST - Submit Task
router.post('/', (req, res) => {
    const basePath = getBasePath(req);
    const redirectUrl = basePath ? `${basePath}/` : '/';

    const newTask = new Todo({
        task: req.body.task
    });

    newTask.save()
    .then(() => res.redirect(redirectUrl))
    .catch(err => {
        console.error(err);
        res.redirect(redirectUrl);
    });
});

// POST - Destroy todo item
router.post('/todo/destroy', async (req, res) => {
    const basePath = getBasePath(req);
    const redirectUrl = basePath ? `${basePath}/` : '/';
    const taskKey = req.body._key;
    try {
        await Todo.findOneAndRemove({_id: taskKey});
    } catch (err) {
        console.error(err);
    }
    res.redirect(redirectUrl);
});

// Inter-service endpoint: calls backend using bound BACKEND_URL
router.get('/api/backend-todos', async (req, res) => {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
        return res.status(503).json({ error: 'BACKEND_URL binding not configured' });
    }
    try {
        const targetUrl = new URL('api/todos', backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`);
        const response = await fetch(targetUrl);
        const data = await response.json();
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
