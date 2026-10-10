const { getToken, startAuthorization } = require('@vercel/connect');

const DEFAULT_CONNECTOR = process.env.VERCEL_CONNECTOR_NAME || 'github/chinni-jewels';

/**
 * Fetch installation / app-level token for the GitHub connector
 * @param {string} connector
 * @returns {Promise<string>} Access token
 */
async function getAppToken(connector = DEFAULT_CONNECTOR) {
    return await getToken(connector, {
        subject: { type: 'app' },
    });
}

/**
 * Fetch user-scoped token for a specific user
 * @param {string} userId
 * @param {string} connector
 * @returns {Promise<string>} Access token
 */
async function getUserToken(userId, connector = DEFAULT_CONNECTOR) {
    if (!userId) {
        throw new Error('userId is required to fetch user token');
    }
    return await getToken(connector, {
        subject: { type: 'user', id: userId },
    });
}

/**
 * Start OAuth user authorization flow for GitHub connector
 * @param {string} userId
 * @param {string} connector
 * @returns {Promise<any>} Authorization result / URL
 */
async function authorizeUser(userId, connector = DEFAULT_CONNECTOR) {
    if (!userId) {
        throw new Error('userId is required to start authorization');
    }
    return await startAuthorization(connector, {
        subject: { type: 'user', id: userId },
    });
}

module.exports = {
    DEFAULT_CONNECTOR,
    getAppToken,
    getUserToken,
    authorizeUser,
};
