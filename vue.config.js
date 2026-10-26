const { defineConfig } = require('@vue/cli-service');
const path = require('path');
const os = require('os');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.VUE_APP_RUNTIME_SCENE:', process.env.VUE_APP_RUNTIME_SCENE);

// 生产语义 = 非 development（含 production / test 模式打包）。
// native-ext-loader 的 rewritePath 和 devtool 都依赖它：
// test 打包若走 dev 路径（node_modules 相对路径），安装后渲染进程将找不到 .node 导致白屏
const isProduction = process.env.NODE_ENV !== 'development';
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
    // 仅 NODE_ENV=production 的正式构建使用持久化缓存。
    // 开发/test 构建配合 transpileDependencies: false 时，vue-loader 写入的 SFC 缓存缺少
    // buildMeta，下一次增量构建会直接崩溃（Cannot read properties of undefined）。
    // 开发/test 改用内存缓存：dev server 的 watch 会话内依然是增量编译。
    cache: process.env.NODE_ENV === 'production'
      ? {
        type: 'filesystem',
        buildDependencies: { config: [__filename] },
      }
      : {
        type: 'memory',
      },
    target: 'electron-renderer',
    resolve: {
      alias: {
        // 强制所有包使用根目录唯一的 vue 实例
        vue: path.resolve(__dirname, './node_modules/vue'),
        'trtc-electron-sdk': path.resolve(__dirname, './node_modules/trtc-electron-sdk'),
      },
      // webpack 5 默认会检查 package.json exports，test 模式下因 mode=development
      // 与 NODE_ENV=test 不一致导致 conditionNames 匹配异常，显式指定避免 "Package path not exported"
      conditionNames: ['import', 'require', 'default'],
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
    // Suppress known non-actionable warnings so the console stays readable.
    stats: {
      warningsFilter: [
        // TUILiveKit/ipc/index.ts reexports — types are in types.ts but webpack
        // only resolves enum value exports under transpileDependencies: false.
        // Safe to ignore, runtime behavior is unaffected.
        /export '.*' (reexported as '.*') was not found in '\.\/types'/,
        // Vue 3.3+ compiler macro warnings — defineProps/defineEmits/withDefaults
        // no longer need to be imported from 'vue', but existing imports are harmless.
        /`defineProps` is a compiler macro/,
        /`defineEmits` is a compiler macro/,
        /`withDefaults` is a compiler macro/,
      ],
    },
  }
})
