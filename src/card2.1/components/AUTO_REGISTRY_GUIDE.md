# Card 2.1 组件自动注册系统使用指南

## 🚀 概述

新的自动注册系统让你**无需再手动维护组件列表**！系统会自动扫描并注册所有符合规范的组件。

## ✨ 主要优势

- ✅ **零维护**：新增组件无需修改 `index.ts`
- ✅ **自动发现**：支持任意深度的目录结构
- ✅ **实时更新**：支持热重载和动态刷新
- ✅ **类型安全**：完整的 TypeScript 支持
- ✅ **向后兼容**：现有代码无需修改

## 📁 组件开发规范

### 1. 目录结构规范

```
src/card2.1/components/
├── 分类名称/
│   └── 组件名称/
│       ├── index.ts          # 组件定义导出 (必需)
│       ├── index.vue         # 组件实现
│       ├── setting.vue       # 配置面板 (可选)
│       └── settingConfig.ts  # 配置定义 (可选)
└── auto-registry.ts          # 自动注册系统 (请勿修改)
```

### 2. 组件定义规范

每个组件的 `index.ts` 文件必须按以下方式导出：

```typescript
// 方式1：默认导出 (推荐)
export default {
  type: 'my-component',      // 组件唯一标识 (kebab-case)
  name: '我的组件',           // 显示名称
  category: '数据展示',      // 组件分类
  component: MyComponent,    // Vue 组件
  // ... 其他配置
} as ComponentDefinition

// 方式2：命名导出
export const definition = { /* ... */ }
export const componentDefinition = { /* ... */ }
```

## 🔧 使用方式

### 新增组件的步骤

1. **创建组件目录**
```bash
mkdir -p src/card2.1/components/数据展示/my-new-component
```

2. **创建组件定义** (`index.ts`)
```typescript
import type { ComponentDefinition } from '../../../core/types'
import MyNewComponent from './index.vue'

export default {
  type: 'my-new-component',
  name: '我的新组件',
  category: '数据展示',
  version: '1.0.0',
  component: MyNewComponent,
  icon: 'chart-bar',
  description: '展示数据的组件',
  supportedDataSources: ['api', 'websocket'],
  tags: ['数据', '图表'],
  config: {
    // 组件配置项
  }
} as ComponentDefinition
```

3. **创建 Vue 组件** (`index.vue`)
```vue
<script setup lang="ts">
/**
 * 我的新组件
 * 用于展示特定类型的数据
 */
// 组件逻辑...
</script>

<template>
  <div class="my-new-component">
    <!-- 组件内容 -->
  </div>
</template>
```

4. **完成！** 🎉
   - 无需修改任何其他文件
   - 组件会自动出现在编辑器中
   - 支持热重载

## 📊 调试和验证

### 开发工具函数

```typescript
import { debugComponents, validateComponents } from '@/card2.1/components'

// 在控制台查看所有组件信息
debugComponents()

// 验证组件定义是否规范
const validation = validateComponents()
if (!validation.valid) {
  console.log('发现问题:', validation.issues)
}
```

### 动态重新加载

```typescript
import { reloadComponents } from '@/card2.1/components'

// 开发时重新扫描组件 (通常不需要手动调用)
await reloadComponents()
```

## 🔍 常见问题

### Q: 为什么我的组件没有被自动注册？

**A:** 检查以下几点：
1. 组件目录下是否有 `index.ts` 文件
2. `index.ts` 是否正确导出了组件定义
3. 组件定义是否包含必需字段 (`type`, `name`, `component`)
4. 控制台是否有错误信息

### Q: 如何查看当前注册了哪些组件？

**A:** 在浏览器控制台运行：
```javascript
import('@/card2.1/components').then(({ debugComponents }) => debugComponents())
```

### Q: 组件类型命名有什么要求？

**A:** 
- 必须使用 kebab-case 格式 (例如: `my-component`)
- 只能包含小写字母、数字和连字符
- 在整个系统中必须唯一

### Q: 可以嵌套多层目录吗？

**A:** 可以！系统支持任意深度的目录结构：
```
components/
├── 分类A/
│   ├── 子分类1/
│   │   └── 组件A/index.ts    # ✅ 支持
│   └── 组件B/index.ts         # ✅ 支持
└── 分类B/
    └── 组件C/index.ts         # ✅ 支持
```

## 🎯 最佳实践

1. **组件命名**：使用清晰、描述性的名称
2. **分类组织**：合理使用分类来组织相关组件
3. **版本管理**：为组件指定版本号，便于维护
4. **文档完善**：为组件添加详细的描述和标签
5. **类型安全**：使用 TypeScript 类型定义
6. **测试验证**：定期运行 `validateComponents()` 检查规范性

## 🔄 迁移现有组件

如果你有现有的组件需要迁移到新系统：

1. 确保组件定义符合上述规范
2. 确保 `index.ts` 正确导出定义
3. 删除原来在 `components/index.ts` 中的手动注册代码
4. 系统会自动识别并注册组件

## 🛠️ 高级用法

### 条件性注册

如果需要根据环境条件注册组件：

```typescript
// 在组件定义中
export default {
  type: 'dev-only-component',
  name: '开发专用组件',
  // 只在开发环境中启用
  enabled: import.meta.env.DEV,
  // ... 其他配置
} as ComponentDefinition
```

### 动态配置

组件可以根据运行时条件动态配置：

```typescript
const isDarkMode = useThemeStore().darkMode

export default {
  type: 'theme-aware-component',
  name: '主题感知组件',
  icon: isDarkMode ? 'moon' : 'sun',
  // ... 其他配置
} as ComponentDefinition
```

---

通过这套自动注册系统，组件开发变得更加简单高效！🚀