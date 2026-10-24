const { defineConfig } = require('@vue/cli-service');
const path = require('path');
const os = require('os');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.VUE_APP_RUNTIME_SCENE:', process.env.VUE_APP_RUNTIME_SCENE);

const isProduction = process.env.NODE_ENV === 'production';
const platform = os.platform();

module.exports = defineConfig({
  // 所有依赖均为预编译产物，无需 babel 再次转译 node_modules，大幅加快首次构建
  transpileDependencies: false,
  // dev server 下关闭 eslint 校验（仍可用 npm run lint 手动检查），减少每次启动的额外开销
  lintOnSave: false,
  publicPath: './',
  configureWebpack: {
    // eval-cheap-module-source-map 比 inline-source-map 快得多，且调试体验基本不变
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    // webpack5 持久化缓存，二次启动增量编译
    cache: {
      type: 'filesystem',
    },
    target: 'electron-renderer',
    resolve: {
      alias: {
        // 强制所有包使用根目录唯一的 vue 实例
        vue: path.resolve(__dirname, './node_modules/vue'),
        'trtc-electron-sdk': path.resolve(__dirname, './node_modules/trtc-electron-sdk'),
      },
    },
    module: {
      rules: [
        {
          test: /\.node$/,
          loader: 'native-ext-loader',
          options: {
            rewritePath: isProduction
              ? platform === 'win32'
                ? './resources'
                : '../Resources'
              : './node_modules/trtc-electron-sdk/build/Release',
          },
        },
      ],
    },
  }
})
