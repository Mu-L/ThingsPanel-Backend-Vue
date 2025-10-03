/**
 * @file Card 2.1 系统入口（清理版）
 * 使用统一的自动注册系统，避免重复的组件加载器
 */

import { componentRegistry } from '@/card2.1/core/component-registry'
import { AutoRegistry } from '@/card2.1/core/auto-registry'
import { setupStorageListener } from '@/card2.1/core/permission-watcher'

// ========== 简化版本的初始化系统 ==========

// 创建自动注册系统
const autoRegistry = new AutoRegistry(componentRegistry)

// 初始化状态
let isInitialized = false
let initializationPromise: Promise<void> | null = null

/**
 * 初始化 Card 2.1 系统（简化版本）
 * 直接使用自动注册系统的内置扫描功能
 */
export async function initializeCard2System() {
  if (isInitialized) return

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {

      // 🔥 优化：设置权限监听器
      setupStorageListener()

      // 1. 使用 import.meta.glob 动态扫描所有组件的 index.ts 文件
      // **/* 模式确保可以扫描到任意深度的子目录
      const allComponentModules = import.meta.glob('./components/**/index.ts', { eager: true });

      // 排除 components/index.ts 本身避免冲突
      const componentModules = Object.fromEntries(
        Object.entries(allComponentModules).filter(([path]) => path !== './components/index.ts')
      );

      // 🔥 调试：打印扫描到的模块
      console.group('🔥 [Card2.1] 扫描到的组件模块')
      console.log('扫描到的模块数量:', Object.keys(componentModules).length)
      console.log('模块路径列表:', Object.keys(componentModules))
      console.groupEnd()

      // 🔥 调试：输出扫描到的模块


      // 2. 调用自动注册系统，并传入扫描到的模块
      await autoRegistry.autoRegister(componentModules);

      isInitialized = true
    } catch (err) {
      console.error('❌ [Card2.1] 初始化失败:', err)
      throw err
    } finally {
      initializationPromise = null
    }
  })()

  return initializationPromise
}

/**
 * 获取组件注册表
 */
export function getComponentRegistry() {
  return componentRegistry
}

/**
 * 获取组件树形结构（简化版本）
 */
export function getComponentTree() {
  if (!isInitialized) {
    return { components: [], categories: [], totalCount: 0 }
  }
  const tree = autoRegistry.getComponentTree()

  // 🔥 调试：打印 getComponentTree 返回的数据
  console.group('🔥 [getComponentTree] 返回的组件树数据')
  console.log('分类数量:', tree.categories?.length)
  console.log('组件数量:', tree.components?.length)
  console.log('分类详情:', tree.categories?.map(cat => ({
    id: cat.id,
    name: cat.name,
    children: cat.children?.length || 0
  })))
  console.log('组件分类统计:', tree.components?.reduce((acc, comp) => {
    const mainCat = comp.mainCategory || '未知'
    acc[mainCat] = (acc[mainCat] || 0) + 1
    return acc
  }, {} as Record<string, number>))
  console.groupEnd()

  return tree
}

/**
 * 按分类获取组件（简化版本）
 */
export async function getComponentsByCategory(mainCategory?: string, subCategory?: string) {
  if (!isInitialized) {
    return []
  }
  return autoRegistry.getComponentsByCategory(mainCategory, subCategory)
}

/**
 * 获取所有分类（简化版本）
 */
export function getCategories() {
  if (!isInitialized) {
    return []
  }
  return autoRegistry.getAllCategories()
}

/**
 * 重新应用权限过滤（简化版本）
 * 当用户权限发生变化时调用此函数
 */
export async function reapplyPermissionFilter() {
  // 简化实现：直接重新初始化
  isInitialized = false
  await initializeCard2System()
}

/**
 * 获取所有组件（包括无权限的，用于调试）
 */
export function getAllComponents() {
  if (!isInitialized) {
    return []
  }
  return autoRegistry.getAllComponents()
}

// ========== 核心模块导出 ==========

// 传统模块导出（向后兼容）
export { componentRegistry }
export { AutoRegistry }
export type { ComponentTree, ComponentCategory } from '@/card2.1/core/auto-registry'

// 导出权限相关工具
export * from '@/card2.1/core/permission-utils'
export type { ComponentPermission } from '@/card2.1/types'

// 导出 Hooks
export * from '@/card2.1/hooks'

// ========== 简化的工具方法导出 ==========

/**
 * 获取系统初始化状态
 */
export function getInitializationState() {
  return {
    isInitialized,
    componentCount: isInitialized ? autoRegistry.getAllComponents().length : 0,
    categories: isInitialized ? autoRegistry.getAllCategories() : []
  }
}

/**
 * 清除缓存（强制重新初始化）
 */
export function clearInitializationCache() {
  isInitialized = false
  initializationPromise = null
}

/**
 * 检查组件更新（简化版）
 */
export async function checkForComponentUpdates() {
  // 简化实现：总是返回true，让调用方决定是否重新初始化
  return !isInitialized
}

// 默认导出注册表（保持向后兼容）
export default componentRegistry
