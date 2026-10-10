module.exports = {
    mongoProdURI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://todo-database:27017/todoapp',
};
