/**
 * Card2.1 组件交互管理器
 * 负责管理所有组件的交互配置和状态
 */

import type {
  InteractionConfig,
  InteractionResponse,
  ComponentInteractionState,
  InteractionEventType,
  InteractionResponseResult,
  ConditionConfig,
  ComparisonOperator,
  NavigationConfig,
  DataUpdateConfig,
  FlashConfig,
  CrossComponentResponse,
  JumpConfig,
  ModifyConfig
} from './interaction-types'
import { InteractionAdapter } from './interaction-adapter'
import { VisualEditorBridge } from '@/core/data-architecture/VisualEditorBridge'
import { propertyBindingLogger } from '@/utils/logger'

class InteractionManager {
  private componentConfigs = new Map<string, InteractionConfig[]>()
  private componentStates = new Map<string, ComponentInteractionState>()
  private eventListeners = new Map<string, Set<(data: any) => void>>()
  private visualEditorBridge = new VisualEditorBridge()

  // 🔥 新增：存储需要响应属性变化的HTTP数据源映射
  private httpDataSourceMappings = new Map<string, { componentId: string; componentType: string; config: any }>()

  /**
   * 注册组件的交互配置
   */
  registerComponent(componentId: string, configs: InteractionConfig[]): void {
    this.componentConfigs.set(componentId, configs)
    // 初始化组件状态
    this.componentStates.set(componentId, {})
  }

  /**
   * 移除组件的交互配置
   */
  unregisterComponent(componentId: string, configs: InteractionConfig[]): void {
    this.componentConfigs.delete(componentId)
    this.componentStates.delete(componentId)
    this.eventListeners.delete(componentId)
  }

  /**
   * 触发交互事件
   */
  triggerEvent(componentId: string, event: InteractionEventType, data?: any): InteractionResponseResult[] {
    const configs = this.componentConfigs.get(componentId)
    if (!configs) {
      return [
        {
          success: false,
          componentId,
          action: 'custom' as any,
          error: `组件 ${componentId} 未注册`
        }
      ]
    }

    const results: InteractionResponseResult[] = []
    const eventConfigs = configs.filter(config => config.event === event && config.enabled !== false)
    // 按优先级排序
    eventConfigs.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    for (const config of eventConfigs) {
      // 🔥 修复：对于 dataChange 事件，需要检查条件
      if (event === 'dataChange' && config.condition) {
        // 检查属性变化条件
        const shouldExecute = this.checkDataChangeCondition(config, data)

        if (!shouldExecute) {
          continue
        }
      }

      // 🔥 重点：检查是否有响应动作
      if (!config.responses || config.responses.length === 0) {
        continue
      }

      // 执行响应动作
      for (const response of config.responses) {
        try {
          const result = this.executeResponse(componentId, response)
          results.push(result)
        } catch (error) {
          results.push({
            success: false,
            componentId,
            action: response.action,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }

    // 触发事件监听器
    this.triggerEventListeners(componentId, event, data)
    return results
  }

  /**
   * 执行交互响应
   */
  private executeResponse(componentId: string, response: InteractionResponse): InteractionResponseResult {
    const currentState = this.componentStates.get(componentId) || {}
    let oldValue: any
    let newValue: any

    // 🔥 使用适配器统一处理新旧格式
    const normalizedResponse = InteractionAdapter.normalizeToNewFormat(response as any)
    const actionType = InteractionAdapter.getUnifiedActionType(response as any)

    switch (response.action) {
      case 'changeBackgroundColor':
        oldValue = currentState.backgroundColor
        newValue = response.value
        this.updateComponentState(componentId, { backgroundColor: newValue })
        break

      case 'changeTextColor':
        oldValue = currentState.textColor
        newValue = response.value
        this.updateComponentState(componentId, { textColor: newValue })
        break

      case 'changeBorderColor':
        oldValue = currentState.borderColor
        newValue = response.value
        this.updateComponentState(componentId, { borderColor: newValue })
        break

      case 'changeSize':
        oldValue = { width: currentState.width, height: currentState.height }
        newValue = response.value
        this.updateComponentState(componentId, {
          width: newValue.width || currentState.width,
          height: newValue.height || currentState.height
        })
        break

      case 'changeOpacity':
        oldValue = currentState.opacity
        newValue = response.value
        this.updateComponentState(componentId, { opacity: newValue })
        break

      case 'changeTransform':
        oldValue = currentState.transform
        newValue = response.value
        this.updateComponentState(componentId, { transform: newValue })
        break

      case 'changeVisibility':
        oldValue = currentState.visibility
        newValue = response.value
        this.updateComponentState(componentId, { visibility: newValue })
        break

      case 'changeContent':
        oldValue = currentState.content
        newValue = response.value
        this.updateComponentState(componentId, { content: newValue })
        break

      // 🔥 移除动画功能

      // 🔥 新版本动作类型 - jump (URL跳转)
      case 'jump':
        oldValue = undefined
        if (response.jumpConfig) {
          // 使用新的 jumpConfig 结构
          newValue = response.jumpConfig
          this.handleJumpAction(response.jumpConfig)
        } else {
          // 向后兼容：从旧字段提取数据
          const legacyUrl = response.value as string
          const legacyTarget = response.target || '_self'
          newValue = { jumpType: 'external', url: legacyUrl, target: legacyTarget }
          this.handleNavigateToUrl(response)
        }
        break

      // 🔥 新版本动作类型 - modify (修改组件属性)
      case 'modify':
        oldValue = currentState
        if (response.modifyConfig) {
          // 使用新的 modifyConfig 结构
          newValue = response.modifyConfig
          this.handleModifyAction(componentId, response.modifyConfig)
        } else {
          // 向后兼容：从旧字段提取数据
          newValue = response.value
          if (response.targetComponentId) {
            this.updateTargetComponentData(response.targetComponentId, response)
          } else {
            this.updateComponentState(componentId, response.value)
          }
        }
        break

      // 🔥 保留旧版本动作类型以支持向后兼容
      case 'navigateToUrl':
        this.handleNavigateToUrl(response)
        oldValue = undefined
        newValue = response.value
        break

      case 'updateComponentData':
        oldValue = currentState
        newValue = response.value
        // 对于跨组件数据更新，需要找到目标组件
        if (response.targetComponentId) {
          this.updateTargetComponentData(response.targetComponentId, response)
        } else {
          this.updateComponentState(componentId, response.value)
        }
        break

      case 'flashColor':
        this.handleFlashColor(componentId, response.value)
        oldValue = currentState.backgroundColor
        newValue = response.value
        break

      case 'conditionalStyle':
        oldValue = currentState
        newValue = response.value
        this.applyConditionalStyle(componentId, response.value)
        break

      case 'callFunction':
        this.handleCallFunction(componentId, response.value)
        oldValue = undefined
        newValue = response.value
        break

      case 'custom':
        oldValue = currentState
        newValue = response.value
        // 自定义动作，直接更新状态
        if (typeof response.value === 'object') {
          this.updateComponentState(componentId, response.value)
        }
        break

      default:
        throw new Error(`不支持的交互动作: ${response.action}`)
    }

    return {
      success: true,
      componentId,
      action: response.action,
      oldValue,
      newValue
    }
  }

  /**
   * 更新组件状态
   */
  private updateComponentState(componentId: string, updates: Partial<ComponentInteractionState>): void {
    const currentState = this.componentStates.get(componentId) || {}
    const newState = { ...currentState, ...updates }
    this.componentStates.set(componentId, newState)

    // 🔥 通知目标组件状态变化
    this.notifyComponentStateChange(componentId, updates, newState)
  }

  /**
   * 通知组件状态变化
   */
  private notifyComponentStateChange(
    componentId: string,
    updates: Partial<ComponentInteractionState>,
    fullState: ComponentInteractionState
  ): void {
    // 尝试通过DOM事件通知组件
    const targetElement = document.querySelector(`[data-component-id="${componentId}"]`)

    if (targetElement) {
      const customEvent = new CustomEvent('componentStateUpdate', {
        detail: {
          componentId,
          updates,
          fullState
        },
        bubbles: true
      })

      targetElement.dispatchEvent(customEvent)
    }
  }

  /**
   * 🔥 新增：通知组件属性更新 - 支持 settingConfig 属性绑定
   * 用于跨组件属性绑定，将一个组件的属性变更传递给另一个组件
   */
  notifyPropertyUpdate(componentId: string, propertyPath: string, newValue: any, oldValue?: any): void {
    // 🔥 新增：触发HTTP数据源刷新
    this.triggerHttpRefreshForPropertyChange(componentId, propertyPath, newValue, oldValue)

    // 通过 DOM 事件通知组件属性更新
    const targetElement = document.querySelector(`[data-component-id="${componentId}"]`)

    if (targetElement) {
      const propertyUpdateEvent = new CustomEvent('componentPropertyUpdate', {
        detail: {
          componentId,
          propertyPath,
          value: newValue,
          oldValue,
          timestamp: Date.now()
        },
        bubbles: true
      })

      targetElement.dispatchEvent(propertyUpdateEvent)
    }
    // 同时触发交互系统的 dataChange 事件
    this.triggerEvent(componentId, 'dataChange', {
      property: propertyPath,
      newValue,
      oldValue,
      timestamp: Date.now()
    })
  }

  /**
   * 🔥 新增：批量属性更新
   * 一次性更新组件的多个属性
   */
  batchPropertyUpdate(
    componentId: string,
    propertyUpdates: Array<{
      propertyPath: string
      newValue: any
      oldValue?: any
    }>
  ): void {
    const targetElement = document.querySelector(`[data-component-id="${componentId}"]`)

    if (targetElement) {
      // 发送批量更新事件
      const batchUpdateEvent = new CustomEvent('componentBatchPropertyUpdate', {
        detail: {
          componentId,
          updates: propertyUpdates,
          timestamp: Date.now()
        },
        bubbles: true
      })

      targetElement.dispatchEvent(batchUpdateEvent)

      // 同时发送单个更新事件（向后兼容）
      propertyUpdates.forEach(update => {
        this.notifyPropertyUpdate(componentId, update.propertyPath, update.newValue, update.oldValue)
      })
    }
  }

  /**
   * 获取组件的交互状态
   */
  getComponentState(componentId: string): ComponentInteractionState | undefined {
    return this.componentStates.get(componentId)
  }

  /**
   * 重置组件的交互状态
   */
  resetComponentState(componentId: string): void {
    this.componentStates.set(componentId, {})
  }

  /**
   * 批量更新组件的交互配置
   */
  updateComponentConfigs(componentId: string, configs: InteractionConfig[]): void {
    this.componentConfigs.set(componentId, configs)
  }

  /**
   * 添加事件监听器
   */
  addEventListener(componentId: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(componentId)) {
      this.eventListeners.set(componentId, new Set())
    }
    this.eventListeners.get(componentId)!.add(callback)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(componentId: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(componentId)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * 触发事件监听器
   */
  private triggerEventListeners(componentId: string, event: InteractionEventType, data?: any): void {
    const listeners = this.eventListeners.get(componentId)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback({ event, data, componentId })
        } catch (error) {}
      })
    }
  }

  /**
   * 获取所有已注册的组件ID
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.componentConfigs.keys())
  }

  /**
   * 获取组件的交互配置
   */
  getComponentConfigs(componentId: string): InteractionConfig[] | undefined {
    return this.componentConfigs.get(componentId)
  }

  /**
   * 检查组件是否已注册
   */
  hasComponent(componentId: string): boolean {
    return this.componentConfigs.has(componentId)
  }

  // ===== 新增的动作处理方法 =====

  // ===== 新版本动作处理方法 =====

  /**
   * 处理跳转动作 (新版本)
   */
  private handleJumpAction(jumpConfig: JumpConfig): void {
    if (jumpConfig.jumpType === 'external') {
      // 外部URL跳转
      if (!jumpConfig.url) {
        return
      }
      this.navigateToUrl(jumpConfig.url, jumpConfig.target || '_self', jumpConfig.windowFeatures)
    } else if (jumpConfig.jumpType === 'internal') {
      // 内部菜单跳转
      if (!jumpConfig.internalPath) {
        return
      }
      this.navigateToUrl(jumpConfig.internalPath, jumpConfig.target || '_self')
    }
  }

  /**
   * 处理修改动作 (新版本)
   */
  private handleModifyAction(sourceComponentId: string, modifyConfig: ModifyConfig): void {
    const { targetComponentId, targetProperty, updateValue, updateMode = 'replace' } = modifyConfig

    if (!this.hasComponent(targetComponentId)) {
      return
    }

    const currentState = this.getComponentState(targetComponentId) || {}
    let finalValue = updateValue

    // 根据更新模式处理值
    const currentValue = currentState[targetProperty]
    switch (updateMode) {
      case 'append':
        if (currentValue !== undefined) {
          finalValue = String(currentValue) + String(updateValue)
        }
        break
      case 'prepend':
        if (currentValue !== undefined) {
          finalValue = String(updateValue) + String(currentValue)
        }
        break
      case 'replace':
      default:
        // 直接使用新值
        break
    }

    // 更新目标组件状态
    const updateData: Partial<ComponentInteractionState> = {
      [targetProperty]: finalValue
    }

    this.updateComponentState(targetComponentId, updateData)
  }

  /**
   * 通用URL导航方法
   */
  private navigateToUrl(url: string, target: string = '_self', windowFeatures?: string): void {
    try {
      if (target === '_self') {
        // 当前窗口跳转
        window.location.href = url
      } else if (target === '_blank') {
        // 新窗口打开，支持窗口特性配置
        if (windowFeatures) {
          window.open(url, target, windowFeatures)
        } else {
          window.open(url, target)
        }
      } else {
        // 其他目标(_parent, _top等)
        window.open(url, target)
      }
    } catch (error) {
      // 如果跳转失败，尝试简单的window.open
      try {
        window.open(url, '_blank')
      } catch (fallbackError) {}
    }
  }

  // ===== 旧版本动作处理方法 (保留兼容性) =====

  /**
   * 处理URL跳转 (旧版本)
   */
  private handleNavigateToUrl(response: InteractionResponse): void {
    const url = response.value as string
    const target = (response.target as string) || '_self'
    const windowFeatures = (response.windowFeatures as string) || ''

    if (!url) {
      return
    }

    try {
      if (target === '_self') {
        // 当前窗口跳转
        window.location.href = url
      } else if (target === '_blank') {
        // 新窗口打开，支持窗口特性配置
        if (windowFeatures) {
          window.open(url, target, windowFeatures)
        } else {
          window.open(url, target)
        }
      } else {
        // 其他目标(_parent, _top等)
        window.open(url, target)
      }
    } catch (error) {
      // 如果跳转失败，尝试简单的window.open
      try {
        window.open(url, '_blank')
      } catch (fallbackError) {}
    }
  }

  /**
   * 处理闪烁颜色效果
   */
  private handleFlashColor(componentId: string, config: FlashConfig | string): void {
    let flashConfig: FlashConfig

    if (typeof config === 'string') {
      flashConfig = {
        color: config,
        duration: 1000,
        times: 3
      }
    } else {
      flashConfig = config
    }

    const currentState = this.getComponentState(componentId)
    const originalColor = currentState?.backgroundColor

    let currentFlash = 0
    const interval = setInterval(
      () => {
        // 切换颜色
        const isFlashOn = currentFlash % 2 === 0
        this.updateComponentState(componentId, {
          backgroundColor: isFlashOn ? flashConfig.color : originalColor
        })

        currentFlash++
        if (currentFlash >= flashConfig.times * 2) {
          clearInterval(interval)
          // 恢复原始颜色
          this.updateComponentState(componentId, {
            backgroundColor: originalColor
          })
        }
      },
      flashConfig.duration / (flashConfig.times * 2)
    )
  }

  /**
   * 更新目标组件数据
   */
  private updateTargetComponentData(targetComponentId: string, response: InteractionResponse): void {
    if (!this.hasComponent(targetComponentId)) {
      return
    }

    // 使用新的InteractionResponse格式
    if (response.targetProperty && response.updateValue !== undefined) {
      const currentState = this.getComponentState(targetComponentId) || {}
      let newValue = response.updateValue

      // 根据更新模式处理值
      const updateMode = response.updateMode || 'replace'
      const targetProperty = response.targetProperty
      const currentValue = currentState[targetProperty]

      switch (updateMode) {
        case 'append':
          if (currentValue !== undefined) {
            newValue = String(currentValue) + String(newValue)
          }
          break
        case 'prepend':
          if (currentValue !== undefined) {
            newValue = String(newValue) + String(currentValue)
          }
          break
        case 'replace':
        default:
          // 直接使用新值
          break
      }

      // 🔥 增强：特殊处理visibility属性确保正确应用
      const updateData: Partial<ComponentInteractionState> = {
        [targetProperty]: newValue
      }

      // 如果是可见性属性，确保直接应用到CSS样式
      if (targetProperty === 'visibility') {
        updateData.visibility = newValue as string
      }

      // 更新目标组件状态
      this.updateComponentState(targetComponentId, updateData)
    } else {
      // 如果没有指定targetProperty，直接更新整个状态
      this.updateComponentState(targetComponentId, response.value)
    }
  }

  /**
   * 应用条件样式
   */
  private applyConditionalStyle(componentId: string, styleConfig: any): void {
    if (typeof styleConfig === 'object') {
      this.updateComponentState(componentId, styleConfig)
    }
  }

  /**
   * 调用函数
   */
  private handleCallFunction(componentId: string, functionConfig: any): void {
    try {
      if (typeof functionConfig === 'string') {
        // 如果是字符串，尝试作为函数名调用
        if (window[functionConfig] && typeof window[functionConfig] === 'function') {
          window[functionConfig](componentId)
        }
      } else if (typeof functionConfig === 'function') {
        // 直接调用函数
        functionConfig(componentId)
      } else if (functionConfig && typeof functionConfig.name === 'string') {
        // 配置对象，包含函数名和参数
        const funcName = functionConfig.name
        const args = functionConfig.args || []
        if (window[funcName] && typeof window[funcName] === 'function') {
          window[funcName](componentId, ...args)
        }
      }
    } catch (error) {}
  }

  // ===== 条件判断方法 =====

  /**
   * 🔥 检查 dataChange 事件的条件
   * 专门处理属性变化事件的条件判断
   */
  private checkDataChangeCondition(config: InteractionConfig, eventData: any): boolean {
    const condition = config.condition
    if (!condition) return true // 没有条件则直接执行

    // 检查是否为指定属性的变化
    if (condition.property && eventData?.property !== condition.property) {
      return false
    }

    // 使用新值进行条件判断
    const valueToCheck = eventData?.newValue

    // 根据条件类型进行判断
    switch (condition.operator) {
      case 'equals': {
        const result = String(valueToCheck) === String(condition.value)
        return result
      }

      case 'notEquals':
        return String(valueToCheck) !== String(condition.value)

      case 'greaterThan':
        return Number(valueToCheck) > Number(condition.value)

      case 'greaterThanOrEqual':
        return Number(valueToCheck) >= Number(condition.value)

      case 'lessThan':
        return Number(valueToCheck) < Number(condition.value)

      case 'lessThanOrEqual':
        return Number(valueToCheck) <= Number(condition.value)

      case 'contains':
        return String(valueToCheck).includes(String(condition.value))

      case 'startsWith':
        return String(valueToCheck).startsWith(String(condition.value))

      case 'endsWith':
        return String(valueToCheck).endsWith(String(condition.value))

      default:
        return false
    }
  }

  /**
   * 评估条件是否满足
   */
  evaluateCondition(condition: ConditionConfig, data: any): boolean {
    if (!condition || !data) return false

    switch (condition.type) {
      case 'comparison':
        return this.evaluateComparison(condition, data)
      case 'range':
        return this.evaluateRange(condition, data)
      case 'expression':
        return this.evaluateExpression(condition, data)
      default:
        return false
    }
  }

  /**
   * 评估比较条件
   */
  private evaluateComparison(condition: ConditionConfig, data: any): boolean {
    const value = condition.field ? data[condition.field] : data
    const compareValue = condition.value

    switch (condition.operator) {
      case 'equals':
        return value == compareValue
      case 'notEquals':
        return value != compareValue
      case 'greaterThan':
        return Number(value) > Number(compareValue)
      case 'greaterThanOrEqual':
        return Number(value) >= Number(compareValue)
      case 'lessThan':
        return Number(value) < Number(compareValue)
      case 'lessThanOrEqual':
        return Number(value) <= Number(compareValue)
      case 'contains':
        return String(value).includes(String(compareValue))
      case 'startsWith':
        return String(value).startsWith(String(compareValue))
      case 'endsWith':
        return String(value).endsWith(String(compareValue))
      default:
        return false
    }
  }

  /**
   * 评估范围条件
   */
  private evaluateRange(condition: ConditionConfig, data: any): boolean {
    const value = condition.field ? data[condition.field] : data
    const numValue = Number(value)
    const min = Number(condition.minValue)
    const max = Number(condition.maxValue)

    return numValue >= min && numValue <= max
  }

  /**
   * 评估表达式条件
   */
  private evaluateExpression(condition: ConditionConfig, data: any): boolean {
    if (!condition.expression) return false

    try {
      // 创建一个安全的评估环境
      const expression = condition.expression.replace(/\bvalue\b/g, 'data')
      // 简单的表达式评估，实际项目中可能需要更安全的方式
      return new Function('data', `return ${expression}`)(data)
    } catch (error) {
      return false
    }
  }

  /**
   * 触发条件检查和执行
   */
  checkAndTriggerConditional(componentId: string, data: any): void {
    const configs = this.componentConfigs.get(componentId)
    if (!configs) return

    // 过滤条件触发和数据变化事件的配置
    const conditionalConfigs = configs.filter(
      config =>
        (config.event === 'conditional' || config.event === 'dataChange') &&
        config.enabled !== false &&
        config.condition
    )

    for (const config of conditionalConfigs) {
      if (config.condition && this.evaluateCondition(config.condition, data)) {
        // 条件满足，执行响应动作
        for (const response of config.responses) {
          try {
            this.executeResponse(componentId, response)
          } catch (error) {}
        }
      }
    }
  }

  /**
   * 监听数据变化并触发条件检查
   */
  onDataChange(componentId: string, dataPath: string, newValue: any): void {
    // 检查是否有数据变化监听配置
    const configs = this.componentConfigs.get(componentId)
    if (!configs) return

    const dataChangeConfigs = configs.filter(
      config => config.event === 'dataChange' && config.dataPath === dataPath && config.enabled !== false
    )

    for (const config of dataChangeConfigs) {
      if (config.condition) {
        // 有条件的数据变化
        if (this.evaluateCondition(config.condition, newValue)) {
          this.executeConfigResponses(componentId, config)
        }
      } else {
        // 无条件的数据变化
        this.executeConfigResponses(componentId, config)
      }
    }
  }

  /**
   * 执行配置的所有响应动作
   */
  private executeConfigResponses(componentId: string, config: InteractionConfig): void {
    for (const response of config.responses) {
      try {
        this.executeResponse(componentId, response)
      } catch (error) {}
    }
  }

  // ===== 🔥 新增：属性绑定和参数解析支持 =====

  /**
   * 解析属性绑定表达式
   * 支持格式：componentId.customize.title 或 componentId.data.value
   */
  resolvePropertyBinding(bindingExpression: string): any {
    if (!bindingExpression || typeof bindingExpression !== 'string') {
      return undefined
    }

    // 解析绑定表达式格式：componentId.propertyPath
    const parts = bindingExpression.split('.')
    if (parts.length < 2) {
      return undefined
    }

    const componentId = parts[0]
    const propertyPath = parts.slice(1).join('.')

    // 获取组件状态
    const componentState = this.getComponentState(componentId)
    if (!componentState) {
      return undefined
    }

    // 解析嵌套属性路径
    const value = this.getNestedProperty(componentState, propertyPath)

    return value
  }

  /**
   * 批量解析属性绑定
   * 用于 HTTP 参数中包含多个绑定表达式的情况
   */
  resolveMultipleBindings(bindingMap: Record<string, string>): Record<string, any> {
    const resolvedValues: Record<string, any> = {}

    for (const [key, bindingExpression] of Object.entries(bindingMap)) {
      resolvedValues[key] = this.resolvePropertyBinding(bindingExpression)
    }
    return resolvedValues
  }

  /**
   * 处理动态参数解析
   * 用于 HttpConfigForm 中的参数绑定
   */
  resolveDynamicParameter(parameterConfig: any): any {
    if (!parameterConfig) return undefined

    // 如果是简单的字符串绑定表达式
    if (typeof parameterConfig === 'string') {
      return this.resolvePropertyBinding(parameterConfig)
    }

    // 如果是复杂的参数配置对象
    if (
      parameterConfig.type === 'component-property-binding' &&
      parameterConfig.componentId &&
      parameterConfig.propertyPath
    ) {
      const bindingExpression = `${parameterConfig.componentId}.${parameterConfig.propertyPath}`
      return this.resolvePropertyBinding(bindingExpression)
    }

    // 如果是静态值
    if (parameterConfig.type === 'static' || parameterConfig.value !== undefined) {
      return parameterConfig.value
    }
    return undefined
  }

  /**
   * 🔥 新增：设置组件属性值
   * 用于从外部（如 HTTP 响应）更新组件属性
   */
  setComponentProperty(componentId: string, propertyPath: string, newValue: any): boolean {
    const currentState = this.getComponentState(componentId) || {}
    const oldValue = this.getNestedProperty(currentState, propertyPath)

    // 更新组件状态
    const updatedState = this.setNestedProperty(currentState, propertyPath, newValue)
    this.componentStates.set(componentId, updatedState)

    // 通知组件属性更新
    this.notifyPropertyUpdate(componentId, propertyPath, newValue, oldValue)

    return true
  }

  /**
   * 获取嵌套对象属性
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined
    }, obj)
  }

  /**
   * 设置嵌套对象属性
   */
  private setNestedProperty(obj: any, path: string, value: any): any {
    const result = { ...obj }
    const keys = path.split('.')
    let current = result

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {}
      } else {
        current[key] = { ...current[key] }
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
    return result
  }

  /**
   * 🔥 新增：获取所有组件的当前属性状态
   * 用于调试和监控
   */
  getAllComponentProperties(): Record<string, ComponentInteractionState> {
    const allProperties: Record<string, ComponentInteractionState> = {}

    for (const [componentId, state] of this.componentStates.entries()) {
      allProperties[componentId] = { ...state }
    }

    return allProperties
  }

  /**
   * 🔥 新增：注册HTTP数据源映射
   * 用于追踪哪些组件有HTTP数据源需要响应属性变化
   */
  registerHttpDataSource(componentId: string, componentType: string, config: any): void {
    const mappingKey = `http-${componentId}`
    this.httpDataSourceMappings.set(mappingKey, { componentId, componentType, config })
  }

  /**
   * 🔥 新增：移除HTTP数据源映射
   */
  unregisterHttpDataSource(componentId: string): void {
    const mappingKey = `http-${componentId}`
    this.httpDataSourceMappings.delete(mappingKey)
  }

  /**
   * 🔥 新增：触发HTTP数据源刷新（属性变化时）
   * 这是解决组件属性绑定后HTTP不更新的核心方法
   */
  private async triggerHttpRefreshForPropertyChange(
    componentId: string,
    propertyPath: string,
    newValue: any,
    oldValue?: any
  ): Promise<void> {
    try {
      // 🔥 关键修复：查找所有可能受到这个属性变化影响的HTTP数据源
      const affectedDataSources: string[] = []

      // 1. 检查是否有直接使用这个组件属性的HTTP配置
      for (const [mappingKey, mapping] of this.httpDataSourceMappings.entries()) {
        // 检查HTTP配置中是否包含对这个组件属性的绑定引用
        if (this.configContainsPropertyBinding(mapping.config, componentId, propertyPath)) {
          affectedDataSources.push(mapping.componentId)
        }
      }

      // 2. 如果没有发现直接绑定，尝试刷新所有HTTP数据源（作为后备方案）
      if (affectedDataSources.length === 0) {
        for (const [mappingKey, mapping] of this.httpDataSourceMappings.entries()) {
          affectedDataSources.push(mapping.componentId)
        }
      }

      // 3. 刷新所有受影响的HTTP数据源
      for (const targetComponentId of affectedDataSources) {
        const mapping = this.httpDataSourceMappings.get(`http-${targetComponentId}`)
        if (mapping) {
          try {
            // 使用VisualEditorBridge刷新数据源
            const result = await this.visualEditorBridge.updateComponentExecutor(
              mapping.componentId,
              mapping.componentType,
              mapping.config
            )
          } catch (error) {}
        }
      }
    } catch (error) {}
  }

  /**
   * 🔥 新增：检查配置是否包含特定的属性绑定
   * 用于判断HTTP配置是否依赖某个组件的属性
   */
  private configContainsPropertyBinding(config: any, componentId: string, propertyPath: string): boolean {
    if (!config) return false

    const bindingPath = `${componentId}.${propertyPath}`
    const configStr = JSON.stringify(config)

    // 检查配置中是否包含绑定路径
    const hasBinding = configStr.includes(bindingPath)

    return hasBinding
  }

  /**
   * 🔥 新增：监听组件属性变化
   * 用于实现属性绑定的响应式更新
   */
  watchComponentProperty(
    componentId: string,
    propertyPath: string,
    callback: (newValue: any, oldValue: any) => void
  ): () => void {
    const watchKey = `${componentId}.${propertyPath}`

    // 创建属性变化监听器
    const propertyWatcher = (data: any) => {
      if (data.event === 'dataChange' && data.data?.property === propertyPath) {
        callback(data.data.newValue, data.data.oldValue)
      }
    }

    this.addEventListener(componentId, propertyWatcher)

    // 返回取消监听的函数
    return () => {
      this.removeEventListener(componentId, propertyWatcher)
    }
  }
}

// 创建单例实例
export const interactionManager = new InteractionManager()

// 导出类型
export type { InteractionManager }
