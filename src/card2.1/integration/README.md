# Card 2.1 编辑器集成指南

## 概述

本模块提供 Card 2.1 组件与 Visual Editor 的标准集成接口，确保组件能够顺利集成到各种渲染器中。

## 已准备的组件

### 1. 简单测试组件 (`simple-test-component`)
- **用途**: 用于测试组件配置、交互和属性暴露的基础组件
- **特性**: 支持属性变化测试、交互状态展示、数据模拟
- **数据源支持**: 静态数据、API、WebSocket
- **默认尺寸**: 300x200px

### 2. 数据展示卡片 (`data-display-card`) 
- **用途**: 功能丰富的数据展示卡片，支持指标展示、趋势分析和数据列表
- **特性**: 实时数据更新、趋势指示、多指标展示
- **数据源支持**: 静态数据、API、WebSocket、MQTT
- **默认尺寸**: 320x240px

## 集成配置

### 主要文件结构

```
src/card2.1/integration/
├── visual-editor-config.ts    # 编辑器集成主配置
├── README.md                  # 本说明文档
```

```
src/card2.1/components/
├── index.ts                   # 组件统一导出
├── simple-test-component/
│   └── index.ts              # 组件定义（含编辑器配置）
└── data-display-card/
    └── index.ts              # 组件定义（含编辑器配置）
```

### 核心配置特性

#### 1. 编辑器兼容性配置
- ✅ **组件尺寸规范**: 包含 `defaultSize` 和 `minSize` 配置
- ✅ **示例配置**: 提供多个预设示例供编辑器预览
- ✅ **属性定义**: 详细的属性类型和选项配置
- ✅ **布局适配**: 支持 Canvas、Gridstack 等多种渲染器

#### 2. 数据源集成
- ✅ **数据源声明**: `supportedDataSources` 明确支持的数据源类型
- ✅ **属性暴露**: 完整的属性暴露配置，支持动态属性监听
- ✅ **数据模拟**: 内置数据模拟器，支持实时数据演示

#### 3. 交互能力
- ✅ **事件处理**: 标准化的交互事件系统
- ✅ **属性变化**: 支持运行时属性修改和事件触发
- ✅ **调试支持**: 内置调试指示器和状态展示

## 使用方式

### 1. 导入组件配置

```typescript
import { VisualEditorIntegrationConfig } from '@/card2.1/integration/visual-editor-config'

// 获取所有可用组件
const widgets = VisualEditorIntegrationConfig.widgets

// 按分类获取组件
const displayWidgets = VisualEditorIntegrationConfig.categories['展示']
```

### 2. 在编辑器中注册组件

```typescript
import { getCard2Widget, isCard2Component } from '@/card2.1/integration/visual-editor-config'

// 检查并获取组件配置
if (isCard2Component('data-display-card')) {
  const widget = getCard2Widget('data-display-card')
  // 注册到编辑器...
}
```

### 3. 组件实例化

```vue
<script setup>
import { getCard2Definition } from '@/card2.1/integration/visual-editor-config'

// 获取组件定义
const definition = getCard2Definition('simple-test-component')

// 使用组件
const ComponentClass = definition.component
</script>

<template>
  <ComponentClass
    :config="componentConfig"
    :component-id="uniqueId"
    :show-interaction-indicator="true"
  />
</template>
```

## 编辑器集成检查清单

### ✅ 已完成的准备工作

- [x] **组件定义完善**: 两个组件的 `index.ts` 都包含完整的编辑器集成配置
- [x] **尺寸规范**: 设置了 `defaultSize` 和 `minSize` 
- [x] **示例配置**: 每个组件提供 2-3 个典型使用示例
- [x] **属性定义**: 详细的 `properties` 配置，包含类型、选项、验证
- [x] **数据源支持**: 明确声明 `supportedDataSources`
- [x] **属性暴露系统**: 完整的属性暴露配置，支持动态监听
- [x] **转换器函数**: `convertToCard2Widget` 将 Card2.1 定义转换为编辑器格式
- [x] **工具函数集**: 提供完整的查询和筛选工具函数
- [x] **统一导出**: 中央化的组件导出和管理

### 🔄 待编辑器端完成的工作

- [ ] **组件注册**: 将 Card 2.1 组件注册到 Visual Editor 组件库
- [ ] **渲染器适配**: 确保组件在各种渲染器中正常工作
- [ ] **属性编辑面板**: 基于 `properties` 配置生成属性编辑界面
- [ ] **数据绑定**: 集成数据源系统，支持动态数据绑定
- [ ] **预览功能**: 在编辑器中正确预览和操作组件

## 测试验证

### 可用的测试页面

1. **Visual Editor 集成测试**: `/test/editor-integration`
   - 测试组件在编辑器中的表现
   - 验证拖拽、调整大小等基本操作

2. **Card 2.1 数据绑定测试**: `/test/data-binding-system-integration`
   - 测试完整的数据绑定流程
   - 验证属性暴露和交互系统

### 集成验证步骤

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 访问测试页面
http://localhost:5002/test/editor-integration

# 3. 验证功能
- 组件能否正常加载
- 属性配置是否生效
- 交互功能是否正常
- 数据绑定是否工作
```

## 故障排除

### 常见问题

1. **组件未显示在编辑器中**
   - 检查 `isRegistered: true` 是否设置
   - 验证组件导出是否正确

2. **布局尺寸不正确**
   - 检查 `defaultLayout` 配置
   - 验证 `defaultSize` 和 `minSize` 设置

3. **属性编辑面板空白**
   - 确认 `properties` 配置完整
   - 检查属性类型定义是否正确

4. **数据绑定不工作**
   - 验证 `supportedDataSources` 设置
   - 检查属性暴露注册是否完成

## 版本信息

- **Card 2.1 版本**: 2.1.0
- **集成配置版本**: 1.0.0
- **兼容的编辑器版本**: >= 1.0.0

---

## 联系方式

如遇到集成问题，请：
1. 查看本文档的故障排除部分
2. 访问测试页面验证功能
3. 查看浏览器控制台的错误信息
4. 联系开发团队进行支持