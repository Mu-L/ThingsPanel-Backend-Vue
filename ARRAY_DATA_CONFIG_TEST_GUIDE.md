# 🎯 数组数据配置测试指南

## 📋 重要改进总结

我们成功将**抽象的key1/key2/key3**配置替换为**语义化的数据配置界面**！

### 🔄 核心变化对比

#### **之前的问题**:
- ❌ key1、key2、key3 含义不明确
- ❌ 数组和对象数据处理不一致
- ❌ 用户不知道配置字段的作用

#### **现在的解决方案**:
- ✅ **数组数据配置**: X轴字段、Y轴字段、标签字段
- ✅ **对象数据配置**: 自动检测数值字段，无需手动配置
- ✅ **智能预览**: 实时显示映射结果
- ✅ **统一数据流**: 组件接收原始数据+配置信息

## 🧪 测试步骤

### 1. 启动开发服务器
```bash
# 注意：如果遇到依赖问题，请先解决rollup模块问题
pnpm dev
```

### 2. 进入Visual Editor
访问：菜单 → 测试 → 编辑器集成测试

### 3. 添加通用数据可视化组件
- 在左侧组件库中找到"通用数据可视化"组件
- 拖拽到画布上
- 点击组件选中它

### 4. 测试数组数据配置

#### A. 切换到"数据源"选项卡
- 右侧设置面板 → "数据源"选项卡
- 确认看到嵌入的数据源配置表单

#### B. 加载数组示例
- 点击 **"数组示例"** 按钮
- JSON编辑器会自动填入时间序列数据
- 观察界面变化：

**期望结果**:
```
数据配置 [数组数据 (7项)]

配置数组中每个对象的字段映射，用于图表X/Y轴显示

X轴字段名: [timestamp        ]  # 时间或索引字段，用于图表横轴
Y轴字段名: [temperature      ]  # 数值字段，用于图表纵轴  
标签字段名: [label           ]  # 可选，用于数据点标签显示

数据预览:
✅ 数组数据 (7 项)
X轴 (timestamp): 2024-01-01 10:00
Y轴 (temperature): 22.5
标签 (label): 数据点1
```

#### C. 验证图表渲染
- 组件应自动切换到图表模式
- 显示温度随时间变化的ECharts曲线图
- X轴显示时间，Y轴显示温度值

#### D. 🎯 测试实时响应（重要！）
- 在"Y轴字段名"输入框中将 `temperature` 改为 `humidity`
- **期望结果**: 图表立即切换显示湿度数据，Y轴数值范围改变
- 数据预览区域显示：`Y轴 (humidity): 65`
- 再改回 `temperature`，图表应立即切换回温度数据

### 5. 测试对象数据配置

#### A. 加载对象示例
- 点击 **"对象示例"** 按钮  
- 观察界面变化为对象数据配置模式

**期望结果**:
```
数据配置 [对象数据 (15字段)]

对象数据将自动扫描所有数值字段，无需额外配置

检测到的数值字段:
[sensors.temperature.current: 25.5] [sensors.humidity.current: 60] 
[sensors.pressure.current: 1013.25] [statistics.uptime: 86400] 
[statistics.dataPoints: 1440] ...

数据预览:
✅ 对象数据 (8 个数值字段)
[sensors.temperature.current: 25.5] [device.status: online] ...还有 3 个字段
```

### 6. 验证配置变更的实时效果

#### A. 修改数组字段映射
- 在"Y轴字段名"中输入 `humidity`
- 观察数据预览立即更新：`Y轴 (humidity): 65`
- 组件中的图表应实时切换到显示湿度曲线

#### B. 测试随机更新
- 点击"随机更新"按钮
- 观察图表数据和预览同时更新

## 🔧 技术实现关键点

### 1. 数据传递链路
```
DataSourceConfigForm → SettingsPanel → NodeWrapper → Card2Wrapper → UniversalDataVizCard
        ↓                  ↓              ↓             ↓               ↓
    arrayConfig      data-updated     card2Data      :data prop    receivedData
                                                     :metadata     props.metadata
```

### 2. 新的数据结构
```javascript
// DataSourceConfigForm 发送
widget.metadata = {
  card2Data: [原始数组数据],
  dataConfig: {
    isArray: true,
    arrayConfig: {
      xField: 'timestamp',
      yField: 'temperature', 
      labelField: 'label'
    }
  }
}

// UniversalDataVizCard 接收
arrayXPath.value = metadata.dataConfig.arrayConfig.xField
arrayYPath.value = metadata.dataConfig.arrayConfig.yField
```

### 3. 智能预览机制
- **数组数据**: 显示第一个元素的字段值映射
- **对象数据**: 显示检测到的数值字段列表  
- **实时更新**: 配置变更时立即更新预览和组件

## 🐛 可能遇到的问题

### 1. 依赖问题 ⚠️
如果开发服务器启动失败（rollup模块错误），需要：
```bash
# 删除依赖并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 如果还是有问题，可以尝试
pnpm install --force
```

### 2. ✅ 已修复：组件添加时的JavaScript错误
**错误信息**: `TypeError: undefined is not iterable (cannot read property Symbol(Symbol.iterator))`

**修复**: 在 UniversalDataVizCard.vue 中已修复watch函数的安全解构：
```javascript
// 修复前（会报错）
watch(() => [props.data, props.metadata], ([newData, newMetadata], [oldData, oldMetadata]) => {

// 修复后（安全处理）
watch(() => [props.data, props.metadata], (newValues, oldValues) => {
  const [newData, newMetadata] = newValues || []
  const [oldData, oldMetadata] = oldValues || []
```

### 3. ✅ 已修复：数据源配置时的引用错误
**错误信息**: `ReferenceError: result is not defined`

**修复**: 在 DataSourceConfigForm.vue 中已修复updateOutput函数中的变量引用：
```javascript
// 修复前（会报错）
config: {
  output: result  // result变量不存在

// 修复后（正确引用）
config: {
  output: currentOutputData.value  // 使用正确的变量
```

### 4. ✅ 已修复：数据配置传递链路中断
**问题**: NodeWrapper传递给Card2Wrapper的数据不完整，导致UniversalDataVizCard无法接收到dataConfig信息

**修复**: 在 NodeWrapper.vue 和 Card2Wrapper.vue 中添加metadata prop传递：
```vue
<!-- NodeWrapper.vue -->
<Card2Wrapper
  :data="node.metadata?.card2Data"
  :metadata="node.metadata"  <!-- 新增：传递完整metadata -->
  ...
/>

<!-- Card2Wrapper.vue -->
<component
  :metadata="metadata || { card2Data: data, dataSource: dataSource }"  <!-- 使用完整metadata -->
  ...
/>
```

### 5. ✅ 已修复：数组配置变化时的响应式更新问题
**问题**: 用户修改数组字段配置（X轴、Y轴字段名）时，图表不会实时响应变化

**修复**: 
1. **DataSourceConfigForm.vue** - 改进响应式更新机制：
```javascript
// 创建全新metadata对象确保响应式更新
const newMetadata = {
  ...props.widget.metadata,
  card2Data: parsedJson.value,
  dataConfig: { /* 新配置 */ },
  _updateTimestamp: Date.now() // 时间戳确保是新对象
}
props.widget.metadata = newMetadata
```

2. **UniversalDataVizCard.vue** - 添加路径变化监听器：
```javascript
// 监听数组路径配置变化，重新渲染图表
watch([() => arrayXPath.value, () => arrayYPath.value], ([newXPath, newYPath]) => {
  if (路径变化且有数组数据) {
    initChart() // 重新渲染图表
  }
})
```

### 6. 组件不显示数据
- 检查控制台是否有数据传递日志：`🔍 [UniversalDataViz] 数据和配置变化`
- 确认 universal-data-viz 组件在左侧组件库中可见
- 验证 NodeWrapper 是否正确传递 metadata

### 7. 图表不渲染  
- 确认数组数据包含数值字段
- 检查 arrayXPath 和 arrayYPath 是否正确设置
- 查看控制台日志：`🎯 [UniversalDataViz] 使用DataSourceConfigForm的数组配置`
- 验证 ECharts 初始化是否成功

## ✨ 预期用户体验

用户现在可以：
1. **直观理解**每个配置字段的作用（X轴、Y轴、标签）
2. **实时预览**配置效果，无需猜测
3. **一键切换**数组和对象数据模式
4. **所见即所得**的数据源配置体验

这彻底解决了之前key1/key2/key3的语义不明确问题！🎉