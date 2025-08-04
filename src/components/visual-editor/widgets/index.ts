/**
 * @file widgets/index.ts
 * @description
 * 这是所有组件注册的统一入口。
 * 当编辑器启动时，会调用这里的 `registerAllWidgets` 函数，
 * 以确保所有定义的组件都被加载到组件注册中心。
 */

import { registerBaseWidgets } from './base-widgets'

/**
 * 注册所有在编辑器中可用的组件。
 * 这个函数应该在应用程序的入口处（例如 main.ts 或编辑器初始化时）被调用一次。
 */
export function registerAllWidgets() {
  console.log('🚀 开始注册传统组件...')

  registerBaseWidgets()

  console.log('✅ 传统组件注册完成')
}
