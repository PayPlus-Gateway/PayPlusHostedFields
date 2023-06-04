const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    main: "./src/index.js",
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "payplus-hosted-fields.min.js"

  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      { 
        loader: "ts-loader"
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({ parallel: true })
  ]}
};