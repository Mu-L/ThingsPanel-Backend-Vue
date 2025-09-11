/**
 * Visual Editor 配置系统入口文件
 * 导出所有配置相关的组件、类型和工具
 */

// 🔄 核心管理器 - 统一使用桥接系统确保数据一致性
import { configurationIntegrationBridge as configurationManager } from '@/components/visual-editor/configuration/ConfigurationIntegrationBridge'
import { ConfigurationManager } from '@/components/visual-editor/configuration/ConfigurationManager'
export { configurationManager, ConfigurationManager }

// 类型定义
export type {
  BaseConfiguration,
  ComponentConfiguration,
  InteractionConfiguration,
  WidgetConfiguration,
  InteractionConfig,
  ConfigFormProps,
  ConfigFormEmits,
  ValidationResult,
  IConfigurationManager,
  ConfigFormRegistration,
  ConfigurationPreset,
  ConfigurationGenerator,
  ConfigurationMigrator
} from './types'

// 配置面板组件
export { default as ConfigurationPanel } from '@/components/visual-editor/configuration/ConfigurationPanel.vue'

// 配置表单组件 - 现在从renderers/base目录导入
export { default as BaseConfigForm } from '@/components/visual-editor/renderers/base/BaseConfigForm.vue'
export { default as ComponentConfigForm } from '@/components/visual-editor/renderers/base/ComponentConfigForm.vue'

// 注意：InteractionConfigForm 暂时移除，专注基础测试

// Hooks
export { useConfiguration, type UseConfigurationOptions } from '@/components/visual-editor/configuration/hooks/useConfiguration'

// 工具函数
// 🔄 工具函数 - 通过桥接系统导出，确保一致性
const createDefaultConfiguration = () => configurationManager.createDefaultConfiguration()
export { createDefaultConfiguration }

/**
 * 初始化配置系统
 * 注册默认预设和迁移器
 */
export const initializeConfigurationSystem = () => {
  // 注册默认预设
  configurationManager.addPreset({
    name: 'default',
    description: '默认配置预设',
    config: {
      base: {
        showTitle: true,
        title: '默认标题',
        opacity: 1,
        visible: true,
        customClassName: '',
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        padding: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      component: {
        properties: {},
        styles: {},
        behavior: {},
        validation: { required: [], rules: {} }
      },
      dataSource: null,
      interaction: {}
    },
    category: 'system',
    isSystem: true
  })

  configurationManager.addPreset({
    name: 'minimal',
    description: '极简风格预设',
    config: {
      base: {
        showTitle: false,
        title: '极简组件',
        opacity: 1,
        visible: true,
        customClassName: 'minimal',
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        padding: { top: 8, right: 8, bottom: 8, left: 8 }
      },
      component: {
        properties: {},
        styles: { custom: 'border: none; box-shadow: none;' },
        behavior: {},
        validation: { required: [], rules: {} }
      },
      dataSource: null,
      interaction: {}
    },
    category: 'style',
    isSystem: true
  })

  configurationManager.addPreset({
    name: 'dashboard',
    description: '仪表板风格预设',
    config: {
      base: {
        showTitle: true,
        title: '仪表板组件',
        opacity: 1,
        visible: true,
        customClassName: 'dashboard-widget',
        margin: { top: 4, right: 4, bottom: 4, left: 4 },
        padding: { top: 12, right: 12, bottom: 12, left: 12 }
      },
      component: {
        properties: {},
        styles: {
          custom: 'background: var(--card-color); border-radius: 8px; box-shadow: var(--box-shadow);'
        },
        behavior: {},
        validation: { required: [], rules: {} }
      },
      dataSource: null,
      interaction: {}
    },
    category: 'dashboard',
    isSystem: true
  })

  // 注册配置迁移器（用于版本升级）
  configurationManager.registerMigrator({
    fromVersion: '0.9.0',
    toVersion: '1.0.0',
    migrate: (oldConfig: any) => {
      // 示例：从旧版本迁移到新版本
      return {
        base: {
          showTitle: oldConfig.showLabel || false,
          title: oldConfig.label || '',
          opacity: 1,
          visible: true,
          customClassName: '',
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          padding: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        component: {
          properties: oldConfig.properties || {},
          styles: {},
          behavior: {},
          validation: { required: [], rules: {} }
        },
        dataSource: oldConfig.dataSource || null,
        interaction: oldConfig.interaction || {},
        metadata: {
          version: '1.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          description: 'Migrated from v0.9.0'
        }
      }
    }
  })
}

/**
 * 验证配置系统是否正常工作
 */
export const validateConfigurationSystem = (): boolean => {
  try {
    // 创建测试配置
    const testConfig = createDefaultConfiguration()

    // 验证配置
    const validationResult = configurationManager.validateConfiguration(testConfig)

    if (!validationResult.valid) {
      return false
    }

    // 测试导出导入
    const testId = 'test-widget-config'
    configurationManager.setConfiguration(testId, testConfig)

    const exported = configurationManager.exportConfiguration(testId)
    const imported = configurationManager.importConfiguration(testId + '-copy', exported)

    // 清理测试数据
    configurationManager.removeConfiguration(testId)
    configurationManager.removeConfiguration(testId + '-copy')

    if (!imported) {
      return false
    }
    return true
  } catch (error) {
    return false
  }
}

/**
 * 获取配置系统统计信息
 */
export const getConfigurationSystemStats = () => {
  const allConfigs = configurationManager.getAllConfigurations()
  const presets = configurationManager.getPresets()

  return {
    totalConfigurations: allConfigs.size,
    totalPresets: presets.length,
    systemPresets: presets.filter(p => p.isSystem).length,
    userPresets: presets.filter(p => !p.isSystem).length,
    configurationIds: Array.from(allConfigs.keys()),
    presetNames: presets.map(p => p.name)
  }
}

// 默认导出配置管理器实例
export default configurationManager
