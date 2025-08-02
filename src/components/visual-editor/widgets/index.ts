/**
 * @file widgets/index.ts
 * @description
 * 这是所有组件注册的统一入口。
 * 当编辑器启动时，会调用这里的 `registerAllWidgets` 函数，
 * 以确保所有定义的组件都被加载到组件注册中心。
 */

// 所有的传统组件注册都已被移除，以便为 Card 2.1 让路。
// 如果需要添加非 Card 2.1 的传统组件，可以取消下面的注释并创建相应的注册文件。
// import { registerBaseWidgets } from './base-widgets'

/**
 * 注册所有在编辑器中可用的组件。
 * 这个函数应该在应用程序的入口处（例如 main.ts 或编辑器初始化时）被调用一次。
 */
export function registerAllWidgets() {
  // registerBaseWidgets() // 已移除基础组件注册
  console.log('🎨 [WidgetRegistry] 所有传统组件注册已禁用，等待 Card 2.1 接入。')
}
