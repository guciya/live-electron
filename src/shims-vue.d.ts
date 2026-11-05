/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

/** SVGA 动画资源：构建时内联为 data:svga/2.0;base64 URL */
declare module '*.svga' {
  const src: string
  export default src
}

/** 失败动画文件名没有 .svga 扩展名（pk_shiabaisvga），单独声明 */
declare module '*/pk_shiabaisvga' {
  const src: string
  export default src
}
