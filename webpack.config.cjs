const path = require("path")

module.exports = {
    entry: './dist/client/main.js',
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'public/js'),
        filename: 'allthecode.js',
    },
}