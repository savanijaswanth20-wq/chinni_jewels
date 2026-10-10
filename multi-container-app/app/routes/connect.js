const express = require('express');
const { getAppToken, getUserToken, authorizeUser, DEFAULT_CONNECTOR } = require('../services/connect');

const router = express.Router();

/**
 * GET /api/connect/app-token
 * Fetch installation/app token for github/chinni-jewels
 */
router.get('/token/app', async (req, res) => {
    try {
        const token = await getAppToken();
        res.json({ success: true, connector: DEFAULT_CONNECTOR, token });
    } catch (err) {
        console.error('[Vercel Connect] getAppToken error:', err.message);
        res.status(err.status || 500).json({
            success: false,
            error: err.message,
            code: err.code || 'CONNECT_ERROR',
        });
    }
});

/**
 * GET /api/connect/token/user/:userId
 * Fetch user-scoped token
 */
router.get('/token/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const token = await getUserToken(userId);
        res.json({ success: true, connector: DEFAULT_CONNECTOR, userId, token });
    } catch (err) {
        console.error('[Vercel Connect] getUserToken error:', err.message);
        res.status(err.status || 500).json({
            success: false,
            error: err.message,
            code: err.code || 'CONNECT_ERROR',
        });
    }
});

/**
 * POST /api/connect/authorize
 * Start user authorization flow
 */
router.post('/authorize', async (req, res) => {
    try {
        const userId = req.body.userId || req.body.id || 'usr_123';
        const result = await authorizeUser(userId);
        if (result && result.url) {
            return res.json({ success: true, redirectUrl: result.url });
        }
        res.json({ success: true, result });
    } catch (err) {
        console.error('[Vercel Connect] authorizeUser error:', err.message);
        res.status(err.status || 500).json({
            success: false,
            error: err.message,
            code: err.code || 'CONNECT_ERROR',
        });
    }
});

/**
 * GET /api/connect/authorize/:userId
 * Start user authorization and redirect browser directly
 */
router.get('/authorize/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await authorizeUser(userId);
        if (result && result.url) {
            return res.redirect(result.url);
        }
        res.json({ success: true, result });
    } catch (err) {
        console.error('[Vercel Connect] authorize redirect error:', err.message);
        res.status(err.status || 500).json({
            success: false,
            error: err.message,
            code: err.code || 'CONNECT_ERROR',
        });
    }
});

module.exports = router;
