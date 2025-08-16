from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import subprocess
import uuid
from datetime import datetime

app = Flask(__name__, static_folder='.')
CORS(app) # 启用CORS支持

# 配置日志
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 部署配置存储目录
deployments_dir = 'deployments'
if not os.path.exists(deployments_dir):
    os.makedirs(deployments_dir)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/deploy', methods=['POST'])
def deploy_deepspeed():
    try:
        # 获取部署参数
        data = request.json
        regions = data.get('regions')
        gpus_per_region = data.get('gpusPerRegion')
        model_size = data.get('modelSize')
        batch_size = data.get('batchSize')
        dp = data.get('dp')
        pp = data.get('pp')
        tp = data.get('tp')
        
        # 验证参数
        if not all([regions, gpus_per_region, model_size, batch_size, dp, pp, tp]):
            return jsonify({'success': False, 'error': '缺少必要的部署参数'}), 400
        
        # 生成唯一的部署ID
        deployment_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        deployment_path = os.path.join(deployments_dir, deployment_id)
        os.makedirs(deployment_path)
        
        # 生成DeepSpeed配置文件
        ds_config = {
            "train_batch_size": batch_size,
            "train_micro_batch_size_per_gpu": batch_size // sum(gpus_per_region),
            "gradient_accumulation_steps": 1,
            "optimizer": {
                "type": "AdamW",
                "params": {
                    "lr": 0.0001,
                    "betas": [0.9, 0.95],
                    "weight_decay": 0.01
                }
            },
            "gradient_clipping": 1.0,
            "zero_optimization": {
                "stage": 3,
                "offload_optimizer": {
                    "device": "cpu",
                    "pin_memory": True
                },
                "offload_param": {
                    "device": "cpu",
                    "pin_memory": True
                },
                "overlap_comm": True,
                "contiguous_gradients": True,
                "reduce_bucket_size": 100000000,
                "stage3_prefetch_bucket_size": 100000000,
                "stage3_param_persistence_threshold": 10000000,
                "stage3_max_live_parameters": 100000000,
                "stage3_max_reuse_distance": 100000000,
                "stage3_gather_16bit_weights_on_model_save": True
            },
            "fp16": {
                "enabled": True,
                "loss_scale": 0,
                "loss_scale_window": 1000,
                "hysteresis": 2,
                "min_loss_scale": 1
            },
            "wall_clock_breakdown": False
        }
        
        # 写入配置文件
        with open(os.path.join(deployment_path, 'ds_config.json'), 'w') as f:
            json.dump(ds_config, f, indent=2)
        
        # 生成启动脚本
        start_script = f"""#!/bin/bash

# 设置环境变量
export NCCL_DEBUG=INFO
# 跨地域训练优化
export NCCL_SOCKET_IFNAME=eth0
# Communication Compression
export NCCL_COMPRESSION=1
# 地域感知优化
export DEEPSPEED_REGION_AWARE=1

echo "开始部署DeepSpeed训练任务..."
echo "部署ID: {deployment_id}"
echo "模型大小: {model_size}B"
echo "GPU配置: {regions}个地域，GPU分布: {gpus_per_region}"
echo "并行策略: DP={dp}, PP={pp}, TP={tp}"

echo "请确保所有节点之间的网络连通性良好，并已安装必要的依赖。"

echo "如需实际运行，请执行以下命令:"
echo "deepspeed --num_gpus={sum(gpus_per_region)} --num_nodes={regions} --master_addr=master_node_ip --master_port=8888 train.py --model_size={model_size}B --data_parallel_size={dp} --pipeline_parallel_size={pp} --tensor_parallel_size={tp} --deepspeed --deepspeed_config=ds_config.json"

# 注意: 实际部署时，需要替换master_node_ip为实际的主节点IP地址
# 并确保train.py脚本存在且包含相应的参数处理逻辑
"""
        
        # 写入启动脚本
        script_path = os.path.join(deployment_path, 'run_training.sh')
        with open(script_path, 'w') as f:
            f.write(start_script)
        
        # 设置脚本可执行权限
        os.chmod(script_path, 0o755)
        
        # 记录部署日志
        logger.info(f"DeepSpeed部署任务创建成功: {deployment_id}")
        
        # 返回成功响应
        return jsonify({
            'success': True,
            'deployment_id': deployment_id,
            'message': 'DeepSpeed配置已生成，可在部署目录查看详细信息',
            'deployment_path': deployment_path
        })
        
    except Exception as e:
        logger.error(f"DeepSpeed部署失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate_training_script', methods=['POST'])
def generate_training_script():
    try:
        # 获取参数
        data = request.json
        model_size = data.get('modelSize')
        dp = data.get('dp')
        pp = data.get('pp')
        tp = data.get('tp')
        
        # 生成训练脚本模板
        training_script = f"""#!/usr/bin/env python

import deepspeed
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
import os

# 设置并行策略
dp_size = {dp}
pp_size = {pp}
tp_size = {tp}

# 初始化DeepSpeed分布式环境
torch.distributed.init_process_group(backend='nccl')

# 模型加载与并行化
model = AutoModelForCausalLM.from_pretrained(
    f"your-model-{model_size}b",
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True
)

# 使用DeepSpeed进行模型并行化
model = deepspeed.init_inference(
    model,
    mp_size=tp_size,
    dtype=torch.float16,
    replace_method='auto'
)

tokenizer = AutoTokenizer.from_pretrained(f"your-model-{model_size}b")

# 数据加载与预处理
# 这里需要替换为您的实际数据加载逻辑
def load_dataset():
    # 示例代码，实际使用时需要替换
    from datasets import load_dataset
    dataset = load_dataset("text", data_files={'train': 'train.txt', 'validation': 'validation.txt'})
    return dataset

dataset = load_dataset()

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=512)

tokenized_datasets = dataset.map(tokenize_function, batched=True)

# 训练参数配置
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=10,
    deepspeed="./ds_config.json",
    fp16=True,
)

# 训练器设置
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["validation"],
)

# 启动训练
trainer.train()

# 保存模型
trainer.save_model("./trained_model")
tokenizer.save_pretrained("./trained_model")
"""
        
        return jsonify({
            'success': True,
            'script': training_script
        })
        
    except Exception as e:
        logger.error(f"生成训练脚本失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)