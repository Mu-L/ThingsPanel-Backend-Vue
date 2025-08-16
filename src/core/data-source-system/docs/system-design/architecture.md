# 简化数据源系统架构设计

## 🎯 设计目标

基于对现有 visual-editor 和 card2.1 系统的深入学习，设计一个简化但保留核心价值的数据源系统。

## 📊 核心架构

### 1. 系统整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    组件层 (Component Layer)                    │
├─────────────────────────────────────────────────────────────┤
│  组件通过标准props接收数据，专注于数据展示和交互              │
│                                                             │
│  Props: { dataSourceConfig: { [id]: { data: any } } }      │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  配置器 (ConfigGenerator)                     │
├─────────────────────────────────────────────────────────────┤
│  • 接收组件数据需求声明                                      │
│  • 提供可视化配置界面                                        │
│  • 生成标准化配置数据                                        │
│  • 支持字段映射和验证                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ 配置数据
┌─────────────────▼───────────────────────────────────────────┐
│                  执行器 (DataExecutor)                        │
├─────────────────────────────────────────────────────────────┤
│  • 根据配置获取/生成数据                                      │
│  • 支持多种数据源类型                                        │
│  • 集成触发器系统                                           │
│  • 响应式数据更新                                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                基础服务层 (Foundation Layer)                  │
├─────────────────────────────────────────────────────────────┤
│  • 数据源实现 (Static, API, WebSocket, Script)              │
│  • 触发器系统 (Timer, WebSocket, Event, Manual)             │
│  • 字段映射引擎                                             │
│  • 数据验证器                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. 核心组件关系

```
组件数据需求声明 → 配置器 → 配置数据 → 执行器 → 组件数据
     ↑                                        │
     └──────────── 数据绑定管理器 ────────────┘
```

## 🔧 核心接口设计

### 1. 组件数据需求接口
```typescript
interface ComponentDataRequirement {
  componentId: string
  componentName: string
  dataSources: DataSourceRequirement[]
}

interface DataSourceRequirement {
  id: string
  name: string
  structureType: 'object' | 'array'
  fields: FieldRequirement[]
  required: boolean
}

interface FieldRequirement {
  name: string
  type: 'string' | 'number' | 'boolean' | 'any'
  required: boolean
  description: string
}
```

### 2. 数据源配置接口
```typescript
interface DataSourceConfig {
  id: string
  componentId: string
  dataSources: DataSourceDefinition[]
  triggers: TriggerConfig[]
  enabled: boolean
}

interface DataSourceDefinition {
  id: string
  type: 'static' | 'api' | 'websocket' | 'script'
  config: any
  fieldMapping?: { [targetField: string]: string }
}
```

### 3. 组件数据接口
```typescript
interface ComponentData {
  [dataSourceId: string]: any
}

// 组件props
interface ComponentProps {
  dataSourceConfig?: {
    [dataSourceId: string]: {
      type: string
      data: any
    }
  }
}
```

## 🎯 核心组件设计

### 1. 配置生成器 (ConfigGenerator)
```typescript
class DataSourceConfigGenerator {
  /**
   * 根据组件需求生成配置
   */
  generateConfig(
    requirement: ComponentDataRequirement,
    userInputs: UserDataSourceInput[]
  ): DataSourceConfig

  /**
   * 验证配置的有效性
   */
  validateConfig(config: DataSourceConfig): ValidationResult

  /**
   * 预览映射结果
   */
  previewMapping(
    sourceData: any,
    fieldMapping: { [key: string]: string }
  ): MappingPreviewResult
}
```

### 2. 数据执行器 (DataExecutor)
```typescript
class DataSourceExecutor {
  /**
   * 执行数据源配置，返回组件数据
   */
  execute(config: DataSourceConfig): Promise<ComponentData>

  /**
   * 启动响应式数据绑定
   */
  startReactiveBinding(
    config: DataSourceConfig,
    onDataChange: (data: ComponentData) => void
  ): string

  /**
   * 停止响应式绑定
   */
  stopReactiveBinding(bindingId: string): void
}
```

### 3. 组件集成适配器
```typescript
class ComponentDataAdapter {
  /**
   * 适配到Visual Editor组件格式
   */
  adaptToVisualEditor(data: ComponentData): VisualEditorProps

  /**
   * 适配到Card2.1组件格式
   */
  adaptToCard21(data: ComponentData): Card21Props

  /**
   * 通用组件数据格式
   */
  adaptToStandard(data: ComponentData): StandardComponentProps
}
```

## 🔄 数据流设计

### 1. 配置阶段
```
1. 组件注册数据需求
   ↓
2. 配置器读取需求
   ↓
3. 用户配置数据源
   ↓
4. 生成标准配置
   ↓
5. 保存配置到存储
```

### 2. 运行阶段
```
1. 加载组件配置
   ↓
2. 执行器处理配置
   ↓
3. 获取/生成数据
   ↓
4. 应用字段映射
   ↓
5. 传递给组件
   ↓
6. 触发器监听变化
   ↓
7. 循环更新数据
```

## 🔑 关键设计原则

### 1. 简化原则
- **减少抽象层次**: 只保留必要的抽象
- **避免过度设计**: 专注于核心功能
- **易于理解**: 代码结构清晰，职责明确

### 2. 复用原则
- **触发器系统**: 完全复用Card2.1的触发器实现
- **字段映射**: 借鉴Visual Editor的JSON路径映射
- **数据源**: 复用现有的数据源实现

### 3. 兼容原则
- **向后兼容**: 支持现有组件的数据格式
- **渐进迁移**: 新旧系统可以共存
- **适配器模式**: 通过适配器连接不同系统

### 4. 扩展原则
- **插件化数据源**: 支持新的数据源类型
- **可配置触发器**: 支持灵活的触发机制
- **自定义映射**: 支持复杂的字段映射

## 🚀 实现优先级

### Phase 1: 核心框架
1. 定义核心接口
2. 实现简化的配置生成器
3. 实现基础的数据执行器
4. 集成现有触发器系统

### Phase 2: 数据源支持
1. 集成静态数据源
2. 集成API数据源
3. 集成WebSocket数据源
4. 集成脚本数据源

### Phase 3: 组件集成
1. 创建组件适配器
2. 测试现有组件兼容性
3. 创建标准组件接口
4. 提供迁移工具

### Phase 4: 高级功能
1. 字段映射引擎
2. 配置验证和预览
3. 性能监控
4. 错误处理和日志

## 📦 目录结构

```
src/core/data-source-system/
├── core/
│   ├── config-generator.ts       # 配置生成器
│   ├── data-executor.ts          # 数据执行器
│   └── component-adapter.ts      # 组件适配器
├── data-sources/
│   ├── static-data-source.ts     # 静态数据源
│   ├── api-data-source.ts        # API数据源
│   ├── websocket-data-source.ts  # WebSocket数据源
│   └── script-data-source.ts     # 脚本数据源
├── triggers/                     # 复用Card2.1触发器
├── mapping/
│   └── field-mapper.ts           # 字段映射引擎
├── types/
│   ├── config.ts                 # 配置相关类型
│   ├── component.ts              # 组件相关类型
│   └── data-source.ts            # 数据源相关类型
├── components/                   # UI组件
├── utils/                       # 工具函数
└── docs/                        # 文档系统
```

这个架构保持了现有系统的核心价值，同时大幅简化了复杂度，便于理解、维护和扩展。