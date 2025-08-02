# Card组件重构计划

基于可视化编辑器架构设计，将现有card组件重构为解耦的、可扩展的架构。

## 重构目标

1. **解耦渲染与逻辑**：将组件逻辑与渲染分离，支持多种渲染方式
2. **统一数据协议**：建立标准化的数据节点协议
3. **插件化架构**：支持动态加载和扩展组件
4. **跨渲染器复用**：一次开发，多处运行（DOM、Canvas、WebGL等）

## 新架构目录结构

```
src/card/
├── core/                           # 核心引擎
│   ├── types/                       # 类型定义
│   │   ├── index.ts                 # 统一数据节点协议
│   │   ├── renderer.ts              # 渲染器接口
│   │   └── component.ts             # 组件接口
│   ├── registry/                    # 组件注册表
│   │   ├── index.ts                 # 注册表管理
│   │   └── loader.ts                # 动态加载器
│   ├── renderers/                   # 渲染器实现
│   │   ├── dom-renderer.ts          # DOM渲染器
│   │   ├── canvas-renderer.ts       # Canvas渲染器
│   │   └── base-renderer.ts         # 渲染器基类
│   └── data-adapter/                # 数据适配器
│       ├── index.ts                 # 适配器管理
│       ├── api-adapter.ts           # API数据适配器
│       └── mock-adapter.ts          # Mock数据适配器
├── components/                      # 重构后的组件库
│   ├── chart/                       # 图表组件
│   │   ├── bar-chart/               # 柱状图
│   │   │   ├── index.ts             # 组件定义
│   │   │   ├── logic.ts             # 业务逻辑Hook
│   │   │   ├── dom-view.vue         # DOM渲染视图
│   │   │   ├── canvas-view.ts       # Canvas渲染视图
│   │   │   └── config.vue           # 配置表单
│   │   ├── line-chart/              # 折线图
│   │   └── ...
│   ├── builtin/                     # 内置组件
│   │   ├── device-count/            # 设备统计
│   │   ├── system-info/             # 系统信息
│   │   └── ...
│   └── custom/                      # 自定义组件
├── legacy/                          # 原有组件（逐步迁移）
│   ├── builtin-card/                # 原builtin-card目录
│   └── chart-card/                  # 原chart-card目录
└── demo/                            # 演示和测试
    ├── basic-usage.vue              # 基础用法演示
    ├── multi-renderer.vue           # 多渲染器演示
    └── plugin-system.vue            # 插件系统演示
```

## 重构清单

### 阶段一：核心架构搭建 ✅
- [x] 创建核心类型定义
- [x] 实现组件注册表
- [x] 创建渲染器基础架构
- [x] 建立数据适配器系统

### 阶段二：Demo组件实现 🔄
- [ ] 实现bar-chart组件的新架构版本
- [ ] 创建基础演示页面
- [ ] 验证架构可行性

### 阶段三：批量迁移 ⏳
- [ ] 迁移chart-card下的组件
  - [ ] bar (柱状图)
  - [ ] curve (折线图) 
  - [ ] table (表格)
  - [ ] digit-indicator (数字指示器)
  - [ ] switch (开关控制)
  - [ ] text-info (文本信息)
  - [ ] video-player (视频播放器)
  - [ ] instrument-panel (仪表盘)
  - [ ] state-display (状态显示)
  - [ ] enum-control (枚举控制)
  - [ ] digit-setter (数字设置器)
  - [ ] dispatch-data (数据分发)
  - [ ] demo (演示组件)
- [ ] 迁移builtin-card下的组件
  - [ ] access (访问统计)
  - [ ] alarm-count (告警统计)
  - [ ] alarm-info (告警信息)
  - [ ] cpu-usage (CPU使用率)
  - [ ] memory-usage (内存使用率)
  - [ ] disk-usage (磁盘使用率)
  - [ ] online-trend (在线趋势)
  - [ ] tenant-count (租户统计)
  - [ ] system-metrics-history (系统指标历史)
  - [ ] version (版本信息)
  - [ ] news (新闻)
  - [ ] recently-visited (最近访问)
  - [ ] reported-data (上报数据)
  - [ ] tenant-chart (租户图表)
  - [ ] operation-guide-card (操作指南)
  - [ ] app-download (应用下载)
  - [ ] on-line (在线状态)
  - [ ] off-line (离线状态)

### 阶段四：兼容性处理 ⏳
- [ ] 保持向后兼容
- [ ] 提供迁移工具
- [ ] 更新文档

### 阶段五：清理优化 ⏳
- [ ] 移除legacy代码
- [ ] 性能优化
- [ ] 完善测试

## 关键设计原则

1. **逻辑与视图分离**：使用Hook模式分离业务逻辑
2. **统一数据协议**：所有组件遵循相同的数据结构
3. **渲染器无关**：组件不依赖特定渲染方式
4. **插件化扩展**：支持动态注册新组件
5. **向后兼容**：渐进式迁移，不破坏现有功能

## 迁移策略

1. **并行开发**：新架构与旧架构并存
2. **逐步替换**：一个组件一个组件地迁移
3. **功能对等**：确保迁移后功能完全一致
4. **测试验证**：每个迁移的组件都要通过测试
5. **文档同步**：及时更新使用文档

---

**注意**：此重构计划将分阶段执行，确保系统稳定性和开发效率。每完成一个阶段，都会进行充分的测试和验证。