const path = require("path")
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: './dist/client/main.js',
        mode: 'production',
    output: {
        path: path.resolve(__dirname, 'public/js'),
        filename: 'allthecode.js',
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                    },
                },
            }),
        ],
    },
}