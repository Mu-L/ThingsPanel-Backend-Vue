# PanelV2 - 高级可视化面板系统

## 🎯 项目概述

PanelV2 是一个功能强大的 Vue 3 组件，提供了完整的可视化面板解决方案。它具有高度的可扩展性、丰富的功能特性和优秀的用户体验。

## ✨ 核心特性

### 🏗️ 架构设计
- **组件化架构**: 模块化设计，职责分明
- **插件系统**: 完整的插件生命周期管理
- **状态管理**: 基于 Pinia 的响应式状态管理
- **类型安全**: 完整的 TypeScript 支持

### 🎨 用户界面
- **拖拽布局**: 基于 GridStack 的网格布局系统
- **上下文菜单**: 丰富的右键菜单操作
- **主题系统**: 多套内置主题，支持自定义
- **响应式设计**: 适配各种屏幕尺寸

### 🔧 编辑功能
- **可视化编辑**: 所见即所得的编辑体验
- **撤销/重做**: 完整的历史记录管理
- **快捷键支持**: 丰富的键盘快捷操作
- **配置驱动**: 基于配置的组件渲染

### 📊 数据处理
- **数据绑定**: 支持多种数据源绑定
- **实时更新**: WebSocket、API 等实时数据支持
- **数据转换**: 灵活的数据处理管道

### 🔌 扩展能力
- **插件系统**: 动态加载、热插拔
- **自定义组件**: 易于扩展的组件体系
- **API 开放**: 丰富的扩展接口

## 📁 项目结构

```
src/components/panelv2/
├── README.md                    # 项目文档
├── ARCHITECTURE.md              # 架构设计文档
├── PanelV2.vue                  # 主入口组件
├── types.ts                     # 类型定义
│
├── canvas/                      # 画布模块
│   └── Canvas.vue               # 画布组件
│
├── cards/                       # 内置卡片组件
│   ├── TextCard.vue             # 文本卡片
│   ├── ImageCard.vue            # 图片卡片
│   └── TableCard.vue            # 表格卡片
│
├── sidebar/                     # 侧边栏模块
│   └── Sidebar.vue              # 组件面板
│
├── toolbar/                     # 工具栏模块
│   └── Toolbar.vue              # 操作工具栏
│
├── inspector/                   # 配置器模块
│   ├── Inspector.vue            # 属性配置面板
│   ├── components/              # 配置器组件
│   │   ├── TextInput.vue        # 文本输入
│   │   ├── ColorPicker.vue      # 颜色选择器
│   │   ├── SliderInput.vue      # 滑块输入
│   │   ├── SwitchInput.vue      # 开关输入
│   │   ├── SelectInput.vue      # 下拉选择
│   │   └── ImageInput.vue       # 图片上传
│   └── inspectors/              # 专用配置器
│       ├── PanelInspector.vue   # 面板配置器
│       └── TextCardInspector.vue # 文本卡片配置器
│
├── state/                       # 状态管理
│   └── panelStore.ts            # Pinia 状态管理
│
├── plugins/                     # 插件系统
│   ├── index.ts                 # 插件系统入口
│   ├── types.ts                 # 插件类型定义
│   ├── PluginManager.ts         # 插件管理器
│   ├── EventBus.ts              # 事件总线
│   ├── PluginConfig.vue         # 插件配置界面
│   ├── composables/             # 组合式API
│   │   └── usePlugin.ts         # 插件相关钩子
│   ├── loaders/                 # 插件加载器
│   │   ├── ModuleLoader.ts      # ES模块加载器
│   │   └── JsonLoader.ts        # JSON配置加载器
│   ├── examples/                # 示例插件
│   │   └── ChartPlugin.ts       # 图表插件示例
│   ├── PLUGIN_DEVELOPMENT.md    # 插件开发指南
│   └── README.md                # 插件系统文档
│
├── themes/                      # 主题系统
│   └── ThemeManager.ts          # 主题管理器
│
├── layouts/                     # 布局系统
│   ├── LayoutManager.ts         # 布局管理器
│   └── engines/                 # 布局引擎
│       └── GridStackEngine.ts   # GridStack引擎
│
├── data/                        # 数据管理
│   └── DataManager.ts           # 数据源管理器
│
├── utils/                       # 工具函数
│   └── ImportExport.ts          # 导入导出工具
│
├── composables/                 # 组合式API
│   ├── useContextMenu.ts        # 上下文菜单
│   ├── useKeyboard.ts           # 快捷键管理
│   └── useHistory.ts            # 历史记录管理
│
├── common/                      # 通用组件
│   └── ContextMenu.vue          # 上下文菜单组件
│
└── demo/                        # 演示系统
    ├── PanelV2Demo.vue          # 基础演示
    ├── PluginDemo.vue           # 插件演示
    └── ComprehensiveDemo.vue    # 综合演示
```

## 🚀 快速开始

### 基础使用

```vue
<template>
  <PanelV2 
    :plugins="plugins"
    :enablePluginSystem="true"
  >
    <template #card="{ cardData }">
      <component 
        :is="getCardComponent(cardData.type)" 
        :config="cardData.config"
      />
    </template>
  </PanelV2>
</template>

<script setup>
import PanelV2 from '@/components/panelv2/PanelV2.vue'
import { ChartPlugin } from '@/components/panelv2/plugins'

const plugins = [ChartPlugin]

const getCardComponent = (type) => {
  // 组件解析逻辑
}
</script>
```

### 高级配置

```vue
<template>
  <PanelV2
    :initialState="initialPanelState"
    :plugins="customPlugins"
    :toolbarActions="customActions"
    :draggableItems="customItems"
    :inspectorRegistry="customInspectors"
    :enablePluginSystem="true"
    @card-updated="handleCardUpdate"
    @layout-changed="handleLayoutChange"
  >
    <template #card="{ cardData }">
      <CustomCardRenderer :card="cardData" />
    </template>
  </PanelV2>
</template>
```

## 🎯 主要功能

### 1. 可视化编辑
- **拖拽操作**: 从侧边栏拖拽组件到画布
- **属性配置**: 通过右侧面板配置组件属性
- **实时预览**: 所见即所得的编辑体验
- **网格对齐**: 智能网格布局系统

### 2. 丰富的组件
- **文本组件**: 支持富文本、样式配置
- **图表组件**: 多种图表类型，数据绑定
- **图片组件**: 图片展示、全屏预览
- **表格组件**: 数据表格、排序、分页

### 3. 插件系统
- **动态加载**: 运行时安装、卸载插件
- **生命周期**: 完整的插件生命周期管理
- **事件通信**: 插件间事件通信机制
- **配置管理**: 插件配置和设置

### 4. 数据绑定
- **多数据源**: API、WebSocket、MQTT 等
- **实时更新**: 自动刷新和实时同步
- **数据转换**: 灵活的数据处理管道
- **错误处理**: 完善的错误处理机制

### 5. 主题系统
- **内置主题**: 浅色、深色、彩色主题
- **自定义主题**: 完全可定制的主题系统
- **动态切换**: 运行时主题切换
- **CSS变量**: 基于CSS变量的主题实现

### 6. 操作体验
- **撤销重做**: 完整的历史记录管理
- **快捷键**: 丰富的键盘快捷操作
- **上下文菜单**: 右键菜单操作
- **拖拽布局**: 灵活的布局调整

### 7. 导入导出
- **配置导出**: JSON格式配置导出
- **图片导出**: 画布导出为图片
- **PDF导出**: 生成PDF报告
- **模板分享**: 配置模板分享

## 🔌 插件开发

PanelV2 提供了强大的插件系统，支持动态扩展功能：

```typescript
// 创建插件
export const MyPlugin: Plugin = {
  meta: {
    name: 'my-plugin',
    version: '1.0.0',
    description: '我的自定义插件'
  },
  
  // 提供卡片组件
  cards: {
    'my-card': MyCardComponent
  },
  
  // 提供配置器
  inspectors: {
    'my-inspector': MyInspectorComponent  
  },
  
  // 生命周期钩子
  async onActivate(context) {
    // 插件激活时的逻辑
  }
}
```

详细的插件开发指南请参考 [插件开发文档](./plugins/PLUGIN_DEVELOPMENT.md)。

## 🎨 主题定制

支持完全自定义的主题系统：

```typescript
import { ThemeManager } from '@/components/panelv2/themes'

const themeManager = new ThemeManager()

// 注册自定义主题
themeManager.registerTheme({
  id: 'my-theme',
  name: '我的主题',
  type: 'light',
  colors: {
    primary: '#1890ff',
    background: '#ffffff',
    // ... 更多颜色配置
  }
})

// 应用主题
themeManager.setTheme('my-theme')
```

## 📊 数据绑定

支持多种数据源的绑定和实时更新：

```typescript
import { DataManager } from '@/components/panelv2/data'

const dataManager = new DataManager()

// 注册API数据源
dataManager.registerSource({
  id: 'api-source',
  type: 'api',
  config: {
    url: 'https://api.example.com/data',
    interval: 30000
  }
})

// 创建数据绑定
dataManager.createBinding({
  cardId: 'card-1',
  configKey: 'value',
  sourceId: 'api-source',
  path: 'data.value'
})
```

## 🛠️ 开发指南

### 环境要求
- Vue 3.x
- TypeScript 4.x
- Node.js 16+

### 依赖安装
```bash
npm install pinia gridstack nanoid
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📝 API 文档

### 组件 Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `initialState` | `Partial<PanelState>` | `undefined` | 初始面板状态 |
| `plugins` | `Plugin[]` | `[]` | 预装插件列表 |
| `toolbarActions` | `ToolbarAction[]` | `[]` | 自定义工具栏动作 |
| `draggableItems` | `DraggableItem[]` | `[]` | 自定义可拖拽项 |
| `inspectorRegistry` | `ComponentRegistry` | `{}` | 配置器注册表 |
| `enablePluginSystem` | `boolean` | `true` | 是否启用插件系统 |

### 组件事件

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `card-updated` | `(cardId: string, config: any)` | 卡片配置更新 |
| `layout-changed` | `(layouts: Layout[])` | 布局变化 |
| `selection-changed` | `(selectedId: string \| null)` | 选择变化 |

### 插槽

| 插槽名 | 参数 | 描述 |
|--------|------|------|
| `card` | `{ cardData: PanelCard }` | 卡片渲染插槽 |

## 🔧 配置选项

### 面板配置
```typescript
interface PanelState {
  cards: PanelCard[]           // 卡片列表
  selectedItemId?: string      // 选中项ID
  config: {                    // 面板配置
    backgroundColor: ConfigItem<string>
    gridSize: ConfigItem<number>
    // ... 更多配置
  }
}
```

### 卡片配置
```typescript
interface PanelCard {
  id: string                   // 卡片ID
  type: string                 // 卡片类型
  layout: {                    // 布局信息
    x: number
    y: number
    w: number
    h: number
  }
  config: {                    // 卡片配置
    [key: string]: ConfigItem<any>
  }
}
```

## 🎯 最佳实践

### 1. 性能优化
- 使用 `defineAsyncComponent` 懒加载大型组件
- 合理使用 `v-memo` 优化渲染性能
- 避免在配置项中存储大量数据

### 2. 插件开发
- 遵循单一职责原则
- 使用命名空间避免冲突
- 正确处理插件生命周期

### 3. 主题定制
- 使用 CSS 变量定义主题
- 保持颜色对比度符合无障碍标准
- 提供暗色和亮色两套方案

### 4. 数据管理
- 合理设置数据更新频率
- 处理网络异常情况
- 使用数据缓存减少请求

## 🐛 常见问题

### Q: 如何添加自定义卡片组件？
A: 创建 Vue 组件并在插件中注册，或直接通过 `draggableItems` 配置。

### Q: 如何实现数据实时更新？
A: 使用 DataManager 注册 WebSocket 或 API 轮询数据源。

### Q: 如何自定义主题？
A: 使用 ThemeManager 注册自定义主题配置。

### Q: 插件如何与主系统通信？
A: 通过插件上下文提供的事件系统进行通信。

## 🤝 贡献指南

欢迎贡献代码、文档或反馈问题！

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为 PanelV2 做出贡献的开发者！

---

**PanelV2** - 让可视化面板开发变得简单而强大！