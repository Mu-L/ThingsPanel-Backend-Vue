# 外部系统学习索引

本目录记录从现有 visual-editor 和 card2.1 系统中学习到的设计思路和实现模式，避免重复阅读分析。

## 📚 目录结构

### Visual Editor 系统
- [组件需求声明机制](./visual-editor/component-requirements.md) - 组件如何声明数据需求
- [字段映射机制](./visual-editor/data-mapping.md) - JSON路径映射系统  
- [配置结构设计](./visual-editor/config-structure.md) - 数据源配置结构

### Card2.1 系统  
- [数据绑定机制](./card2.1/data-binding.md) - 响应式数据绑定实现
- [组件集成模式](./card2.1/component-integration.md) - 组件数据接收模式
- [触发器系统设计](./card2.1/trigger-system.md) - 多种触发器实现

## 🎯 核心学习点

### 设计原则
1. **配置与组件分离** - 组件声明需求，外部提供数据
2. **字段映射灵活性** - 通过JSON路径实现任意数据结构适配
3. **响应式更新** - 多种触发器支持实时数据更新
4. **向后兼容** - 新旧API共存，平滑迁移

### 关键接口模式
```typescript
// 组件接收配置的标准模式
interface ComponentProps {
  widgetConfiguration?: {
    dataSource: {
      config: {
        dataSourceBindings: {
          [dataSourceId: string]: { rawData: string }
        }
      }
    }
  }
}

// 组件数据获取模式
const getData = (dataSourceId: string) => {
  const binding = getDataSourceBinding(dataSourceId)
  return JSON.parse(binding.rawData)
}
```

## 🔄 应用到新系统

基于这些学习内容，新的数据源系统采用：
- 简化的配置生成器
- 标准的执行器接口
- 复用现有触发器机制
- 兼容现有组件集成模式