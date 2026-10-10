const mongoose = require('mongoose');
const bodyParse = require('body-parser');
const express = require('express');
const app = express();
const moment = require('moment');

// Live Reload configuration (dev only)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
        const livereload = require('livereload');
        const connectLiveReload = require('connect-livereload');
        const liveReloadServer = livereload.createServer();
        liveReloadServer.server.once("connection", () => {
            setTimeout(() => {
                liveReloadServer.refresh("/");
            }, 100);
        });
        app.use(connectLiveReload());
    } catch (e) {
        // dev tools optional in production
    }
}

// Frontend route
const FrontRouter = require('./routes/front');

// Set ejs template engine
app.set('view engine', 'ejs');

app.use(bodyParse.urlencoded({ extended: false }));
app.use(bodyParse.json());
app.locals.moment = moment;

// Database connection
const db = require('./config/keys').mongoProdURI;
if (db) {
    mongoose
        .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log(`Mongodb Connected`))
        .catch(error => console.warn(`Mongodb connection skipped/failed:`, error.message));
}

// Mount routes at both /dashboard and root / to support direct and path-prefix rewrites
app.use('/dashboard', FrontRouter);
app.use('/', FrontRouter);

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

module.exports = app;
