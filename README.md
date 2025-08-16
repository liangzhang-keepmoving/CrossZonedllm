# 跨广域分布式大模型训练性能评估系统

这是一个用于评估跨广域分布式大模型训练性能的Web应用。该应用可以帮助用户配置跨地域的分布式训练环境，推荐最优的并行策略，并生成DeepSpeed部署代码。

## 功能特点

- **跨广域训练拓扑图可视化**：直观展示多地域训练节点的分布和连接情况
- **智能并行策略推荐**：根据模型大小、GPU数量和地域配置，推荐最优的DP/PP/TP并行方式
- **通信量分析**：计算并展示不同并行策略下的通信开销
- **通信掩盖策略**：提供减少跨地域通信延迟的优化建议
- **一键DeepSpeed部署**：自动生成DeepSpeed配置文件和启动脚本，并支持一键部署

## 项目结构

```
CrossZonedllm/
├── index.html        # 主页面HTML结构
├── styles.css        # 页面样式
├── app.js            # 前端交互逻辑
├── server.py         # 后端服务
├── requirements.txt  # Python依赖包
└── deployments/      # 部署配置存储目录
```

## 快速开始

### 安装依赖

```bash
# 安装Python依赖
pip install -r requirements.txt
```

### 启动服务

```bash
python server.py
```

服务启动后，访问 http://localhost:5000 即可使用应用。

## 使用说明

1. **配置参数**：
   - 设置参与训练的地域数量
   - 为每个地域配置GPU个数
   - 选择模型大小
   - 设置全局批次大小
   - 配置地域间网络延迟和带宽

2. **计算配置**：
   - 点击"计算配置"按钮
   - 系统将生成跨广域训练拓扑图
   - 显示推荐的并行策略（DP/PP/TP）
   - 分析通信量和延迟
   - 提供通信掩盖策略建议

3. **部署到DeepSpeed**：
   - 点击"部署到DeepSpeed"按钮
   - 确认部署配置
   - 系统将生成DeepSpeed配置文件和训练脚本
   - 部署配置将保存在`deployments`目录下

## 技术栈

- **前端**：HTML、CSS、JavaScript、Tailwind CSS、Font Awesome、Chart.js
- **后端**：Python、Flask
- **分布式训练**：DeepSpeed

## 注意事项

- 实际部署时，需要替换启动脚本中的`master_node_ip`为实际的主节点IP地址
- 确保所有节点之间的网络连通性良好
- 根据实际环境调整网络参数以获得更准确的性能评估结果

## 开发说明

如需扩展功能，可以：
1. 修改`server.py`添加新的API端点
2. 更新`app.js`实现新的前端交互
3. 完善并行策略推荐算法以支持更多模型类型

## License

MIT