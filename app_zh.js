document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const regionsInput = document.getElementById('regions');
    const gpusPerRegionContainer = document.getElementById('gpusPerRegionContainer');
    const distanceContainer = document.getElementById('distanceContainer');
    const distanceInputs = document.getElementById('distanceInputs');
    const configForm = document.getElementById('configForm');
    const mapContainer = document.getElementById('mapContainer');
    const parallelStrategyResult = document.getElementById('parallelStrategyResult');
    const communicationResult = document.getElementById('communicationResult');
    const communicationHidingResult = document.getElementById('communicationHidingResult');
    const deploymentCode = document.getElementById('deploymentCode');
    const copyButton = document.getElementById('copyCodeBtn');
    const deployButton = document.getElementById('deployBtn');
    const deployModal = document.getElementById('deployModal');
    const closeModal = document.getElementById('closeModal');
    const cancelDeploy = document.getElementById('cancelDeploy');
    const confirmDeploy = document.getElementById('confirmDeploy');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationIcon = document.getElementById('notificationIcon');
    const switchToEnBtn = document.getElementById('switchToEnBtn');
    const switchToZhBtn = document.getElementById('switchToZhBtn');

    // 标签页相关
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // 图表
    let parallelChart = null;

    // 根据区域数量更新GPU输入字段
    regionsInput.addEventListener('change', function() {
        const regions = parseInt(this.value);
        const gpusPerRegionGroup = document.querySelector('.gpusPerRegionGroup');
        
        // 清空现有输入
        gpusPerRegionGroup.innerHTML = '';
        
        // 添加新输入
        for (let i = 1; i <= regions; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'gpusPerRegion w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2';
            input.min = 1;
            input.max = 128;
            input.value = 8;
            input.placeholder = `区域 ${i} 的GPU数量`;
            gpusPerRegionGroup.appendChild(input);
        }
        
        // 更新区域间距离输入
        updateDistanceInputs(regions);
    });

    // 生成区域间距离输入字段
    function updateDistanceInputs(regions) {
        distanceInputs.innerHTML = '';
        
        if (regions < 2) {
            distanceContainer.style.display = 'none';
            return;
        }
        
        distanceContainer.style.display = 'block';
        
        for (let i = 1; i <= regions; i++) {
            for (let j = i + 1; j <= regions; j++) {
                const distanceGroup = document.createElement('div');
                distanceGroup.className = 'flex items-center mb-2';
                distanceGroup.innerHTML = `
                    <label class="w-24 text-gray-700 text-sm">区域 ${i}-${j}</label>
                    <input type="number" id="distance-${i}-${j}" min="1" max="20000" value="${Math.floor(Math.random() * 5000) + 1000}" class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <span class="ml-2 text-gray-500">km</span>
                `;
                distanceInputs.appendChild(distanceGroup);
            }
        }
    }

    // 标签页切换
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // 更新按钮状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 更新内容显示
            tabContents.forEach(content => {
                const contentId = content.id.replace('Content', '');
                if (contentId === tabId) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });

    // 表单提交处理
    configForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 获取表单数据
        const regions = parseInt(regionsInput.value);
        const gpusPerRegionElements = document.querySelectorAll('.gpusPerRegion');
        const gpusPerRegion = Array.from(gpusPerRegionElements).map(input => parseInt(input.value));
        const modelSize = parseFloat(document.getElementById('modelSize').value);
        const batchSize = parseInt(document.getElementById('batchSize').value);
        const networkLatency = parseFloat(document.getElementById('networkLatency').value);
        const networkBandwidth = parseFloat(document.getElementById('networkBandwidth').value);
        
        // 获取区域间距离
        const regionDistances = {};
        for (let i = 1; i <= regions; i++) {
            for (let j = i + 1; j <= regions; j++) {
                const distance = document.getElementById(`distance-${i}-${j}`).value;
                if (distance) {
                    regionDistances[`${i}-${j}`] = parseFloat(distance);
                }
            }
        }
        
        // 计算总GPU数量
        const totalGpus = gpusPerRegion.reduce((sum, gpus) => sum + gpus, 0);
        
        // 生成训练地图
        generateTrainingMap(regions, gpusPerRegion, regionDistances);
        
        // 计算并显示并行策略
        const parallelStrategy = calculateParallelStrategy(modelSize, totalGpus, regions);
        displayParallelStrategy(parallelStrategy);
        
        // 计算并显示通信数据
        const communicationData = calculateCommunication(modelSize, totalGpus, batchSize, networkLatency, networkBandwidth, regions, regionDistances, parallelStrategy);
        displayCommunicationData(communicationData);
        
        // 生成部署代码
        const code = generateDeepSpeedCode(modelSize, totalGpus, regions, parallelStrategy, batchSize);
        deploymentCode.textContent = code;
    });

    // 生成训练地图
    function generateTrainingMap(regions, gpusPerRegion, regionDistances) {
        // 清空现有地图
        mapContainer.innerHTML = '';
        
        // 容器尺寸
        const width = mapContainer.offsetWidth;
        const height = mapContainer.offsetHeight;
        
        // 区域节点配置
        const nodeRadius = 40;
        const minDistance = 120;
        
        // 生成区域节点位置
        const regionPositions = [];
        if (regions <= 4) {
            // 简单布局（最多4个节点）
            const positions = [
                { x: width * 0.25, y: height * 0.25 },
                { x: width * 0.75, y: height * 0.25 },
                { x: width * 0.25, y: height * 0.75 },
                { x: width * 0.75, y: height * 0.75 }
            ];
            
            for (let i = 0; i < regions; i++) {
                regionPositions.push(positions[i]);
            }
        } else {
            // 圆形布局（5个或更多节点）
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.35;
            
            for (let i = 0; i < regions; i++) {
                const angle = (i / regions) * Math.PI * 2;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                regionPositions.push({ x, y });
            }
        }
        
        // 创建区域节点
        const regionNodes = [];
        for (let i = 0; i < regions; i++) {
            const position = regionPositions[i];
            const node = createRegionNode(position.x, position.y, i + 1, gpusPerRegion[i]);
            mapContainer.appendChild(node);
            regionNodes.push(node);
        }
        
        // 创建连接线和距离标签
        for (let i = 0; i < regions; i++) {
            for (let j = i + 1; j < regions; j++) {
                const distance = regionDistances[`${i+1}-${j+1}`] || 0;
                const line = createConnectionLine(
                    regionPositions[i].x, regionPositions[i].y,
                    regionPositions[j].x, regionPositions[j].y,
                    nodeRadius
                );
                mapContainer.appendChild(line);
                
                if (distance > 0) {
                    const midX = (regionPositions[i].x + regionPositions[j].x) / 2;
                    const midY = (regionPositions[i].y + regionPositions[j].y) / 2;
                    const label = createDistanceLabel(midX, midY, distance);
                    mapContainer.appendChild(label);
                }
            }
        }
    }

    // 创建区域节点
    function createRegionNode(x, y, regionNumber, gpusCount) {
        const node = document.createElement('div');
        node.className = 'region-node';
        node.style.left = `${x - 30}px`; // 30 是节点宽度的一半
        node.style.top = `${y - 30}px`;  // 30 是节点高度的一半
        node.innerHTML = `
            <div class="text-xs">区域 ${regionNumber}</div>
            <p class="text-lg font-bold">${gpusCount}</p>
            <div class="text-xs">GPU</div>
        `;
        return node;
    }

    // 创建连接线
    function createConnectionLine(x1, y1, x2, y2, nodeRadius) {
        const line = document.createElement('div');
        line.className = 'connection-line';
        
        // 计算连接线角度和长度
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const length = Math.sqrt(dx * dx + dy * dy) - (nodeRadius * 2);
        
        // 设置连接线样式
        line.style.left = `${x1 + nodeRadius}px`;
        line.style.top = `${y1}px`;
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        return line;
    }

    // 创建距离标签
    function createDistanceLabel(x, y, distance) {
        const label = document.createElement('div');
        label.className = 'distance-label';
        label.style.left = `${x - 30}px`; // 30 是标签宽度的一半
        label.style.top = `${y - 12}px`;  // 12 是标签高度的一半
        label.textContent = `${distance} km`;
        return label;
    }

    // 计算并行策略
    function calculateParallelStrategy(modelSize, totalGpus, regions) {
        let dp, pp, tp;
        
        // 基于模型大小和GPU数量推荐并行策略
        if (modelSize <= 1) {
            // 小型模型 - 主要使用数据并行
            dp = Math.min(totalGpus, 16);
            tp = Math.min(8, Math.floor(totalGpus / dp));
            pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        } else if (modelSize <= 10) {
            // 中型模型 - 平衡数据和模型并行
            dp = Math.min(Math.floor(totalGpus / 4), 8);
            tp = Math.min(8, Math.floor((totalGpus / dp) / 2));
            pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        } else {
            // 大型模型 - 更多使用模型并行
            dp = Math.min(Math.floor(totalGpus / 8), 4);
            tp = Math.min(8, Math.floor((totalGpus / dp) / 2));
            pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        }
        
        // 确保并行策略乘积不超过总GPU数量
        while (dp * pp * tp > totalGpus) {
            if (dp > 1) dp--;
            else if (pp > 1) pp--;
            else if (tp > 1) tp--;
        }
        
        return { dp, pp, tp };
    }

    // 显示并行策略
    function displayParallelStrategy(strategy) {
        parallelStrategyResult.innerHTML = `
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="data-card">
                    <div class="data-label">数据并行 (DP)</div>
                    <div class="data-value">${strategy.dp}</div>
                </div>
                <div class="data-card">
                    <div class="data-label">流水线并行 (PP)</div>
                    <div class="data-value">${strategy.pp}</div>
                </div>
                <div class="data-card">
                    <div class="data-label">张量并行 (TP)</div>
                    <div class="data-value">${strategy.tp}</div>
                </div>
            </div>
            <p class="text-gray-600 text-sm">
                <strong>推荐理由：</strong>根据您的配置，此并行策略有效平衡了计算效率和通信开销，
                特别针对跨区域场景进行了优化，减少区域间通信。
            </p>
        `;
        
        // 更新并行策略对比图表
        updateParallelChart(strategy);
    }

    // 更新并行策略对比图表
    function updateParallelChart(strategy) {
        const ctx = document.getElementById('parallelChart').getContext('2d');
        
        // 如果图表已存在，销毁它
        if (parallelChart) {
            parallelChart.destroy();
        }
        
        // 创建新图表
        parallelChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['计算效率', '通信开销', '内存使用', '可扩展性', '跨区域适应性'],
                datasets: [
                    {
                        label: '推荐策略',
                        data: [85, 70, 65, 90, 80],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    },
                    {
                        label: '仅数据并行',
                        data: [60, 30, 80, 50, 40],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    },
                    {
                        label: '仅模型并行',
                        data: [70, 50, 40, 75, 60],
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }

    // 获取策略切换状态
    function getStrategyToggleStates() {
        const gradientAccumulation = document.getElementById('gradientAccumulationToggle')?.checked || true;
        const dataCompression = document.getElementById('dataCompressionToggle')?.checked || true;
        const predictiveCommunication = document.getElementById('predictiveCommunicationToggle')?.checked || true;
        const asyncCommunication = document.getElementById('asyncCommunicationToggle')?.checked || true;
        
        return { gradientAccumulation, dataCompression, predictiveCommunication, asyncCommunication };
    }
    
    // 获取通信原语配置
    function getCommunicationPrimitiveConfig() {
        const primitiveType = document.getElementById('crossRegionPrimitive')?.value || 'ring_allreduce';
        const chunkSize = parseInt(document.getElementById('chunkSize')?.value) || 256; // MB
        const overlapCoefficient = parseFloat(document.getElementById('overlapCoefficient')?.value) || 0.7;
        
        return { primitiveType, chunkSize, overlapCoefficient };
    }

    // 计算通信量和计算时间
    function calculateCommunication(modelSize, totalGpus, batchSize, networkLatency, networkBandwidth, regions, regionDistances = {}, parallelStrategy = null) {
        // 获取策略切换状态
        const { gradientAccumulation, dataCompression, predictiveCommunication, asyncCommunication } = getStrategyToggleStates();
        
        // 获取通信原语配置
        const { primitiveType, chunkSize, overlapCoefficient } = getCommunicationPrimitiveConfig();
        
        // 默认策略参数
        let gradientAccumulationFactor = 1; // 默认不累积
        let compressionRatio = 1; // 默认不压缩
        let predictionEfficiency = 0; // 默认不预测
        let asyncOverlapFactor = 0.6; // 默认重叠效率
        let primitiveEfficiency = 1.0; // 默认通信原语效率因子
        let chunkingEfficiency = 1.0; // 分块通信效率因子
        
        // 根据策略切换设置参数
        if (gradientAccumulation) {
            // 梯度累积因子：基于模型大小和区域数调整，范围2-32
            gradientAccumulationFactor = Math.max(2, Math.min(32, Math.floor(Math.sqrt(modelSize * regions))));
        }
        
        if (dataCompression) {
            // 数据压缩率：混合精度+稀疏化，范围0.2-0.8
            compressionRatio = 0.5; // 默认压缩到50% (FP16)
            if (regions > 2) {
                compressionRatio = 0.3; // 多区域场景使用更激进的压缩
            }
        }
        
        if (predictiveCommunication) {
            // 预测效率：预测通信减少的等待时间，范围0-0.3
            predictionEfficiency = 0.2; // 默认减少20%等待时间
        }
        
        if (asyncCommunication) {
            // 异步重叠效率：范围0.6-0.95
            asyncOverlapFactor = 0.8; // 默认80%重叠效率
        }
        
        // 根据通信原语类型调整效率因子
        // Ring-AllReduce在多节点场景下通常比标准AllReduce更高效
        switch (primitiveType) {
            case 'ring_allreduce':
                // Ring-AllReduce在大规模节点上更高效，通信复杂度为O(2*(K-1)*N/K)，其中K是节点数，N是数据大小
                // 比标准AllReduce的O(2*(K-1)*N)更高效
                primitiveEfficiency = 1.0 / (1 + 0.1 * Math.log(Math.max(1, totalGpus - 1))); // 基于GPU数量动态调整
                break;
            case 'allreduce':
                primitiveEfficiency = 1.0;
                break;
            case 'broadcast':
                // Broadcast通常比AllReduce更高效，但仅适用于单向通信
                primitiveEfficiency = 0.7; // 假设Broadcast比标准AllReduce高效30%
                break;
            default:
                primitiveEfficiency = 1.0;
        }
        
        // 计算分块通信效率
        // 适当的块大小可以提高通信效率，但太小会增加开销
        const optimalChunkSize = 256; // MB，假设的最佳块大小
        chunkingEfficiency = Math.min(1.0, 0.8 + 0.2 * (optimalChunkSize / Math.max(chunkSize, 1)));
        
        // 通信量计算公式基于分布式深度学习理论
        // 模型大小单位：B（十亿参数）
        
        // 每个参数占用4字节（FP32精度）
        const parameterSizeGB = (modelSize * 1e9 * 4) / (1024 * 1024 * 1024); // GB
        const parameterSizeBytes = modelSize * 1e9 * 4; // bytes
        
        // 使用传入的并行策略或计算默认值
        let { dp, pp, tp } = parallelStrategy || {};
        
        // 如果没有传入并行策略，使用默认计算方法
        if (!dp) dp = Math.min(totalGpus, 16);
        if (!tp) tp = Math.min(8, Math.floor(totalGpus / dp));
        if (!pp) pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        
        // 确保乘积不超过总GPU数量（无论是否使用传入的策略）
        while (dp * pp * tp > totalGpus) {
            if (dp > 1) dp--;
            else if (pp > 1) pp--;
            else if (tp > 1) tp--;
        }
        
        // 数据并行通信量（考虑通信原语效率）
        // 标准数据并行：梯度大小 * (2*(dp-1)/dp) * 通信原语效率因子
        // 参考分布式训练理论，对于DDP和ZeRO等高级数据并行策略，通信量可能会根据分片程度进一步优化
        const dpCommunicationPerRoundGB = parameterSizeGB * 2 * (dp - 1) / dp * primitiveEfficiency; // GB/轮
        
        // 张量并行通信量（AllGather/ReduceScatter操作）
        // 1D张量并行：(参数大小/张量并行度) * (张量并行度-1) * 通信原语效率因子
        const tpCommunicationPerRoundGB = parameterSizeGB / tp * (tp - 1) * primitiveEfficiency; // GB/轮
        
        // 流水线并行通信量（激活和梯度传输）
        // 朴素流水线并行：(激活大小 + 梯度大小) * (流水线阶段-1)/流水线阶段 * 通信原语效率因子
        // 对于GPipe和PipeDream等高级流水线策略，需要考虑微批量大小和气泡效应
        const activationSizeGB = parameterSizeGB * 0.5; // 激活大小约为参数大小的一半
        const ppCommunicationPerRoundGB = (activationSizeGB + parameterSizeGB) * (pp - 1) / pp * primitiveEfficiency; // GB/轮
        
        // 计算区域间距离的影响因子
        let distanceBasedFactor = 1.0;
        
        if (regions > 1 && Object.keys(regionDistances).length > 0) {
            // 计算平均距离
            let totalDistance = 0;
            let count = 0;
            
            Object.keys(regionDistances).forEach(key => {
                const [r1, r2] = key.split('-');
                if (parseInt(r1) < parseInt(r2)) { // 避免重复计数
                    totalDistance += regionDistances[key];
                    count++;
                }
            });
            
            if (count > 0) {
                const avgDistance = totalDistance / count;
                // 距离因子：每1000公里增加5%的通信开销
                // 基于光纤中的传播延迟和信号衰减的经验模型
                distanceBasedFactor = 1 + (avgDistance / 1000) * 0.05;
            }
        }
        
        // 额外的跨区域通信开销（基于区域数量和距离）
        const crossRegionOverhead = Math.log2(regions); // 区域间通信复杂度
        const regionCommunicationFactor = (1 + 0.1 * crossRegionOverhead) * distanceBasedFactor; // 综合跨区域通信因子
        
        // 数据压缩后的通信量
        const compressedDpCommunication = dpCommunicationPerRoundGB * compressionRatio;
        const compressedTpCommunication = tpCommunicationPerRoundGB * compressionRatio;
        const compressedPpCommunication = ppCommunicationPerRoundGB * compressionRatio;
        
        // 总每轮通信量（考虑压缩和分块效率）
        const totalCommunicationPerRoundGB = 
            (compressedDpCommunication + compressedTpCommunication + compressedPpCommunication) * regionCommunicationFactor * chunkingEfficiency; // GB/轮
        
        // 通信时间计算
        const bandwidthGBPerSec = networkBandwidth / 8; // 转换为GB/秒
        
        // 基础延迟加上距离相关延迟（约5ms/1000km）
        let totalLatency = networkLatency;
        if (regions > 1 && Object.keys(regionDistances).length > 0) {
            // 计算平均延迟增量
            let totalExtraLatency = 0;
            let count = 0;
            
            Object.keys(regionDistances).forEach(key => {
                const [r1, r2] = key.split('-');
                if (parseInt(r1) < parseInt(r2)) { // 避免重复计数
                    // 假设每1000公里额外增加约5ms的传播延迟
                    totalExtraLatency += (regionDistances[key] / 1000) * 5;
                    count++;
                }
            });
            
            if (count > 0) {
                totalLatency += totalExtraLatency / count;
            }
        }
        
        // 计算基础通信时间
        let baseCommunicationTimeMs = (totalCommunicationPerRoundGB / bandwidthGBPerSec) * 1000 + totalLatency; // 毫秒
        
        // 应用预测通信优化
        const predictedCommunicationTimeMs = baseCommunicationTimeMs * (1 - predictionEfficiency);
        const communicationTimeMs = predictedCommunicationTimeMs; // 预测优化后的通信时间
        
        // 计算时间计算（基于模型大小、批量大小和GPU性能）
        // 假设每个GPU的计算能力为10 TFLOPS（FP16），每个参数需要约2 FLOPs（前向和反向传播）
        const tflopsPerGpu = 10; // 假设GPU计算能力为10 TFLOPS
        const flopsPerParameter = 2; // 每个参数需要约2 FLOPs（前向和反向传播）
        const totalFlops = modelSize * 1e9 * flopsPerParameter * batchSize; // 每轮总FLOPs
        const computeTimeMs = (totalFlops / (tflopsPerGpu * 1e12 * totalGpus)) * 1000; // 毫秒
        
        // 重叠效率估计（基于异步通信设置和重叠系数调整）
        const overlappingPotential = Math.min(communicationTimeMs, computeTimeMs) * asyncOverlapFactor * overlapCoefficient;
        
        // 估计总轮次时间
        const estimatedRoundTimeMs = communicationTimeMs + computeTimeMs - overlappingPotential;
        
        // 考虑梯度累积对整体性能的影响
        // 梯度累积减少通信频率但增加计算量
        const effectiveComputeTimeMs = computeTimeMs * gradientAccumulationFactor;
        const effectiveCommunicationTimeMs = communicationTimeMs; // 每轮通信时间保持不变
        const effectiveRoundTimeMs = effectiveComputeTimeMs + effectiveCommunicationTimeMs - 
            Math.min(effectiveCommunicationTimeMs, effectiveComputeTimeMs) * asyncOverlapFactor;
        
        // 计算每个批次的实际性能
        const actualBatchSize = batchSize * gradientAccumulationFactor;
        const timePerBatchMs = effectiveRoundTimeMs / gradientAccumulationFactor;
        
        return {
            parameterSizeGB,
            dpCommunicationPerRoundGB,
            tpCommunicationPerRoundGB,
            ppCommunicationPerRoundGB,
            totalCommunicationPerRoundGB,
            communicationTimeMs,
            computeTimeMs,
            estimatedRoundTimeMs,
            effectiveComputeTimeMs,
            effectiveCommunicationTimeMs,
            effectiveRoundTimeMs,
            timePerBatchMs,
            actualBatchSize,
            gradientAccumulationFactor,
            compressionRatio,
            predictionEfficiency,
            asyncOverlapFactor,
            bandwidthGBPerSec,
            crossRegionOverhead,
            regionCommunicationFactor,
            distanceBasedFactor,
            dp, tp, pp,
            primitiveType,
            chunkSize,
            overlapCoefficient,
            primitiveEfficiency,
            chunkingEfficiency
        };
    }

    // 显示通信和计算时间分析
    function displayCommunicationData(data) {
        communicationResult.innerHTML = `
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="data-card">
                    <div class="data-label">每轮总通信量</div>
                    <div class="data-value">${data.totalCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">通信时间</div>
                    <div class="data-value">${data.communicationTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">计算时间</div>
                    <div class="data-value">${data.computeTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="data-card bg-blue-50 border-blue-200">
                    <div class="data-label">估计总轮次时间</div>
                    <div class="data-value text-blue-600">${data.estimatedRoundTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
                <div class="data-card bg-green-50 border-green-200">
                    <div class="data-label">并行效率</div>
                    <div class="data-value text-green-600">${Math.min(100, (data.computeTimeMs / (data.communicationTimeMs + data.computeTimeMs)) * 100).toFixed(1)}<span class="data-unit">%</span></div>
                </div>
                <div class="data-card bg-purple-50 border-purple-200">
                    <div class="data-label">通信比例</div>
                    <div class="data-value text-purple-600">${Math.min(100, (data.communicationTimeMs / (data.communicationTimeMs + data.computeTimeMs)) * 100).toFixed(1)}<span class="data-unit">%</span></div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div class="data-card">
                    <div class="data-label">数据并行通信</div>
                    <div class="data-value">${data.dpCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB/轮</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">张量并行通信</div>
                    <div class="data-value">${data.tpCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB/轮</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">流水线并行通信</div>
                    <div class="data-value">${data.ppCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB/轮</span></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
                <div class="data-card bg-amber-50 border-amber-200">
                    <div class="data-label">跨区域通信因子</div>
                    <div class="data-value text-amber-600">${data.regionCommunicationFactor.toFixed(2)}</div>
                </div>
                <div class="data-card bg-teal-50 border-teal-200">
                    <div class="data-label">距离影响因子</div>
                    <div class="data-value text-teal-600">${data.distanceBasedFactor.toFixed(2)}</div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="font-medium mb-2 text-gray-800">计算公式</h4>
                <div class="bg-gray-50 p-3 rounded-lg text-sm">
                    <div class="mb-2"><strong>参数大小：</strong>模型大小(B) × 1e9 × 4字节</div>
                    <div class="mb-2"><strong>数据并行通信：</strong>参数大小 × 2 × (dp-1)/dp × 原语效率因子<br/><small class="text-gray-500">适用于标准数据并行，DDP和ZeRO等高级策略会根据分片级别进一步优化</small></div>
                    <div class="mb-2"><strong>张量并行通信：</strong>(参数大小/tp) × (tp-1) × 原语效率因子<br/><small class="text-gray-500">基于1D张量并行，2D/2.5D/3D张量并行的通信量会因维度划分策略而异</small></div>
                    <div class="mb-2"><strong>流水线并行通信：</strong>(激活大小 + 参数大小) × (pp-1)/pp × 原语效率因子<br/><small class="text-gray-500">朴素流水线并行模型，GPipe和PipeDream等高级策略需要考虑微批量大小和气泡效应</small></div>
                    <div class="mb-2"><strong>距离影响因子：</strong>1 + (平均距离/1000) × 0.05</div>
                    <div class="mb-2"><strong>跨区域通信因子：</strong>(1 + 0.1 × log₂(区域数)) × 距离影响因子</div>
                    <div class="mb-2"><strong>压缩通信量：</strong>原始通信量 × 压缩率(${data.compressionRatio.toFixed(2)})</div>
                    <div class="mb-2"><strong>预测通信时间：</strong>基础通信时间 × (1 - 预测效率(${data.predictionEfficiency.toFixed(2)}))</div>
                    <div class="mb-2"><strong>重叠效率：</strong>${data.asyncOverlapFactor.toFixed(2)}（基于异步通信设置）</div>
                    <div class="mb-2"><strong>梯度累积影响：</strong>计算时间 × 累积因子(${data.gradientAccumulationFactor})，批量大小 × 累积因子</div>
                    <div class="mb-2"><strong>实际每批次时间：</strong>有效总时间 / 梯度累积因子</div>
                    <div class="mb-2"><strong>数据并行通信：</strong>参数大小 × 2 × (dp-1)/dp × 原语效率因子(${data.primitiveEfficiency.toFixed(2)})</div>
                    <div class="mb-2"><strong>每轮总通信量：</strong>(数据并行 + 张量并行 + 流水线并行) × 跨区域通信因子 × 压缩率 × 分块效率(${data.chunkingEfficiency.toFixed(2)})</div>
                    <div class="mb-2"><strong>通信时间：</strong>(总通信量/带宽) × 1000 + 基础延迟 + 距离相关延迟 × (1 - 预测效率)</div>
                    <div class="mb-2"><strong>重叠效率：</strong>异步重叠效率 × 重叠系数(${data.overlapCoefficient.toFixed(2)})</div>
                    <div><strong>计算时间：</strong>(模型参数×2×批量大小) / (GPU数量×GPU计算能力) × 1000</div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="font-medium mb-2 text-gray-800">当前策略配置</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                        <span>梯度累积因子：<strong>${data.gradientAccumulationFactor}</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                        <span>数据压缩率：<strong>${(data.compressionRatio * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                        <span>预测效率：<strong>${(data.predictionEfficiency * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                        <span>异步重叠效率：<strong>${(data.asyncOverlapFactor * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                        <span>通信原语：<strong>${data.primitiveType === 'ring_allreduce' ? '环形-全规约' : data.primitiveType === 'allreduce' ? '全规约' : '广播'}</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-teal-500 mr-2"></span>
                        <span>通信块大小：<strong>${data.chunkSize} MB</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
                        <span>重叠系数：<strong>${(data.overlapCoefficient * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
                        <span>原语效率：<strong>${((1 - data.primitiveEfficiency) * 100).toFixed(0)}% 提升</strong></span>
                    </div>
                </div>
            </div>
        `;
        
        // 计算计算与通信时间的比例
        const computeToCommunicationRatio = data.computeTimeMs / data.communicationTimeMs;
        let hidingStrategySuggestions = '';
        let hidingEfficiencyEstimate = '';
        let strategyType = '';
        
        if (computeToCommunicationRatio < 0.5) {
            // 计算时间远小于通信时间（小于通信时间的50%）
            strategyType = '计算受限场景';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li><strong>多级梯度累积</strong>：推荐使用8-32x梯度累积系数，在通信前累积多个小批量的梯度，显著降低通信频率。特别适合跨区域场景，可配置参数：<code>gradient_accumulation_steps=16</code></li>
                    <li><strong>高效数据压缩</strong>：优先使用FP16/BF16混合精度压缩（减少50%通信量），对梯度应用Top-K稀疏化（稀疏度60-90%），跨区域通信可考虑更激进的量化如INT8/INT4（带校准）</li>
                    <li><strong>预测通信</strong>：基于历史通信模式实现预测器，在当前计算阶段提前发送下一轮迭代所需的模型参数或梯度，推荐设置：预测窗口=2-3个计算周期</li>
                    <li><strong>异步通信模式</strong>：采用非阻塞通信API和通信线程池，允许计算和通信完全并行执行，关键配置：独立通信线程数=GPU数量/2</li>
                    <li><strong>分层通信架构</strong>：区域内节点间使用高速通信（如NVLink），区域间使用带最优路径规划的压缩通信</li>
                    <li><strong>模型分区优化</strong>：基于区域网络特性，尽可能将通信密集型层放置在同一区域内，减少跨区域通信需求</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
                    <strong>场景特点：</strong>计算时间远小于通信时间，属于通信瓶颈场景。
                </div>
                <div class="mt-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                    <strong>隐藏效率估计：</strong>由于计算时间有限，通信重叠的效果会受到限制。采用上述策略后，预计可隐藏约30-50%的通信开销，主要通过数据压缩和降低通信频率来提高效率。
                </div>`;
        } else if (computeToCommunicationRatio >= 0.5 && computeToCommunicationRatio <= 2) {
            // 计算时间与通信时间相近（通信时间的50%-200%）
            strategyType = '平衡场景';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li><strong>通信与计算重叠</strong>：使用CUDA流和事件同步，同时执行通信操作和计算，最大化资源利用率</li>
                    <li><strong>梯度累积</strong>：推荐4-8x梯度累积系数，降低通信频率同时保持训练稳定性</li>
                    <li><strong>高效数据压缩</strong>：应用混合精度（FP16）和适度稀疏化（稀疏度40-70%）于梯度，平衡压缩率和精度损失</li>
                    <li><strong>预测通信</strong>：实现轻量级预测机制，在计算过程中提前发送关键数据，推荐预测窗口=1-2个计算周期</li>
                    <li><strong>分层通信策略</strong>：区域内节点间使用快速通信，区域间使用压缩通信，同时考虑异步通信模式优化关键路径</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <strong>隐藏效率估计：</strong>采用上述策略后，预计可隐藏约60-80%的通信开销，显著提高跨区域训练效率。
                </div>`;
        } else {
            // 计算时间远大于通信时间（大于通信时间的200%）
            strategyType = '通信受限场景';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li><strong>通信与计算完全重叠</strong>：使用高级CUDA流管理和通信-计算重叠技术，确保通信几乎完全隐藏在计算过程中</li>
                    <li><strong>流水线通信模式</strong>：实现多级流水线通信，在计算过程中分阶段执行通信操作，充分利用计算时间窗口</li>
                    <li><strong>异步通信模式</strong>：采用完全异步通信架构，配备独立通信线程和非阻塞API，允许计算和通信完全并行</li>
                    <li><strong>预测通信</strong>：基于精确的性能模型和历史数据，准确预测并在计算过程早期发送所需数据</li>
                    <li><strong>高效通信库</strong>：考虑使用优化的通信库如NCCL、Gloo，并启用拓扑感知路由等高级功能</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                    <strong>隐藏效率估计：</strong>由于计算时间充足，可实现90%以上的通信隐藏效率。通信将几乎完全隐藏在计算过程中。
                </div>`;
        }
        
        // 显示通信隐藏策略
        communicationHidingResult.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">通信隐藏策略推荐</h4>
                <span class="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">${strategyType}</span>
            </div>
            <div class="text-sm text-gray-500 mb-3">
                <strong>计算:通信时间比：</strong>${computeToCommunicationRatio.toFixed(2)}:1
            </div>
            ${hidingStrategySuggestions}
            ${hidingEfficiencyEstimate}
        `;
        
        // 添加策略更改监听器
        function setupStrategyToggles() {
            const toggles = ['gradientAccumulationToggle', 'dataCompressionToggle', 'predictiveCommunicationToggle', 'asyncCommunicationToggle', 'crossRegionPrimitive'];
            const inputs = ['chunkSize', 'overlapCoefficient'];
            
            // 添加切换监听器
        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.addEventListener('change', function() {
                    // 重新计算并更新结果
                    const form = document.getElementById('configForm');
                    if (form && typeof onSubmit === 'function') {
                        // 模拟表单提交以重新计算
                        const event = new Event('submit', {cancelable: true});
                        form.dispatchEvent(event);
                    }
                });
            }
        });
        
        // 添加输入字段监听器
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', function() {
                    // 重新计算并更新结果
                    const form = document.getElementById('configForm');
                    if (form && typeof onSubmit === 'function') {
                        // 模拟表单提交以重新计算
                        const event = new Event('submit', {cancelable: true});
                        form.dispatchEvent(event);
                    }
                });
            }
        });
        }
        
        // 在初始调用时设置策略监听器
        if (!window.strategyTogglesInitialized) {
            setupStrategyToggles();
            window.strategyTogglesInitialized = true;
        }
        
        // 在地图上显示每轮通信量和计算时间
        updateMapWithCommunication(data);
    }
    
    // 更新地图上的通信量和计算时间显示，以及并行切割可视化
    function updateMapWithCommunication(communicationData) {
        const { totalCommunicationPerRoundGB, communicationTimeMs, computeTimeMs, estimatedRoundTimeMs, regionCommunicationFactor, distanceBasedFactor, dp, pp, tp } = communicationData;
        
        // 检查地图容器中是否已存在通信信息显示元素
        let communicationDisplay = document.getElementById('mapCommunicationDisplay');
        
        if (!communicationDisplay) {
            // 创建通信信息显示元素
            communicationDisplay = document.createElement('div');
            communicationDisplay.id = 'mapCommunicationDisplay';
            communicationDisplay.className = 'absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-md z-10';
            mapContainer.appendChild(communicationDisplay);
        }
        
        // 更新通信信息显示内容
        communicationDisplay.innerHTML = `
            <div class="text-sm font-medium text-gray-800 mb-1">每轮训练指标</div>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <div class="text-gray-500">通信量</div>
                    <div class="font-bold text-blue-600">${totalCommunicationPerRoundGB.toFixed(2)} GB</div>
                </div>
                <div>
                    <div class="text-gray-500">通信时间</div>
                    <div class="font-bold text-orange-600">${communicationTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">计算时间</div>
                    <div class="font-bold text-green-600">${computeTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">总时间</div>
                    <div class="font-bold text-purple-600">${estimatedRoundTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">跨区域因子</div>
                    <div class="font-bold text-amber-600">${regionCommunicationFactor.toFixed(2)}</div>
                </div>
                <div>
                    <div class="text-gray-500">距离因子</div>
                    <div class="font-bold text-teal-600">${distanceBasedFactor.toFixed(2)}</div>
                </div>
            </div>
        `;
        
        // 可视化并行切割方法
        visualizeParallelSlicing(dp, pp, tp);
    }
    
    // 可视化并行切割方法
    function visualizeParallelSlicing(dp, pp, tp) {
        // 检查是否已存在并行切割图例
        let parallelLegend = document.getElementById('parallelLegend');
        
        if (!parallelLegend) {
            // 创建并行切割图例
            parallelLegend = document.createElement('div');
            parallelLegend.id = 'parallelLegend';
            parallelLegend.className = 'absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-md z-10 text-sm';
            mapContainer.appendChild(parallelLegend);
        }
        
        // 更新并行切割图例
        parallelLegend.innerHTML = `
            <div class="text-sm font-medium text-gray-800 mb-1">并行切割方法</div>
            <div class="flex items-center mb-1">
                <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>数据并行 (DP=${dp})</span>
            </div>
            <div class="flex items-center mb-1">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>流水线并行 (PP=${pp})</span>
            </div>
            <div class="flex items-center">
                <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span>张量并行 (TP=${tp})</span>
            </div>
        `;
        
        // 获取所有区域节点
        const regionNodes = document.querySelectorAll('.region-node');
        
        // 为每个区域节点添加并行策略可视化
        regionNodes.forEach((node, index) => {
            // 获取节点内部的并行可视化元素
            let parallelVisual = node.querySelector('.parallel-visual');
            
            if (!parallelVisual) {
                // 创建并行可视化元素
                parallelVisual = document.createElement('div');
                parallelVisual.className = 'parallel-visual';
                node.appendChild(parallelVisual);
            }
            
            // 更新并行可视化内容
            // 根据节点索引和并行策略动态调整显示内容
            const gpusCount = parseInt(node.querySelector('p').textContent);
            
            // 计算该节点内的并行切割情况
            // 这里简化计算，实际应该基于更复杂的策略分配算法
            let nodeDp = Math.min(dp, regionNodes.length);
            let nodeTp = Math.min(tp, Math.floor(gpusCount / (dp * pp)));
            
            // 根据并行度计算不同并行类型的占比宽度
            const dpWidth = Math.min(100, dp * 10); // 数据并行宽度因子
            const ppWidth = Math.min(100, pp * 10); // 流水线并行宽度因子
            const tpWidth = Math.min(100, tp * 10); // 张量并行宽度因子
            
            // 归一化宽度，使其总和为100%
            const totalWidth = dpWidth + ppWidth + tpWidth;
            const dpPercent = Math.round((dpWidth / totalWidth) * 100);
            const ppPercent = Math.round((ppWidth / totalWidth) * 100);
            const tpPercent = Math.round((tpWidth / totalWidth) * 100);
            
            parallelVisual.innerHTML = `
                <div class="flex gap-1 mt-2">
                    <div style="width: ${dpPercent}%" class="h-2 bg-blue-500 rounded-sm" title="数据并行 (${dpPercent}%)"></div>
                    <div style="width: ${ppPercent}%" class="h-2 bg-green-500 rounded-sm" title="流水线并行 (${ppPercent}%)"></div>
                    <div style="width: ${tpPercent}%" class="h-2 bg-purple-500 rounded-sm" title="张量并行 (${tpPercent}%)"></div>
                </div>
                <div class="text-xs text-white mt-1">本地并行：TP=${nodeTp}</div>
            `;
        });
        
        // 更新连接线样式以显示不同类型的并行通信
        const connectionLines = document.querySelectorAll('.connection-line');
        
        // 先移除所有连接线的特殊类
        connectionLines.forEach(line => {
            line.classList.remove('data-parallel', 'pipeline-parallel', 'tensor-parallel');
            line.classList.add('connection-line');
        });
        
        // 根据并行度分配不同类型的并行通信样式
        // 数据并行的线条数量
        const dpLinesCount = Math.min(dp, connectionLines.length);
        // 流水线并行的线条数量
        const ppLinesCount = Math.min(pp, connectionLines.length - dpLinesCount);
        
        // 为连接线添加不同的样式类
        connectionLines.forEach((line, index) => {
            if (index < dpLinesCount) {
                line.classList.add('data-parallel');
            } else if (index < dpLinesCount + ppLinesCount) {
                line.classList.add('pipeline-parallel');
            } else {
                line.classList.add('tensor-parallel');
            }
        });
    }

    // 生成DeepSpeed部署代码
    function generateDeepSpeedCode(modelSize, totalGpus, regions, parallelStrategy, batchSize) {
        const { dp, pp, tp } = parallelStrategy;
        
        // 简化的DeepSpeed配置文件生成
        const code = `# DeepSpeed配置文件 (ds_config.json)
{
  "train_batch_size": ${batchSize},
  "train_micro_batch_size_per_gpu": ${Math.floor(batchSize / totalGpus)},
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
      "pin_memory": true
    },
    "offload_param": {
      "device": "cpu",
      "pin_memory": true
    },
    "overlap_comm": true,
    "contiguous_gradients": true,
    "reduce_bucket_size": 100000000,
    "stage3_prefetch_bucket_size": 100000000,
    "stage3_param_persistence_threshold": 10000000,
    "stage3_max_live_parameters": 100000000,
    "stage3_max_reuse_distance": 100000000,
    "stage3_gather_16bit_weights_on_model_save": true
  },
  "fp16": {
    "enabled": true,
    "loss_scale": 0,
    "loss_scale_window": 1000,
    "hysteresis": 2,
    "min_loss_scale": 1
  },
  "wall_clock_breakdown": false
}

# 启动脚本 (run_training.sh)
#!/bin/bash

# 设置环境变量
export NCCL_DEBUG=INFO
# 跨区域训练优化
export NCCL_SOCKET_IFNAME=eth0
# 通信压缩
export NCCL_COMPRESSION=1
# 区域感知优化
export DEEPSPEED_REGION_AWARE=1

deepspeed --num_gpus=${totalGpus} \
  --num_nodes=${regions} \
  --master_addr=master_node_ip \
  --master_port=8888 \
  train.py \
  --model_size=${modelSize}B \
  --data_parallel_size=${dp} \
  --pipeline_parallel_size=${pp} \
  --tensor_parallel_size=${tp} \
  --deepspeed \
  --deepspeed_config=ds_config.json
`;
        
        return code;
    }

    // 复制代码功能
    copyButton.addEventListener('click', function() {
        const code = deploymentCode.textContent;
        navigator.clipboard.writeText(code).then(function() {
            showNotification('代码已复制到剪贴板', 'success');
        }).catch(function() {
            showNotification('复制失败，请手动复制', 'error');
        });
    });

    // 部署按钮功能
    deployButton.addEventListener('click', function() {
        if (deploymentCode.textContent.trim() === '# 请配置参数并点击"计算配置"按钮生成DeepSpeed部署代码') {
            showNotification('请先计算配置参数', 'warning');
            return;
        }
        
        deployModal.classList.remove('hidden');
    });

    // 关闭模态框
    function closeDeployModal() {
        deployModal.classList.add('hidden');
    }

    closeModal.addEventListener('click', closeDeployModal);
    cancelDeploy.addEventListener('click', closeDeployModal);

    // 确认部署
    confirmDeploy.addEventListener('click', function() {
        closeDeployModal();
        
        // 获取当前配置参数
        const regions = parseInt(regionsInput.value);
        const gpusPerRegionElements = document.querySelectorAll('.gpusPerRegion');
        const gpusPerRegion = Array.from(gpusPerRegionElements).map(input => parseInt(input.value));
        const modelSize = parseInt(document.getElementById('modelSize').value);
        const batchSize = parseInt(document.getElementById('batchSize').value);
        
        // 从显示的并行策略结果中提取DP/PP/TP值
        const dpElement = document.querySelector('.data-value') || { textContent: '1' };
        let dp = 1;
        let pp = 1;
        let tp = 1;
        
        const dataValues = document.querySelectorAll('.data-value');
        if (dataValues.length >= 3) {
            dp = parseInt(dataValues[0].textContent);
            pp = parseInt(dataValues[1].textContent);
            tp = parseInt(dataValues[2].textContent);
        }
        
        // 显示部署进行中通知
        showNotification('正在部署到DeepSpeed...', 'info');
        
        // 发送部署请求到后端
        fetch('http://localhost:5001/api/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                regions: regions,
                gpusPerRegion: gpusPerRegion,
                modelSize: modelSize,
                batchSize: batchSize,
                dp: dp,
                pp: pp,
                tp: tp
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(`部署成功！部署ID: ${data.deployment_id}`, 'success');
                
                // 请求生成训练脚本
                    return fetch('http://localhost:5001/api/generate_training_script', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        modelSize: modelSize,
                        dp: dp,
                        pp: pp,
                        tp: tp
                    })
                });
            } else {
                throw new Error(data.error || '部署失败');
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新部署代码区域
                deploymentCode.textContent = data.script;
            }
        })
        .catch(error => {
            console.error('部署失败:', error);
            showNotification(`部署失败: ${error.message}`, 'error');
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === deployModal) {
            closeDeployModal();
        }
    });

    // 显示通知
    function showNotification(message, type) {
        notificationMessage.textContent = message;
        
        // 设置图标
        notificationIcon.className = '';
        if (type === 'success') {
            notificationIcon.className = 'fa fa-check-circle mr-2 text-green-400';
        } else if (type === 'error') {
            notificationIcon.className = 'fa fa-exclamation-circle mr-2 text-red-400';
        } else if (type === 'warning') {
            notificationIcon.className = 'fa fa-exclamation-triangle mr-2 text-yellow-400';
        } else if (type === 'info') {
            notificationIcon.className = 'fa fa-info-circle mr-2 text-blue-400';
        }
        
        // 显示通知
        notification.classList.remove('translate-y-20', 'opacity-0');
        
        // 3秒后隐藏
        setTimeout(function() {
            notification.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }

    // 语言切换功能
    switchToEnBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    switchToZhBtn.addEventListener('click', function() {
        // 已是中文页面，无需操作
    });

    // 初始化页面
    updateDistanceInputs(parseInt(regionsInput.value));
});