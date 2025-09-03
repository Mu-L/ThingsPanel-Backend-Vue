/**
 * 全局轮询管理器
 * 统一管理所有组件的轮询任务，避免重复定时器，提高性能
 */

import { reactive, ref, type Ref } from 'vue'

export interface PollingTask {
  /** 任务唯一标识 */
  id: string
  /** 关联的组件ID */
  componentId: string
  /** 组件显示名称 */
  componentName: string
  /** 轮询间隔（毫秒） */
  interval: number
  /** 是否激活 */
  active: boolean
  /** 上次执行时间 */
  lastExecutedAt?: number
  /** 下次执行时间 */
  nextExecuteAt?: number
  /** 执行回调函数 */
  callback: () => Promise<void> | void
}

export interface PollingStatistics {
  /** 总任务数 */
  totalTasks: number
  /** 活跃任务数 */
  activeTasks: number
  /** 平均间隔时间 */
  averageInterval: number
  /** 最小间隔时间 */
  minInterval: number
  /** 全局定时器状态 */
  globalTimerActive: boolean
  /** 总执行次数 */
  totalExecutions: number
}

/**
 * 全局轮询管理器类
 * 使用单一定时器统一调度所有轮询任务
 */
export class GlobalPollingManager {
  /** 所有轮询任务 */
  private tasks = reactive<Map<string, PollingTask>>(new Map())

  /** 全局定时器ID */
  private globalTimerId: number | null = null

  /** 全局轮询总开关 - 控制是否执行任何轮询任务 */
  private globalEnabled = ref<boolean>(false)

  /** 全局定时器间隔（毫秒），设置为最小公约数 */
  private readonly GLOBAL_TIMER_INTERVAL = 5000 // 🔥 性能优化：改为5秒，减少CPU占用

  /** 管理器是否已启动 */
  private isRunning = ref(false)

  /** 统计信息 */
  private statistics = reactive<PollingStatistics>({
    totalTasks: 0,
    activeTasks: 0,
    averageInterval: 0,
    minInterval: 0,
    globalTimerActive: false,
    totalExecutions: 0
  })

  constructor() {
  }

  /**
   * 添加轮询任务
   * @param taskConfig 任务配置
   * @returns 任务ID
   */
  addTask(taskConfig: {
    componentId: string
    componentName: string
    interval: number
    callback: () => Promise<void> | void
    autoStart?: boolean
  }): string {
    const taskId = this.generateTaskId(taskConfig.componentId)

    const task: PollingTask = {
      id: taskId,
      componentId: taskConfig.componentId,
      componentName: taskConfig.componentName,
      interval: Math.max(taskConfig.interval, 2000), // 最小2秒间隔
      active: false,
      callback: taskConfig.callback
    }

    this.tasks.set(taskId, task)
    this.updateStatistics()
    // 如果设置了自动启动
    if (taskConfig.autoStart) {
      this.startTask(taskId)
    } else {
    }

    return taskId
  }

  /**
   * 启动指定任务
   * @param taskId 任务ID
   */
  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.active = true
    task.nextExecuteAt = Date.now() + task.interval
    // 启动全局定时器（如果还没启动）
    this.startGlobalTimer()
    this.updateStatistics()
    return true
  }

  /**
   * 停止指定任务
   * @param taskId 任务ID
   */
  stopTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.active = false
    task.nextExecuteAt = undefined
    this.updateStatistics()

    // 如果没有活跃任务，停止全局定时器
    if (this.getActiveTasks().length === 0) {
      this.stopGlobalTimer()
    }

    return true
  }

  /**
   * 移除指定任务
   * @param taskId 任务ID
   */
  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    // 先停止任务
    this.stopTask(taskId)

    // 从列表中移除
    this.tasks.delete(taskId)
    this.updateStatistics()
    return true
  }

  /**
   * 根据组件ID获取任务
   * @param componentId 组件ID
   */
  getTasksByComponent(componentId: string): PollingTask[] {
    return Array.from(this.tasks.values()).filter(task => task.componentId === componentId)
  }

  /**
   * 启动指定组件的所有轮询任务
   * @param componentId 组件ID
   */
  startComponentTasks(componentId: string): boolean {
    const tasks = this.getTasksByComponent(componentId)
    if (tasks.length === 0) {
      return false
    }

    let startedCount = 0
    tasks.forEach(task => {
      if (!task.active) {
        task.active = true
        task.nextExecuteAt = Date.now() + task.interval
        startedCount++
      }
    })

    if (startedCount > 0) {
      // 启动全局定时器（如果还没启动）
      this.startGlobalTimer()
      this.updateStatistics()
    }

    return startedCount > 0
  }

  /**
   * 停止指定组件的所有轮询任务
   * @param componentId 组件ID
   */
  stopComponentTasks(componentId: string): boolean {
    const tasks = this.getTasksByComponent(componentId)
    if (tasks.length === 0) {
      return false
    }

    let stoppedCount = 0
    tasks.forEach(task => {
      if (task.active) {
        task.active = false
        task.nextExecuteAt = undefined
        stoppedCount++
      }
    })

    if (stoppedCount > 0) {
      this.updateStatistics()

      // 如果没有活跃任务，停止全局定时器
      if (this.getActiveTasks().length === 0) {
        this.stopGlobalTimer()
      }
    }

    return stoppedCount > 0
  }

  /**
   * 切换指定组件的轮询状态
   * @param componentId 组件ID
   */
  toggleComponentPolling(componentId: string): boolean {
    const tasks = this.getTasksByComponent(componentId)
    const hasActiveTasks = tasks.some(task => task.active)

    if (hasActiveTasks) {
      return !this.stopComponentTasks(componentId)
    } else {
      return this.startComponentTasks(componentId)
    }
  }

  /**
   * 检查组件是否有活跃的轮询任务
   * @param componentId 组件ID
   */
  isComponentPollingActive(componentId: string): boolean {
    const tasks = this.getTasksByComponent(componentId)
    return tasks.some(task => task.active)
  }

  /**
   * 获取组件轮询统计信息
   * @param componentId 组件ID
   */
  getComponentStatistics(componentId: string): PollingStatistics {
    const tasks = this.getTasksByComponent(componentId)
    const activeTasks = tasks.filter(task => task.active)

    const intervals = tasks.map(task => task.interval)
    const averageInterval =
      intervals.length > 0 ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0

    return {
      totalTasks: tasks.length,
      activeTasks: activeTasks.length,
      averageInterval,
      minInterval,
      globalTimerActive: this.statistics.globalTimerActive,
      totalExecutions: this.statistics.totalExecutions
    }
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): PollingTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 获取活跃任务
   */
  getActiveTasks(): PollingTask[] {
    return this.getAllTasks().filter(task => task.active)
  }

  /**
   * 获取统计信息
   */
  getStatistics(): PollingStatistics {
    return { ...this.statistics }
  }

  /**
   * 停止所有任务
   */
  stopAllTasks(): void {
    for (const task of this.tasks.values()) {
      if (task.active) {
        task.active = false
        task.nextExecuteAt = undefined
      }
    }

    this.stopGlobalTimer()
    this.updateStatistics()
  }

  /**
   * 清除所有任务
   */
  clearAllTasks(): void {
    this.stopAllTasks()
    this.tasks.clear()
    this.updateStatistics()
  }

  /**
   * 启用全局轮询
   */
  enableGlobalPolling(): void {
    this.globalEnabled.value = true

    // 详细状态报告
    const allTasks = this.getAllTasks()
    const activeTasks = this.getActiveTasks()

    if (this.getActiveTasks().length > 0) {
      this.startGlobalTimer()
    } 
  }

  /**
   * 禁用全局轮询
   */
  disableGlobalPolling(): void {
    this.globalEnabled.value = false

    // 停止全局定时器但不清除任务
    if (this.globalTimerId !== null) {
      clearInterval(this.globalTimerId)
      this.globalTimerId = null
      this.isRunning.value = false
      this.statistics.globalTimerActive = false
    }
  }

  /**
   * 获取全局轮询开关状态
   */
  isGlobalPollingEnabled(): boolean {
    return this.globalEnabled.value
  }

  /**
   * 切换全局轮询开关状态
   */
  toggleGlobalPolling(): boolean {
    if (this.globalEnabled.value) {
      this.disableGlobalPolling()
    } else {
      this.enableGlobalPolling()
    }
    return this.globalEnabled.value
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clearAllTasks()
    this.globalEnabled.value = false
    this.isRunning.value = false
  }

  /**
   * 启动全局定时器
   */
  private startGlobalTimer(): void {
    if (this.globalTimerId !== null) {
      return // 已经启动
    }
    this.globalTimerId = window.setInterval(() => {
      this.executeScheduledTasks()
    }, this.GLOBAL_TIMER_INTERVAL)

    this.isRunning.value = true
    this.statistics.globalTimerActive = true
  }

  /**
   * 停止全局定时器
   */
  private stopGlobalTimer(): void {
    if (this.globalTimerId !== null) {
      clearInterval(this.globalTimerId)
      this.globalTimerId = null
    }

    this.isRunning.value = false
    this.statistics.globalTimerActive = false
  }

  /**
   * 执行计划中的任务 - 🔥 优化版本：批量处理和智能调度
   */
  private executeScheduledTasks(): void {
    // 🔴 检查全局轮询开关
    if (!this.globalEnabled.value) {
      // 全局轮询关闭时，不执行任何任务，但保持定时器运行以便随时恢复
      return
    }

    const now = Date.now()
    const readyTasks: PollingTask[] = []

    // 🔥 性能优化：收集所有准备执行的任务
    for (const task of this.getActiveTasks()) {
      if (task.nextExecuteAt && now >= task.nextExecuteAt) {
        readyTasks.push(task)
      }
    }

    // 🔥 性能优化：批量执行，避免单个任务堵塞
    if (readyTasks.length > 0) {
      // 按优先级排序：间隔时间短的任务优先执行
      readyTasks.sort((a, b) => a.interval - b.interval)

      // 并行执行任务（但限制并发数避免过载）
      const batchSize = Math.min(readyTasks.length, 5) // 最多同时执行5个任务
      const batch = readyTasks.slice(0, batchSize)
      Promise.allSettled(batch.map(task => this.executeTask(task, now))).catch(error =>{})
    } else {
      // 当前时间检查
     this.getActiveTasks()
 
    }
  }

  /**
   * 执行单个任务
   * @param task 任务对象
   * @param now 当前时间戳
   */
  private async executeTask(task: PollingTask, now: number): Promise<void> {
    try {
      // 🔍 调试：总是输出执行日志
      // 更新执行时间
      task.lastExecutedAt = now
      task.nextExecuteAt = now + task.interval

      // 执行回调
      await task.callback()

      // 更新统计
      this.statistics.totalExecutions++
    } catch (error) {
      error(`❌ [GlobalPollingManager] 任务执行失败: ${task.componentName}`, error)
    }
  }

  /**
   * 生成任务ID
   * @param componentId 组件ID
   */
  private generateTaskId(componentId: string): string {
    return `polling_${componentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    const allTasks = this.getAllTasks()
    const activeTasks = this.getActiveTasks()

    this.statistics.totalTasks = allTasks.length
    this.statistics.activeTasks = activeTasks.length

    if (allTasks.length > 0) {
      const intervals = allTasks.map(task => task.interval)
      this.statistics.averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      this.statistics.minInterval = Math.min(...intervals)
    } else {
      this.statistics.averageInterval = 0
      this.statistics.minInterval = 0
    }
  }
}

// 创建全局单例实例
let globalPollingManagerInstance: GlobalPollingManager | null = null

/**
 * 获取全局轮询管理器单例
 */
export function useGlobalPollingManager(): GlobalPollingManager {
  if (!globalPollingManagerInstance) {
    globalPollingManagerInstance = new GlobalPollingManager()

    // 在页面卸载时清理
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        globalPollingManagerInstance?.destroy()
      })
    }
  }

  return globalPollingManagerInstance
}

/**
 * 销毁全局轮询管理器实例（主要用于测试）
 */
export function destroyGlobalPollingManager(): void {
  if (globalPollingManagerInstance) {
    globalPollingManagerInstance.destroy()
    globalPollingManagerInstance = null
  }
}
