const path = require('path');

module.exports = {
  entry: './src/frontend/index.jsx',
  output: {
    path: path.resolve(__dirname, 'static'),
    filename: 'main.js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
