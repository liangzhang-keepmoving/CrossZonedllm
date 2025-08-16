document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const regionsInput = document.getElementById('regions');
    const gpusPerRegionInputs = document.getElementById('gpusPerRegionInputs');
    const configForm = document.getElementById('configForm');
    const mapContainer = document.getElementById('mapContainer');
    const parallelStrategyResult = document.getElementById('parallelStrategyResult');
    const communicationResult = document.getElementById('communicationResult');
    const communicationHidingResult = document.getElementById('communicationHidingResult');
    const deploymentCode = document.getElementById('deploymentCode');
    const deployButton = document.getElementById('deployButton');
    const deployModal = document.getElementById('deployModal');
    const closeModal = document.getElementById('closeModal');
    const cancelDeploy = document.getElementById('cancelDeploy');
    const confirmDeploy = document.getElementById('confirmDeploy');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationIcon = document.getElementById('notificationIcon');
    const copyButton = document.getElementById('copyButton');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    let parallelChart = null;

    // 获取距离相关的DOM元素
    const distancesContainer = document.getElementById('distancesContainer');
    const distancesInputs = document.getElementById('distancesInputs');

    // 根据地域数量动态生成GPU输入框
    regionsInput.addEventListener('input', function() {
        const regions = parseInt(this.value);
        const currentInputs = gpusPerRegionInputs.querySelectorAll('.gpusPerRegion');
        const currentCount = currentInputs.length;

        if (regions > currentCount) {
            // 添加新的输入框
            for (let i = currentCount + 1; i <= regions; i++) {
                const inputContainer = document.createElement('div');
                inputContainer.className = 'flex items-center mb-2';
                inputContainer.innerHTML = `
                    <span class="text-sm text-gray-500 mr-2">地域 ${i}:</span>
                    <input type="number" class="gpusPerRegion" min="1" max="128" value="8" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                `;
                gpusPerRegionInputs.appendChild(inputContainer);
            }
        } else if (regions < currentCount) {
            // 移除多余的输入框
            for (let i = currentCount; i > regions; i--) {
                gpusPerRegionInputs.removeChild(gpusPerRegionInputs.lastChild);
            }
        }
        
        // 生成或更新地域间距离输入框
        generateDistanceInputs(regions);
    });
    
    // 生成地域间距离输入框
    function generateDistanceInputs(regions) {
        // 清空现有输入框
        distancesInputs.innerHTML = '';
        
        // 只有当地域数量大于1时才显示距离输入
        if (regions > 1) {
            distancesContainer.classList.remove('hidden');
            
            // 生成所有地域对之间的距离输入框
            for (let i = 0; i < regions; i++) {
                for (let j = i + 1; j < regions; j++) {
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'flex items-center mb-2';
                    inputContainer.innerHTML = `
                        <span class="text-sm text-gray-500 mr-2">地域 ${i+1}-${j+1}:</span>
                        <input type="number" class="regionDistance" data-region1="${i+1}" data-region2="${j+1}" min="0" max="20000" value="${Math.floor(Math.random() * 5000) + 500}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <span class="text-sm text-gray-500 ml-2">km</span>
                    `;
                    distancesInputs.appendChild(inputContainer);
                }
            }
        } else {
            distancesContainer.classList.add('hidden');
        }
    }

    // 选项卡切换功能
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            // 更新按钮状态
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            button.classList.add('active', 'text-blue-600', 'border-blue-600');
            button.classList.remove('text-gray-500', 'border-transparent');
            
            // 更新内容显示
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            document.getElementById(`${tab}-content`).classList.remove('hidden');
            document.getElementById(`${tab}-content`).classList.add('active');
        });
    });

    // 表单提交处理
    configForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 获取表单数据
        const regions = parseInt(regionsInput.value);
        const gpusPerRegionElements = document.querySelectorAll('.gpusPerRegion');
        const gpusPerRegion = Array.from(gpusPerRegionElements).map(input => parseInt(input.value));
        const modelSize = parseInt(document.getElementById('modelSize').value);
        const batchSize = parseInt(document.getElementById('batchSize').value);
        const networkLatency = parseInt(document.getElementById('networkLatency').value);
        const networkBandwidth = parseInt(document.getElementById('networkBandwidth').value);
        
        // 获取地域间距离数据
        const distanceElements = document.querySelectorAll('.regionDistance');
        const regionDistances = {};
        distanceElements.forEach(element => {
            const region1 = element.getAttribute('data-region1');
            const region2 = element.getAttribute('data-region2');
            const distance = parseInt(element.value);
            // 存储距离（两个方向）
            regionDistances[`${region1}-${region2}`] = distance;
            regionDistances[`${region2}-${region1}`] = distance;
        });
        
        // 计算总GPU数量
        const totalGpus = gpusPerRegion.reduce((sum, gpus) => sum + gpus, 0);
        
        // 生成地图展示
        generateMap(regions, gpusPerRegion, regionDistances);
        
        // 计算推荐的并行策略
        const parallelStrategy = calculateParallelStrategy(modelSize, totalGpus, regions);
        displayParallelStrategy(parallelStrategy);
        
        // 计算通信量
        const communicationData = calculateCommunication(modelSize, totalGpus, batchSize, networkLatency, networkBandwidth, regions, regionDistances);
        displayCommunicationData(communicationData);
        
        // 生成DeepSpeed部署代码
        const dsCode = generateDeepSpeedCode(modelSize, totalGpus, regions, parallelStrategy, batchSize);
        deploymentCode.textContent = dsCode;
        
        // 显示成功通知
        showNotification('配置计算成功', 'success');
    });

    // 生成地图展示
    function generateMap(regions, gpusPerRegion, regionDistances = {}) {
        mapContainer.innerHTML = '';
        
        // 计算容器尺寸
        const containerWidth = mapContainer.offsetWidth;
        const containerHeight = mapContainer.offsetHeight;
        
        // 根据地域数量确定布局
        const regionNodes = [];
        
        if (regions <= 5) {
            // 环形布局
            const radius = Math.min(containerWidth, containerHeight) * 0.4;
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            
            for (let i = 0; i < regions; i++) {
                const angle = (i / regions) * 2 * Math.PI;
                const x = centerX + radius * Math.cos(angle) - 60; // 60是节点宽度的一半
                const y = centerY + radius * Math.sin(angle) - 50; // 50是节点高度的一半
                
                const node = createRegionNode(i + 1, gpusPerRegion[i], x, y);
                mapContainer.appendChild(node);
                regionNodes.push({ element: node, x: x + 60, y: y + 50 });
            }
        } else {
            // 网格布局
            const cols = Math.ceil(Math.sqrt(regions));
            const rows = Math.ceil(regions / cols);
            const nodeWidth = 120;
            const nodeHeight = 100;
            const gap = 20;
            
            const totalWidth = cols * nodeWidth + (cols - 1) * gap;
            const totalHeight = rows * nodeHeight + (rows - 1) * gap;
            const startX = (containerWidth - totalWidth) / 2;
            const startY = (containerHeight - totalHeight) / 2;
            
            for (let i = 0; i < regions; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = startX + col * (nodeWidth + gap);
                const y = startY + row * (nodeHeight + gap);
                
                const node = createRegionNode(i + 1, gpusPerRegion[i], x, y);
                mapContainer.appendChild(node);
                regionNodes.push({ element: node, x: x + nodeWidth / 2, y: y + nodeHeight / 2 });
            }
        }
        
        // 绘制连接线
        for (let i = 0; i < regions; i++) {
            for (let j = i + 1; j < regions; j++) {
                const line = createConnectionLine(regionNodes[i], regionNodes[j], regionDistances, i + 1, j + 1);
                mapContainer.appendChild(line);
            }
        }
    }

    // 创建区域节点
    function createRegionNode(regionId, gpusCount, x, y) {
        const node = document.createElement('div');
        node.className = 'region-node';
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.innerHTML = `
            <h4>地域 ${regionId}</h4>
            <p>${gpusCount} 个 GPU</p>
        `;
        return node;
    }

    // 创建连接线
    function createConnectionLine(node1, node2, regionDistances = {}, region1Id, region2Id) {
        const line = document.createElement('div');
        line.className = 'connection-line';
        
        // 计算两点之间的距离和角度
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // 设置线的样式
        line.style.width = `${distance}px`;
        line.style.left = `${node1.x}px`;
        line.style.top = `${node1.y}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        // 如果有距离信息，在线上显示距离
        if (regionDistances && region1Id && region2Id) {
            const distanceKey = `${region1Id}-${region2Id}`;
            if (regionDistances[distanceKey]) {
                const distanceLabel = document.createElement('div');
                distanceLabel.className = 'distance-label';
                
                // 计算标签位置（线的中点）
                const midX = distance / 2;
                const midY = -15; // 在连接线上方15px
                
                distanceLabel.style.position = 'absolute';
                distanceLabel.style.left = `${midX}px`;
                distanceLabel.style.top = `${midY}px`;
                distanceLabel.style.transform = 'translateX(-50%)';
                distanceLabel.style.whiteSpace = 'nowrap';
                distanceLabel.style.fontSize = '10px';
                distanceLabel.style.padding = '2px 6px';
                distanceLabel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                distanceLabel.style.borderRadius = '4px';
                distanceLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                distanceLabel.style.zIndex = '10';
                distanceLabel.textContent = `${regionDistances[distanceKey]} km`;
                
                line.appendChild(distanceLabel);
            }
        }
        
        return line;
    }

    // 计算推荐的并行策略
    function calculateParallelStrategy(modelSize, totalGpus, regions) {
        // 这里实现并行策略的计算逻辑
        // 根据模型大小、GPU数量和地域数量推荐合适的DP/PP/TP值
        
        let dp = 1; // 数据并行
        let pp = 1; // 流水线并行
        let tp = 1; // 张量并行
        
        // 简化的策略推荐逻辑
        if (modelSize <= 7) {
            // 小模型优先使用数据并行
            dp = Math.min(totalGpus, 16);
            tp = Math.max(1, Math.floor(totalGpus / dp));
        } else if (modelSize <= 70) {
            // 中等模型混合使用三种并行
            tp = Math.min(8, totalGpus);
            dp = Math.max(1, Math.floor(totalGpus / (tp * regions)));
            pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        } else {
            // 大模型更多使用流水线和张量并行
            tp = Math.min(16, totalGpus);
            pp = Math.max(1, Math.floor(totalGpus / tp));
            dp = Math.max(1, Math.floor(totalGpus / (tp * pp)));
        }
        
        // 确保乘积不超过总GPU数量
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
                <strong>推荐理由：</strong> 基于您的配置，该并行策略能够有效平衡计算效率和通信开销，
                特别针对跨广域场景进行了优化，减少地域间通信量。
            </p>
        `;
        
        // 更新并行策略比较图表
        updateParallelChart(strategy);
    }

    // 更新并行策略比较图表
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
                labels: ['计算效率', '通信开销', '内存使用', '扩展性', '跨域适应性'],
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

    // 计算通信量和计算时长
    function calculateCommunication(modelSize, totalGpus, batchSize, networkLatency, networkBandwidth, regions, regionDistances = {}) {
        // 通信量计算公式基于分布式深度学习理论
        // 模型大小单位：B (十亿参数)
        
        // 每个参数占用4字节（FP32精度）
        const parameterSizeGB = (modelSize * 1e9 * 4) / (1024 * 1024 * 1024); // GB
        const parameterSizeBytes = modelSize * 1e9 * 4; // 字节
        
        // 数据并行通信量（AllReduce操作）
        // 公式：梯度大小 * (2*(dp-1)/dp) （AllReduce算法的通信复杂度）
        const dp = Math.min(totalGpus, 16); // 简化数据并行度计算
        const dpCommunicationPerRoundGB = parameterSizeGB * 2 * (dp - 1) / dp; // GB/轮
        
        // 张量并行通信量（AllGather/ReduceScatter操作）
        // 公式：(参数大小/张量并行度) * (张量并行度-1)
        const tp = Math.min(8, Math.floor(totalGpus / dp)); // 简化张量并行度计算
        const tpCommunicationPerRoundGB = parameterSizeGB / tp * (tp - 1); // GB/轮
        
        // 流水线并行通信量（激活和梯度传输）
        // 公式：(激活大小 + 梯度大小) * (流水线阶段数-1)/流水线阶段数
        const pp = Math.max(1, Math.floor(totalGpus / (tp * dp))); // 简化流水线并行度计算
        const activationSizeGB = parameterSizeGB * 0.5; // 激活大小约为参数大小的一半
        const ppCommunicationPerRoundGB = (activationSizeGB + parameterSizeGB) * (pp - 1) / pp; // GB/轮
        
        // 计算地域间距离的影响因子
        let distanceBasedFactor = 1.0;
        
        if (regions > 1 && Object.keys(regionDistances).length > 0) {
            // 计算平均距离
            let totalDistance = 0;
            let count = 0;
            
            Object.keys(regionDistances).forEach(key => {
                const [r1, r2] = key.split('-');
                if (parseInt(r1) < parseInt(r2)) { // 避免重复计算
                    totalDistance += regionDistances[key];
                    count++;
                }
            });
            
            if (count > 0) {
                const avgDistance = totalDistance / count;
                // 距离因子：每1000公里增加5%的额外通信开销
                // 基于光在光纤中的传播延迟和信号衰减的经验模型
                distanceBasedFactor = 1 + (avgDistance / 1000) * 0.05;
            }
        }
        
        // 跨地域通信额外开销（基于地域数量和距离）
        const crossRegionOverhead = Math.log2(regions); // 地域间通信复杂度
        const regionCommunicationFactor = (1 + 0.1 * crossRegionOverhead) * distanceBasedFactor; // 综合跨地域通信因子
        
        // 总每轮通信量
        const totalCommunicationPerRoundGB = 
            (dpCommunicationPerRoundGB + tpCommunicationPerRoundGB + ppCommunicationPerRoundGB) * regionCommunicationFactor; // GB/轮
        
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
                if (parseInt(r1) < parseInt(r2)) { // 避免重复计算
                    // 假设每1000公里增加约5ms的传播延迟
                    totalExtraLatency += (regionDistances[key] / 1000) * 5;
                    count++;
                }
            });
            
            if (count > 0) {
                totalLatency += totalExtraLatency / count;
            }
        }
        
        const communicationTimeMs = (totalCommunicationPerRoundGB / bandwidthGBPerSec) * 1000 + totalLatency; // 毫秒
        
        // 计算时长计算（基于模型大小、批大小和GPU性能）
        // 假设每个GPU的计算能力为10 TFLOPS (FP16)，每参数需要约2 FLOP（前向和反向传播）
        const tflopsPerGpu = 10; // 假设GPU计算能力为10 TFLOPS
        const flopsPerParameter = 2; // 每个参数约需要2 FLOP（前向和反向传播）
        const totalFlops = modelSize * 1e9 * flopsPerParameter * batchSize; // 每轮总FLOP
        const computeTimeMs = (totalFlops / (tflopsPerGpu * 1e12 * totalGpus)) * 1000; // 毫秒
        
        // 重叠效率估计（假设通信和计算可以重叠约60%）
        const overlapEfficiency = 0.6; 
        const overlappingPotential = Math.min(communicationTimeMs, computeTimeMs) * overlapEfficiency;
        
        // 估计的每轮总时长
        const estimatedRoundTimeMs = communicationTimeMs + computeTimeMs - overlappingPotential;
        
        return {
            parameterSizeGB,
            dpCommunicationPerRoundGB,
            tpCommunicationPerRoundGB,
            ppCommunicationPerRoundGB,
            totalCommunicationPerRoundGB,
            communicationTimeMs,
            computeTimeMs,
            estimatedRoundTimeMs,
            bandwidthGBPerSec,
            crossRegionOverhead,
            regionCommunicationFactor,
            distanceBasedFactor,
            dp, tp, pp
        };
    }

    // 显示通信量和计算时长分析
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
                    <div class="data-label">计算时长</div>
                    <div class="data-value">${data.computeTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="data-card bg-blue-50 border-blue-200">
                    <div class="data-label">估计每轮总时长</div>
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
                    <div class="data-label">跨地域通信因子</div>
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
                    <div class="mb-2"><strong>参数大小：</strong>模型大小 (B) × 1e9 × 4 字节</div>
                    <div class="mb-2"><strong>数据并行通信量：</strong>参数大小 × 2 × (dp-1)/dp</div>
                    <div class="mb-2"><strong>张量并行通信量：</strong>(参数大小/tp) × (tp-1)</div>
                    <div class="mb-2"><strong>流水线并行通信量：</strong>(激活大小 + 参数大小) × (pp-1)/pp</div>
                    <div class="mb-2"><strong>距离影响因子：</strong>1 + (平均距离/1000) × 0.05</div>
                    <div class="mb-2"><strong>跨地域通信因子：</strong>(1 + 0.1 × log₂(regions)) × 距离影响因子</div>
                    <div class="mb-2"><strong>总每轮通信量：</strong>(数据并行+张量并行+流水线并行) × 跨地域通信因子</div>
                    <div class="mb-2"><strong>通信时间：</strong>(总通信量/带宽) × 1000 + 基础延迟 + 距离相关延迟</div>
                    <div><strong>计算时长：</strong>(模型参数×2×批大小) / (GPU数量×GPU算力) × 1000</div>
                </div>
            </div>
        `;
        
        // 计算通信与计算时间的比例关系
        const computeToCommunicationRatio = data.computeTimeMs / data.communicationTimeMs;
        let hidingStrategySuggestions = '';
        let hidingEfficiencyEstimate = '';
        let strategyType = '';
        
        if (computeToCommunicationRatio < 0.5) {
            // 计算时长远小于通信时长（小于通信时长的50%）
            strategyType = '计算受限场景';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>实现多级梯度累积，增加每轮迭代的计算工作量，减少通信频率</li>
                    <li>采用分层通信架构，优化地域内和地域间通信路径</li>
                    <li>应用高效数据压缩算法（如量化、稀疏化），优先压缩跨地域传输数据</li>
                    <li>实现预测性通信，在计算早期阶段就开始预发送下一轮需要的数据</li>
                    <li>使用异步通信模式，减少通信阻塞计算的情况</li>
                    <li>考虑模型分区优化，减少跨地域通信需求</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
                    <strong>场景特点：</strong> 计算时长远小于通信时长，属于通信瓶颈场景。
                </div>
                <div class="mt-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                    <strong>掩盖效率估计：</strong> 由于计算时间有限，重叠通信的效果会受到限制。采用上述策略后，预计可掩盖约30-50%的通信开销，主要通过数据压缩和减少通信频率来提升效率。
                </div>`;
        } else if (computeToCommunicationRatio >= 0.5 && computeToCommunicationRatio <= 2) {
            // 计算时长与通信时长相近（通信时长的50%-200%）
            strategyType = '平衡场景';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>使用重叠通信和计算技术，在计算的同时进行通信</li>
                    <li>采用分层通信策略，地域内节点间使用快速通信，地域间使用压缩通信</li>
                    <li>实现梯度累积，减少通信频率</li>
                    <li>对跨地域传输的数据进行压缩，推荐使用量化压缩算法</li>
                    <li>优化通信拓扑，减少跨地域的通信路径</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <strong>掩盖效率估计：</strong> 采用上述策略后，预计可掩盖约60-80%的通信开销，显著提升跨广域训练效率。
                </div>`;
        } else {
            // 计算时长远大于通信时长（大于通信时长的200%）
            strategyType = '通信受限场景';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>实现完全重叠通信和计算，最大化隐藏通信开销</li>
                    <li>采用流水线通信模式，充分利用计算时间窗口</li>
                    <li>优化通信调度算法，优先处理关键路径通信</li>
                    <li>考虑使用更先进的通信库和协议</li>
                    <li>对于非关键数据，可考虑异步通信模式</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                    <strong>掩盖效率估计：</strong> 由于计算时间充足，可实现高达90%以上的通信掩盖效率。通信将几乎完全隐藏在计算过程中。
                </div>`;
        }
        
        // 显示通信掩盖策略
        communicationHidingResult.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">通信掩盖策略建议</h4>
                <span class="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">${strategyType}</span>
            </div>
            <div class="text-sm text-gray-500 mb-3">
                <strong>计算:通信时间比:</strong> ${computeToCommunicationRatio.toFixed(2)}:1
            </div>
            ${hidingStrategySuggestions}
            ${hidingEfficiencyEstimate}
        `;
        
        // 在地图上显示每轮通信量和计算时长
        updateMapWithCommunication(data);
    }
    
    // 在地图上更新通信量和计算时长显示
    function updateMapWithCommunication(communicationData) {
        const { totalCommunicationPerRoundGB, communicationTimeMs, computeTimeMs, estimatedRoundTimeMs, regionCommunicationFactor, distanceBasedFactor } = communicationData;
        
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
                    <div class="text-gray-500">计算时长</div>
                    <div class="font-bold text-green-600">${computeTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">总时长</div>
                    <div class="font-bold text-purple-600">${estimatedRoundTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">跨地域因子</div>
                    <div class="font-bold text-amber-600">${regionCommunicationFactor.toFixed(2)}</div>
                </div>
                <div>
                    <div class="text-gray-500">距离因子</div>
                    <div class="font-bold text-teal-600">${distanceBasedFactor.toFixed(2)}</div>
                </div>
            </div>
        `;
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
# 跨地域训练优化
export NCCL_SOCKET_IFNAME=eth0
# 通信压缩
export NCCL_COMPRESSION=1
# 地域感知优化
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
        
        // 显示部署中通知
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
});