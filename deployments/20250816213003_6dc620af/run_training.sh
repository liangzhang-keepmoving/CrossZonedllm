#!/bin/bash

# 设置环境变量
export NCCL_DEBUG=INFO
# 跨地域训练优化
export NCCL_SOCKET_IFNAME=eth0
# 通信压缩
export NCCL_COMPRESSION=1
# 地域感知优化
export DEEPSPEED_REGION_AWARE=1

echo "开始部署DeepSpeed训练任务..."
echo "部署ID: 20250816213003_6dc620af"
echo "模型大小: 1B"
echo "GPU配置: 3个地域，GPU分布: [4, 8, 2]"
echo "并行策略: DP=14, PP=1, TP=1"

echo "请确保所有节点之间的网络连通性良好，并已安装必要的依赖。"

echo "如需实际运行，请执行以下命令:"
echo "deepspeed --num_gpus=14 --num_nodes=3 --master_addr=master_node_ip --master_port=8888 train.py --model_size=1B --data_parallel_size=14 --pipeline_parallel_size=1 --tensor_parallel_size=1 --deepspeed --deepspeed_config=ds_config.json"

# 注意: 实际部署时，需要替换master_node_ip为实际的主节点IP地址
# 并确保train.py脚本存在且包含相应的参数处理逻辑
