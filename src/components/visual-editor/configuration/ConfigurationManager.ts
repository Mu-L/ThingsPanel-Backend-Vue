/**
 * 配置管理器
 * 负责管理所有组件的配置数据，提供配置的CRUD操作和事件监听
 *
 * Task 1.2 重构：集成配置事件总线，实现解耦合架构
 */
import { reactive, ref, computed } from 'vue'

import type {
  IConfigurationManager,
  WidgetConfiguration,
  ValidationResult,
  ConfigurationPreset,
  ConfigurationMigrator,
  BaseConfiguration,
  ComponentConfiguration,
  DataSourceConfiguration,
  InteractionConfiguration
} from './types'

// 🔥 导入 SimpleDataBridge 用于清除缓存
import { simpleDataBridge } from '@/core/data-architecture/SimpleDataBridge'

// 🆕 Task 1.2: 导入配置事件总线
import { configEventBus, type ConfigChangeEvent } from '@/core/data-architecture/ConfigEventBus'
import { smartDeepClone } from '@/utils/deep-clone'

/**
 * 默认配置工厂
 * 🔧 重构：各层自治原则 - 配置器只提供空结构，由各层自己填充
 */
export const createDefaultConfiguration = (): WidgetConfiguration => ({
  // 🔧 Base配置：由NodeWrapper层自主管理和定义
  base: {},

  // 🔧 Component配置：由各Card2.1组件自主管理和定义
  component: {},

  // 🔧 DataSource配置：由独立数据源系统管理和定义
  dataSource: {},

  // 🔧 Interaction配置：由独立交互系统管理和定义
  interaction: {},

  // 🔧 元数据：配置器层统一管理
  metadata: {
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: ''
  }
})

/**
 * 配置管理器实现
 */
export class ConfigurationManager implements IConfigurationManager {
  // 存储所有组件的配置
  private configurations = reactive(new Map<string, WidgetConfiguration>())

  // 配置变化监听器
  private listeners = new Map<string, Set<(config: WidgetConfiguration) => void>>()

  // 🆕 Task 1.2: 配置变更上下文跟踪
  private lastUpdatedSection: keyof WidgetConfiguration = 'component'
  private previousConfigs = new Map<string, WidgetConfiguration>()

  // 配置预设
  private presets = ref<ConfigurationPreset[]>([])

  // 配置迁移器
  private migrators: ConfigurationMigrator[] = []

  // 🆕 持久化存储键名
  /**
   * 构造函数 - 🔥 已移除localStorage依赖，符合架构原则
   */
  constructor() {
    // 🔥 配置完全依赖统一配置中心，无需localStorage
  }

  /**
   * 获取组件配置
   */
  getConfiguration(widgetId: string): WidgetConfiguration | null {
    const config = this.configurations.get(widgetId)
    if (!config) {
      return null
    }

    // 🔍 [DEBUG-配置仓库] 打印读取到的配置对象
    // 返回配置的副本，避免外部直接修改
    return this.deepClone(config)
  }

  /**
   * 设置组件配置
   */
  setConfiguration(widgetId: string, config: WidgetConfiguration): void {
    // 验证配置
    const validationResult = this.validateConfiguration(config)
    if (!validationResult.valid) {
      throw new Error(`配置验证失败: ${validationResult.errors?.[0]?.message || '未知错误'}`)
    }

    // 更新时间戳
    const updatedConfig = {
      ...config,
      metadata: {
        ...config.metadata,
        updatedAt: Date.now()
      }
    }
    // 保存配置
    this.configurations.set(widgetId, updatedConfig)
    // 🔥 已移除localStorage持久化 - 配置依赖统一配置中心

    // 触发监听器
    this.notifyListeners(widgetId, updatedConfig)
  }

  /**
   * 更新配置的某个部分
   *
   * 🔥 重要注意：
   * - 数据源配置使用直接替换，避免 deepMerge 导致的无限循环
   * - 其他配置使用深度合并，保持向后兼容性
   */
  updateConfiguration<K extends keyof WidgetConfiguration>(
    widgetId: string,
    section: K,
    config: WidgetConfiguration[K]
  ): void {
    const currentConfig = this.configurations.get(widgetId)
    if (!currentConfig) {
      this.initializeConfiguration(widgetId)
      return this.updateConfiguration(widgetId, section, config)
    }

    // 🆕 Task 1.2: 保存变更前的配置状态
    this.previousConfigs.set(widgetId, this.deepClone(currentConfig))
    this.lastUpdatedSection = section

    // 🔥 关键修复：数据源配置使用替换而不是合并，避免无限循环
    const currentSectionValue = currentConfig[section]
    const mergedSectionValue =
      section === 'dataSource'
        ? (() => {
            return config // 数据源配置直接替换，避免deepMerge导致的循环问题
          })()
        : currentSectionValue !== null && currentSectionValue !== undefined
          ? this.deepMerge(currentSectionValue, config)
          : config // 如果当前值是 null 或 undefined，直接使用新配置

    const updatedConfig = {
      ...currentConfig,
      [section]: mergedSectionValue,
      metadata: {
        ...currentConfig.metadata,
        updatedAt: Date.now()
      }
    }

    this.configurations.set(widgetId, updatedConfig)

    // 🔥 已移除localStorage持久化 - 配置依赖统一配置中心

    // 🔥 重要修复：清除组件缓存，确保新配置能被执行
    if (section === 'dataSource') {
      simpleDataBridge.clearComponentCache(widgetId)
    }
    // 🔍 [DEBUG-配置仓库] 打印整个配置对象
    // 触发监听器
    this.notifyListeners(widgetId, updatedConfig)
  }

  /**
   * 重置配置到默认值
   */
  resetConfiguration(widgetId: string): void {
    const defaultConfig = createDefaultConfiguration()
    this.configurations.set(widgetId, defaultConfig)
    // 触发监听器
    this.notifyListeners(widgetId, defaultConfig)
  }

  /**
   * 初始化组件配置
   */
  initializeConfiguration(widgetId: string, customDefaults?: Partial<WidgetConfiguration>): void {
    if (this.configurations.has(widgetId)) {
      return
    }

    const defaultConfig = createDefaultConfiguration()
    const initialConfig = customDefaults ? this.deepMerge(defaultConfig, customDefaults) : defaultConfig

    this.configurations.set(widgetId, initialConfig)

    // 触发监听器，通知配置已初始化
    this.notifyListeners(widgetId, initialConfig)
  }

  /**
   * 删除组件配置
   */
  removeConfiguration(widgetId: string): boolean {
    const exists = this.configurations.has(widgetId)
    if (exists) {
      this.configurations.delete(widgetId)

      // 清理监听器
      this.listeners.delete(widgetId)
    }
    return exists
  }

  /**
   * 验证配置
   */
  validateConfiguration(config: WidgetConfiguration): ValidationResult {
    const errors: ValidationResult['errors'] = []
    const warnings: ValidationResult['warnings'] = []

    try {
      // 基础配置验证
      if (config.base) {
        if (typeof config.base.showTitle !== 'boolean') {
          errors?.push({
            field: 'base.showTitle',
            message: 'showTitle 必须是布尔值'
          })
        }

        if (config.base.title && typeof config.base.title !== 'string') {
          errors?.push({
            field: 'base.title',
            message: 'title 必须是字符串'
          })
        }

        if (
          config.base.opacity !== undefined &&
          (typeof config.base.opacity !== 'number' || config.base.opacity < 0 || config.base.opacity > 1)
        ) {
          errors?.push({
            field: 'base.opacity',
            message: 'opacity 必须是0-1之间的数值'
          })
        }
      }

      // 数据源配置验证
      if (config.dataSource) {
        const validTypes = ['static', 'api', 'websocket', 'multi-source', 'data-mapping', 'data-source-bindings', '']
        if (config.dataSource.type && !validTypes.includes(config.dataSource.type)) {
          errors?.push({
            field: 'dataSource.type',
            message: '无效的数据源类型'
          })
        }

        // 验证多数据源配置
        if (config.dataSource.type === 'multi-source') {
          if (!config.dataSource.sources || !Array.isArray(config.dataSource.sources)) {
            errors?.push({
              field: 'dataSource.sources',
              message: '多数据源配置必须包含sources数组'
            })
          }
        }

        // 验证数据映射配置
        if (config.dataSource.type === 'data-mapping') {
          if (!config.dataSource.config) {
            errors?.push({
              field: 'dataSource.config',
              message: '数据映射配置必须包含config对象'
            })
          } else {
            // 检查是否包含必要的映射配置
            const mappingConfig = config.dataSource.config
            if (!mappingConfig.arrayDataSource && !mappingConfig.objectDataSource) {
              warnings?.push({
                field: 'dataSource.config',
                message: '建议配置至少一个数据源（数组或对象）'
              })
            }
          }
        }

        // 验证数据源绑定配置（简化验证，主要用于演示）
        if (config.dataSource.type === 'data-source-bindings') {
          if (!config.dataSource.config) {
            // 对于演示组件，config 可以为空，只给出警告
            warnings?.push({
              field: 'dataSource.config',
              message: '数据源绑定配置为空，组件将使用默认数据'
            })
          } else if (config.dataSource.config.dataSourceBindings) {
            // 检查绑定配置的基本结构
            const bindings = config.dataSource.config.dataSourceBindings
            if (typeof bindings !== 'object') {
              warnings?.push({
                field: 'dataSource.config.dataSourceBindings',
                message: '数据源绑定应该是一个对象'
              })
            }
          }
        }
      }

      // 交互配置验证
      if (config.interaction) {
        for (const [eventName, eventConfig] of Object.entries(config.interaction)) {
          if (
            eventConfig &&
            eventConfig.type &&
            !['none', 'link', 'internal_route', 'modal', 'drawer', 'custom_script', 'emit_event'].includes(
              eventConfig.type
            )
          ) {
            errors?.push({
              field: `interaction.${eventName}.type`,
              message: `无效的交互类型: ${eventConfig.type}`
            })
          }
        }
      }

      // 组件配置验证
      if (config.component?.validation?.required) {
        for (const requiredField of config.component.validation.required) {
          if (!config.component.properties[requiredField]) {
            warnings?.push({
              field: `component.properties.${requiredField}`,
              message: `必需字段缺失: ${requiredField}`
            })
          }
        }
      }
    } catch (error) {
      errors?.push({
        field: 'global',
        message: `配置验证异常: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }

    return {
      valid: errors?.length === 0,
      errors: errors?.length ? errors : undefined,
      warnings: warnings?.length ? warnings : undefined
    }
  }

  /**
   * 导出配置
   */
  exportConfiguration(widgetId: string): string {
    const config = this.configurations.get(widgetId)
    if (!config) {
      throw new Error(`配置不存在: ${widgetId}`)
    }

    try {
      return JSON.stringify(config, null, 2)
    } catch (error) {
      throw new Error(`配置导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 导入组件配置
   * @param componentId - 组件ID
   * @param configuration - 要导入的配置
   */
  public importConfiguration(componentId: string, configuration: Record<string, any>): void {
    // 在设置新配置之前，遍历即将被替换的旧配置中的所有数据源，并清除它们的缓存
    const oldConfig = this.configurations[componentId]
    if (oldConfig) {
      for (const key in oldConfig) {
        // 检查属性是否为数据源类型
        if (oldConfig[key] && oldConfig[key].dataType === 'dataSource') {
          this.clearDataSourceCache(componentId, key)
        }
      }
    }

    this.setConfiguration(componentId, configuration)
  }

  /**
   * 监听配置变化
   */
  onConfigurationChange(widgetId: string, callback: (config: WidgetConfiguration) => void): () => void {
    if (!this.listeners.has(widgetId)) {
      this.listeners.set(widgetId, new Set())
    }

    this.listeners.get(widgetId)!.add(callback)

    // 返回取消监听的函数
    return () => {
      const listeners = this.listeners.get(widgetId)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(widgetId)
        }
      }
    }
  }

  /**
   * 获取所有配置
   */
  getAllConfigurations(): Map<string, WidgetConfiguration> {
    return new Map(this.configurations)
  }

  /**
   * 批量更新配置
   */
  batchUpdateConfigurations(updates: Array<{ widgetId: string; config: Partial<WidgetConfiguration> }>): void {
    const timestamp = Date.now()

    for (const { widgetId, config } of updates) {
      const currentConfig = this.configurations.get(widgetId)
      if (currentConfig) {
        const updatedConfig = {
          ...this.deepMerge(currentConfig, config),
          metadata: {
            ...currentConfig.metadata,
            updatedAt: timestamp
          }
        }
        this.configurations.set(widgetId, updatedConfig)
      }
    }
  }

  // 私有方法

  /**
   * 通知监听器
   * Task 1.2 重构：集成事件总线，实现新旧架构并存
   */
  private notifyListeners(widgetId: string, config: WidgetConfiguration): void {
    // 1. 原有监听器通知（向后兼容）
    const listeners = this.listeners.get(widgetId)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(this.deepClone(config))
        } catch (error) {}
      })
    }

    // 2. 🆕 Task 1.2: 发送到事件总线（新架构）
    this.emitToEventBus(widgetId, config)
  }

  /**
   * 🆕 Task 1.2: 向事件总线发送配置变更事件
   */
  private emitToEventBus(widgetId: string, config: WidgetConfiguration): void {
    try {
      const previousConfig = this.previousConfigs.get(widgetId)

      const event: ConfigChangeEvent = {
        componentId: widgetId,
        componentType: '', // 这里无法获取组件类型，由监听器负责过滤
        section: this.lastUpdatedSection,
        oldConfig: previousConfig,
        newConfig: config,
        timestamp: Date.now(),
        source: 'user', // 默认为用户触发
        context: {
          triggerComponent: 'ConfigurationManager',
          shouldTriggerExecution: true,
          changedFields: this.getChangedFields(previousConfig, config)
        }
      }
      // 异步发送事件，避免阻塞当前流程
      configEventBus.emitConfigChange(event).catch(error => {})
    } catch (error) {}
  }

  /**
   * 🆕 Task 1.2: 获取变更的字段列表
   */
  private getChangedFields(oldConfig: WidgetConfiguration | undefined, newConfig: WidgetConfiguration): string[] {
    if (!oldConfig) return []

    const changedFields: string[] = []

    // 检查各个配置层级的变更
    if (JSON.stringify(oldConfig.base) !== JSON.stringify(newConfig.base)) {
      changedFields.push('base')
    }
    if (JSON.stringify(oldConfig.component) !== JSON.stringify(newConfig.component)) {
      changedFields.push('component')
    }
    if (JSON.stringify(oldConfig.dataSource) !== JSON.stringify(newConfig.dataSource)) {
      changedFields.push('dataSource')
    }
    if (JSON.stringify(oldConfig.interaction) !== JSON.stringify(newConfig.interaction)) {
      changedFields.push('interaction')
    }

    return changedFields
  }

  /**
   * 深度克隆对象
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime()) as T
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item)) as T

    const cloned = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key])
      }
    }
    return cloned
  }

  /**
   * 深度合并对象
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = this.deepClone(target)

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key]
        const targetValue = result[key]

        if (sourceValue !== undefined) {
          if (
            typeof sourceValue === 'object' &&
            sourceValue !== null &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            !Array.isArray(sourceValue) &&
            !Array.isArray(targetValue)
          ) {
            result[key] = this.deepMerge(targetValue, sourceValue as any)
          } else {
            result[key] = this.deepClone(sourceValue) as any
          }
        }
      }
    }

    return result
  }

  /**
   * 迁移配置到最新版本
   */
  private migrateConfiguration(config: WidgetConfiguration): WidgetConfiguration {
    let result = config

    for (const migrator of this.migrators) {
      if (config.metadata?.version === migrator.fromVersion) {
        result = migrator.migrate(result)
      }
    }

    return result
  }

  /**
   * 注册配置迁移器
   */
  registerMigrator(migrator: ConfigurationMigrator): void {
    this.migrators.push(migrator)
  }

  /**
   * 添加配置预设
   */
  addPreset(preset: ConfigurationPreset): void {
    this.presets.value.push(preset)
  }

  /**
   * 获取配置预设
   */
  getPresets(componentType?: string): ConfigurationPreset[] {
    if (componentType) {
      return this.presets.value.filter(
        preset => !preset.componentTypes || preset.componentTypes.includes(componentType)
      )
    }
    return [...this.presets.value]
  }

  /**
   * 应用配置预设
   */
  applyPreset(widgetId: string, presetName: string): boolean {
    const preset = this.presets.value.find(p => p.name === presetName)
    if (!preset) {
      return false
    }

    const currentConfig = this.configurations.get(widgetId)
    if (!currentConfig) {
      return false
    }

    const updatedConfig = this.deepMerge(currentConfig, preset.config)
    this.setConfiguration(widgetId, updatedConfig)
    return true
  }

}

// 导出全局配置管理器单例
export const configurationManager = new ConfigurationManager()

export default configurationManager
