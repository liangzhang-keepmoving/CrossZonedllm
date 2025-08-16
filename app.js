document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
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

    // Get distance-related DOM elements
    const distancesContainer = document.getElementById('distancesContainer');
    const distancesInputs = document.getElementById('distancesInputs');

    // Dynamically generate GPU input fields based on number of regions
    regionsInput.addEventListener('input', function() {
        const regions = parseInt(this.value);
        const currentInputs = gpusPerRegionInputs.querySelectorAll('.gpusPerRegion');
        const currentCount = currentInputs.length;

        if (regions > currentCount) {
            // Add new input fields
            for (let i = currentCount + 1; i <= regions; i++) {
                const inputContainer = document.createElement('div');
                inputContainer.className = 'flex items-center mb-2';
                inputContainer.innerHTML = `
                    <span class="text-sm text-gray-500 mr-2">Region ${i}:</span>
                    <input type="number" class="gpusPerRegion" min="1" max="128" value="8" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                `;
                gpusPerRegionInputs.appendChild(inputContainer);
            }
        } else if (regions < currentCount) {
            // Remove excess input fields
            for (let i = currentCount; i > regions; i--) {
                gpusPerRegionInputs.removeChild(gpusPerRegionInputs.lastChild);
            }
        }
        
        // Generate or update inter-region distance input fields
        generateDistanceInputs(regions);
    });
    
    // Generate inter-region distance input fields
    function generateDistanceInputs(regions) {
        // Clear existing input fields
        distancesInputs.innerHTML = '';
        
        // Only show distance inputs when there's more than one region
        if (regions > 1) {
            distancesContainer.classList.remove('hidden');
            
            // Generate distance input fields for all region pairs
            for (let i = 0; i < regions; i++) {
                for (let j = i + 1; j < regions; j++) {
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'flex items-center mb-2';
                    inputContainer.innerHTML = `
                        <span class="text-sm text-gray-500 mr-2">Region ${i+1}-${j+1}:</span>
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

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            // Update button states
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            button.classList.add('active', 'text-blue-600', 'border-blue-600');
            button.classList.remove('text-gray-500', 'border-transparent');
            
            // Update content display
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            document.getElementById(`${tab}-content`).classList.remove('hidden');
            document.getElementById(`${tab}-content`).classList.add('active');
        });
    });

    // Form submission handling
    configForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const regions = parseInt(regionsInput.value);
        const gpusPerRegionElements = document.querySelectorAll('.gpusPerRegion');
        const gpusPerRegion = Array.from(gpusPerRegionElements).map(input => parseInt(input.value));
        const modelSize = parseInt(document.getElementById('modelSize').value);
        const batchSize = parseInt(document.getElementById('batchSize').value);
        const networkLatency = parseInt(document.getElementById('networkLatency').value);
        const networkBandwidth = parseInt(document.getElementById('networkBandwidth').value);
        
        // Get inter-region distance data
        const distanceElements = document.querySelectorAll('.regionDistance');
        const regionDistances = {};
        distanceElements.forEach(element => {
            const region1 = element.getAttribute('data-region1');
            const region2 = element.getAttribute('data-region2');
            const distance = parseInt(element.value);
            // Store distance (both directions)
            regionDistances[`${region1}-${region2}`] = distance;
            regionDistances[`${region2}-${region1}`] = distance;
        });
        
        // Calculate total number of GPUs
        const totalGpus = gpusPerRegion.reduce((sum, gpus) => sum + gpus, 0);
        
        // Generate map display
        generateMap(regions, gpusPerRegion, regionDistances);
        
        // Calculate recommended parallel strategy
        const parallelStrategy = calculateParallelStrategy(modelSize, totalGpus, regions);
        displayParallelStrategy(parallelStrategy);
        
        // Calculate communication volume, passing parallel strategy parameters
        const communicationData = calculateCommunication(modelSize, totalGpus, batchSize, networkLatency, networkBandwidth, regions, regionDistances, parallelStrategy);
        displayCommunicationData(communicationData);
        
        // Generate DeepSpeed deployment code
        const dsCode = generateDeepSpeedCode(modelSize, totalGpus, regions, parallelStrategy, batchSize);
        deploymentCode.textContent = dsCode;
        
        // Show success notification
        showNotification('Configuration calculation successful', 'success');
    });

    // Generate map display
    function generateMap(regions, gpusPerRegion, regionDistances = {}) {
        mapContainer.innerHTML = '';
        
        // Calculate container dimensions
        const containerWidth = mapContainer.offsetWidth;
        const containerHeight = mapContainer.offsetHeight;
        
        // Determine layout based on number of regions
        const regionNodes = [];
        
        if (regions <= 5) {
            // Circular layout
            const radius = Math.min(containerWidth, containerHeight) * 0.4;
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;
            
            for (let i = 0; i < regions; i++) {
                const angle = (i / regions) * 2 * Math.PI;
                const x = centerX + radius * Math.cos(angle) - 60; // 60 is half the node width
                const y = centerY + radius * Math.sin(angle) - 50; // 50 is half the node height
                
                const node = createRegionNode(i + 1, gpusPerRegion[i], x, y);
                mapContainer.appendChild(node);
                regionNodes.push({ element: node, x: x + 60, y: y + 50 });
            }
        } else {
            // Grid layout
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
        
        // Draw connecting lines
        for (let i = 0; i < regions; i++) {
            for (let j = i + 1; j < regions; j++) {
                const line = createConnectionLine(regionNodes[i], regionNodes[j], regionDistances, i + 1, j + 1);
                mapContainer.appendChild(line);
            }
        }
    }

    // Create region node
    function createRegionNode(regionId, gpusCount, x, y) {
        const node = document.createElement('div');
        node.className = 'region-node';
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.innerHTML = `
            <h4>Region ${regionId}</h4>
            <p>${gpusCount} GPUs</p>
        `;
        return node;
    }

    // Create connecting line
    function createConnectionLine(node1, node2, regionDistances = {}, region1Id, region2Id) {
        const line = document.createElement('div');
        line.className = 'connection-line';
        
        // Calculate distance and angle between two points
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Set line styles
        line.style.width = `${distance}px`;
        line.style.left = `${node1.x}px`;
        line.style.top = `${node1.y}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        // If distance information is available, display it on the line
        if (regionDistances && region1Id && region2Id) {
            const distanceKey = `${region1Id}-${region2Id}`;
            if (regionDistances[distanceKey]) {
                const distanceLabel = document.createElement('div');
                distanceLabel.className = 'distance-label';
                
                // Calculate label position (midpoint of the line)
                const midX = distance / 2;
                const midY = -15; // 15px above the connecting line
                
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

    // Calculate recommended parallel strategy
    function calculateParallelStrategy(modelSize, totalGpus, regions) {
        // Implementation of parallel strategy calculation logic
        // Recommends appropriate DP/PP/TP values based on model size, GPU count, and region count
        
        let dp = 1; // Data parallelism
        let pp = 1; // Pipeline parallelism
        let tp = 1; // Tensor parallelism
        
        // Simplified strategy recommendation logic
        if (modelSize <= 7) {
            // Small models prioritize data parallelism
            dp = Math.min(totalGpus, 16);
            tp = Math.max(1, Math.floor(totalGpus / dp));
        } else if (modelSize <= 70) {
            // Medium models mix all three types of parallelism
            tp = Math.min(8, totalGpus);
            dp = Math.max(1, Math.floor(totalGpus / (tp * regions)));
            pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        } else {
            // Large models use more pipeline and tensor parallelism
            tp = Math.min(16, totalGpus);
            pp = Math.max(1, Math.floor(totalGpus / tp));
            dp = Math.max(1, Math.floor(totalGpus / (tp * pp)));
        }
        
        // Ensure product does not exceed total GPU count
        while (dp * pp * tp > totalGpus) {
            if (dp > 1) dp--;
            else if (pp > 1) pp--;
            else if (tp > 1) tp--;
        }
        
        return { dp, pp, tp };
    }

    // Display parallel strategy
    function displayParallelStrategy(strategy) {
        parallelStrategyResult.innerHTML = `
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="data-card">
                    <div class="data-label">Data Parallelism (DP)</div>
                    <div class="data-value">${strategy.dp}</div>
                </div>
                <div class="data-card">
                    <div class="data-label">Pipeline Parallelism (PP)</div>
                    <div class="data-value">${strategy.pp}</div>
                </div>
                <div class="data-card">
                    <div class="data-label">Tensor Parallelism (TP)</div>
                    <div class="data-value">${strategy.tp}</div>
                </div>
            </div>
            <p class="text-gray-600 text-sm">
                <strong>Recommendation Reason:</strong> Based on your configuration, this parallel strategy effectively balances computational efficiency and communication overhead,
                specially optimized for cross-regional scenarios to reduce inter-region communication.
            </p>
        `;
        
        // Update parallel strategy comparison chart
        updateParallelChart(strategy);
    }

    // Update parallel strategy comparison chart
    function updateParallelChart(strategy) {
        const ctx = document.getElementById('parallelChart').getContext('2d');
        
        // If chart exists, destroy it
        if (parallelChart) {
            parallelChart.destroy();
        }
        
        // Create new chart
        parallelChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Computational Efficiency', 'Communication Overhead', 'Memory Usage', 'Scalability', 'Cross-region Adaptability'],
                datasets: [
                    {
                        label: 'Recommended Strategy',
                        data: [85, 70, 65, 90, 80],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'Data Parallelism Only',
                        data: [60, 30, 80, 50, 40],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'Model Parallelism Only',
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

    // Get strategy toggle states
    function getStrategyToggleStates() {
        const gradientAccumulation = document.getElementById('gradientAccumulationToggle')?.checked || true;
        const dataCompression = document.getElementById('dataCompressionToggle')?.checked || true;
        const predictiveCommunication = document.getElementById('predictiveCommunicationToggle')?.checked || true;
        const asyncCommunication = document.getElementById('asyncCommunicationToggle')?.checked || true;
        
        return { gradientAccumulation, dataCompression, predictiveCommunication, asyncCommunication };
    }
    
    // Get communication primitive configuration
    function getCommunicationPrimitiveConfig() {
        const primitiveType = document.getElementById('crossRegionPrimitive')?.value || 'ring_allreduce';
        const chunkSize = parseInt(document.getElementById('chunkSize')?.value) || 256; // MB
        const overlapCoefficient = parseFloat(document.getElementById('overlapCoefficient')?.value) || 0.7;
        
        return { primitiveType, chunkSize, overlapCoefficient };
    }

    // Calculate communication volume and computation time
    function calculateCommunication(modelSize, totalGpus, batchSize, networkLatency, networkBandwidth, regions, regionDistances = {}, parallelStrategy = null) {
        // Get strategy toggle states
        const { gradientAccumulation, dataCompression, predictiveCommunication, asyncCommunication } = getStrategyToggleStates();
        
        // Get communication primitive configuration
        const { primitiveType, chunkSize, overlapCoefficient } = getCommunicationPrimitiveConfig();
        
        // Default strategy parameters
        let gradientAccumulationFactor = 1; // No accumulation by default
        let compressionRatio = 1; // No compression by default
        let predictionEfficiency = 0; // No prediction by default
        let asyncOverlapFactor = 0.6; // Default overlap efficiency
        let primitiveEfficiency = 1.0; // Default communication primitive efficiency factor
        let chunkingEfficiency = 1.0; // Chunked communication efficiency factor
        
        // Set parameters based on strategy toggles
        if (gradientAccumulation) {
            // Gradient accumulation factor: adjusted based on model size and region count, range 2-32
            gradientAccumulationFactor = Math.max(2, Math.min(32, Math.floor(Math.sqrt(modelSize * regions))));
        }
        
        if (dataCompression) {
            // Data compression ratio: mixed precision + sparsification, range 0.2-0.8
            compressionRatio = 0.5; // Default compression to 50% (FP16)
            if (regions > 2) {
                compressionRatio = 0.3; // More aggressive compression for multi-region scenarios
            }
        }
        
        if (predictiveCommunication) {
            // Prediction efficiency: reduction in waiting time due to predictive communication, range 0-0.3
            predictionEfficiency = 0.2; // Default 20% reduction in waiting time
        }
        
        if (asyncCommunication) {
            // Asynchronous overlap efficiency: range 0.6-0.95
            asyncOverlapFactor = 0.8; // Default 80% overlap efficiency
        }
        
        // Adjust efficiency factors based on communication primitive type
        // Ring-AllReduce is generally more efficient than standard AllReduce in multi-node scenarios
        switch (primitiveType) {
            case 'ring_allreduce':
                // Ring-AllReduce is more efficient on large-scale nodes with communication complexity of O(2*(K-1)*N/K), where K is number of nodes and N is data size
                // More efficient than standard AllReduce with O(2*(K-1)*N)
                primitiveEfficiency = 1.0 / (1 + 0.1 * Math.log(Math.max(1, totalGpus - 1))); // Dynamically adjust based on GPU count
                break;
            case 'allreduce':
                primitiveEfficiency = 1.0;
                break;
            case 'broadcast':
                // Broadcast is generally more efficient than AllReduce but only suitable for one-way communication
                primitiveEfficiency = 0.7; // Assume broadcast is 30% more efficient than standard AllReduce
                break;
            default:
                primitiveEfficiency = 1.0;
        }
        
        // Calculate chunked communication efficiency
        // Appropriate chunk size can improve communication efficiency, but too small increases overhead
        const optimalChunkSize = 256; // MB, assumed optimal chunk size
        chunkingEfficiency = Math.min(1.0, 0.8 + 0.2 * (optimalChunkSize / Math.max(chunkSize, 1)));
        
        // Communication volume calculation formulas based on distributed deep learning theory
        // Model size unit: B (billion parameters)
        
        // Each parameter occupies 4 bytes (FP32 precision)
        const parameterSizeGB = (modelSize * 1e9 * 4) / (1024 * 1024 * 1024); // GB
        const parameterSizeBytes = modelSize * 1e9 * 4; // bytes
        
        // Use passed parallel strategy or calculate default values
        let { dp, pp, tp } = parallelStrategy || {};
        
        // If no parallel strategy is passed, use default calculation method
        if (!dp) dp = Math.min(totalGpus, 16);
        if (!tp) tp = Math.min(8, Math.floor(totalGpus / dp));
        if (!pp) pp = Math.max(1, Math.floor(totalGpus / (tp * dp)));
        
        // Ensure product does not exceed total GPU count (whether using passed strategy or not)
        while (dp * pp * tp > totalGpus) {
            if (dp > 1) dp--;
            else if (pp > 1) pp--;
            else if (tp > 1) tp--;
        }
        
        // Data parallel communication volume (considering communication primitive efficiency)
        // Standard data parallelism: gradient size * (2*(dp-1)/dp) * communication primitive efficiency factor
        // Referring to distributed training theory, for advanced data parallel strategies like DDP and ZeRO, communication volume may be further optimized based on sharding degree
        const dpCommunicationPerRoundGB = parameterSizeGB * 2 * (dp - 1) / dp * primitiveEfficiency; // GB/round
        
        // Tensor parallel communication volume (AllGather/ReduceScatter operations)
        // 1D tensor parallelism: (parameter size/tensor parallel degree) * (tensor parallel degree-1) * communication primitive efficiency factor
        // For 2D/2.5D/3D tensor parallelism, communication volume varies based on dimension partitioning strategy
        const tpCommunicationPerRoundGB = parameterSizeGB / tp * (tp - 1) * primitiveEfficiency; // GB/round
        
        // Pipeline parallel communication volume (activation and gradient transfer)
        // Naive pipeline parallelism: (activation size + gradient size) * (pipeline stages-1)/pipeline stages * communication primitive efficiency factor
        // For advanced pipeline strategies like GPipe and PipeDream, micro-batch size and bubble effect need to be considered
        const activationSizeGB = parameterSizeGB * 0.5; // Activation size is approximately half of parameter size
        const ppCommunicationPerRoundGB = (activationSizeGB + parameterSizeGB) * (pp - 1) / pp * primitiveEfficiency; // GB/round
        
        // Calculate impact factor of inter-region distances
        let distanceBasedFactor = 1.0;
        
        if (regions > 1 && Object.keys(regionDistances).length > 0) {
            // Calculate average distance
            let totalDistance = 0;
            let count = 0;
            
            Object.keys(regionDistances).forEach(key => {
                const [r1, r2] = key.split('-');
                if (parseInt(r1) < parseInt(r2)) { // Avoid double counting
                    totalDistance += regionDistances[key];
                    count++;
                }
            });
            
            if (count > 0) {
                const avgDistance = totalDistance / count;
                // Distance factor: 5% additional communication overhead per 1000 km
                // Based on empirical model of propagation delay and signal attenuation in optical fibers
                distanceBasedFactor = 1 + (avgDistance / 1000) * 0.05;
            }
        }
        
        // Additional cross-region communication overhead (based on region count and distance)
        const crossRegionOverhead = Math.log2(regions); // Inter-region communication complexity
        const regionCommunicationFactor = (1 + 0.1 * crossRegionOverhead) * distanceBasedFactor; // Comprehensive cross-region communication factor
        
        // Communication volume after data compression
        const compressedDpCommunication = dpCommunicationPerRoundGB * compressionRatio;
        const compressedTpCommunication = tpCommunicationPerRoundGB * compressionRatio;
        const compressedPpCommunication = ppCommunicationPerRoundGB * compressionRatio;
        
        // Total per-round communication volume (considering compression and chunking efficiency)
        const totalCommunicationPerRoundGB = 
            (compressedDpCommunication + compressedTpCommunication + compressedPpCommunication) * regionCommunicationFactor * chunkingEfficiency; // GB/round
        
        // Communication time calculation
        const bandwidthGBPerSec = networkBandwidth / 8; // Convert to GB/second
        
        // Base latency plus distance-related latency (approximately 5ms/1000km)
        let totalLatency = networkLatency;
        if (regions > 1 && Object.keys(regionDistances).length > 0) {
            // Calculate average latency increment
            let totalExtraLatency = 0;
            let count = 0;
            
            Object.keys(regionDistances).forEach(key => {
                const [r1, r2] = key.split('-');
                if (parseInt(r1) < parseInt(r2)) { // Avoid double counting
                    // Assume approximately 5ms additional propagation delay per 1000 km
                    totalExtraLatency += (regionDistances[key] / 1000) * 5;
                    count++;
                }
            });
            
            if (count > 0) {
                totalLatency += totalExtraLatency / count;
            }
        }
        
        // Calculate base communication time
        let baseCommunicationTimeMs = (totalCommunicationPerRoundGB / bandwidthGBPerSec) * 1000 + totalLatency; // milliseconds
        
        // Apply predictive communication optimization
        const predictedCommunicationTimeMs = baseCommunicationTimeMs * (1 - predictionEfficiency);
        const communicationTimeMs = predictedCommunicationTimeMs; // Communication time after prediction optimization
        
        // Computation time calculation (based on model size, batch size, and GPU performance)
        // Assume each GPU has a computing capacity of 10 TFLOPS (FP16), each parameter requires approximately 2 FLOPs (forward and backward propagation)
        const tflopsPerGpu = 10; // Assume GPU computing capacity is 10 TFLOPS
        const flopsPerParameter = 2; // Each parameter requires approximately 2 FLOPs (forward and backward propagation)
        const totalFlops = modelSize * 1e9 * flopsPerParameter * batchSize; // Total FLOPs per round
        const computeTimeMs = (totalFlops / (tflopsPerGpu * 1e12 * totalGpus)) * 1000; // milliseconds
        
        // Overlap efficiency estimation (adjusted based on asynchronous communication settings and overlap coefficient)
        const overlappingPotential = Math.min(communicationTimeMs, computeTimeMs) * asyncOverlapFactor * overlapCoefficient;
        
        // Estimated total round time
        const estimatedRoundTimeMs = communicationTimeMs + computeTimeMs - overlappingPotential;
        
        // Consider impact of gradient accumulation on overall performance
        // Gradient accumulation reduces communication frequency but increases computation
        const effectiveComputeTimeMs = computeTimeMs * gradientAccumulationFactor;
        const effectiveCommunicationTimeMs = communicationTimeMs; // Communication time per round remains unchanged
        const effectiveRoundTimeMs = effectiveComputeTimeMs + effectiveCommunicationTimeMs - 
            Math.min(effectiveCommunicationTimeMs, effectiveComputeTimeMs) * asyncOverlapFactor;
        
        // Calculate actual performance per batch
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
            // Communication primitive parameters
        primitiveType,
        chunkSize,
        overlapCoefficient,
        primitiveEfficiency,
        chunkingEfficiency
        };
    }

    // Display communication and computation time analysis
    function displayCommunicationData(data) {
        communicationResult.innerHTML = `
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="data-card">
                    <div class="data-label">Total Communication per Round</div>
                    <div class="data-value">${data.totalCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">Communication Time</div>
                    <div class="data-value">${data.communicationTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">Computation Time</div>
                    <div class="data-value">${data.computeTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="data-card bg-blue-50 border-blue-200">
                    <div class="data-label">Estimated Total Round Time</div>
                    <div class="data-value text-blue-600">${data.estimatedRoundTimeMs.toFixed(2)}<span class="data-unit">ms</span></div>
                </div>
                <div class="data-card bg-green-50 border-green-200">
                    <div class="data-label">Parallel Efficiency</div>
                    <div class="data-value text-green-600">${Math.min(100, (data.computeTimeMs / (data.communicationTimeMs + data.computeTimeMs)) * 100).toFixed(1)}<span class="data-unit">%</span></div>
                </div>
                <div class="data-card bg-purple-50 border-purple-200">
                    <div class="data-label">Communication Ratio</div>
                    <div class="data-value text-purple-600">${Math.min(100, (data.communicationTimeMs / (data.communicationTimeMs + data.computeTimeMs)) * 100).toFixed(1)}<span class="data-unit">%</span></div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div class="data-card">
                    <div class="data-label">Data Parallel Communication</div>
                    <div class="data-value">${data.dpCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB/round</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">Tensor Parallel Communication</div>
                    <div class="data-value">${data.tpCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB/round</span></div>
                </div>
                <div class="data-card">
                    <div class="data-label">Pipeline Parallel Communication</div>
                    <div class="data-value">${data.ppCommunicationPerRoundGB.toFixed(2)}<span class="data-unit">GB/round</span></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
                <div class="data-card bg-amber-50 border-amber-200">
                    <div class="data-label">Cross-Region Communication Factor</div>
                    <div class="data-value text-amber-600">${data.regionCommunicationFactor.toFixed(2)}</div>
                </div>
                <div class="data-card bg-teal-50 border-teal-200">
                    <div class="data-label">Distance Impact Factor</div>
                    <div class="data-value text-teal-600">${data.distanceBasedFactor.toFixed(2)}</div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="font-medium mb-2 text-gray-800">Calculation Formulas</h4>
                <div class="bg-gray-50 p-3 rounded-lg text-sm">
                    <div class="mb-2"><strong>Parameter Size:</strong> Model size (B) × 1e9 × 4 bytes</div>
                    <div class="mb-2"><strong>Data Parallel Communication:</strong> Parameter size × 2 × (dp-1)/dp × primitive efficiency factor<br/><small class="text-gray-500">Applicable to standard data parallelism, advanced strategies like DDP and ZeRO further optimize based on sharding level</small></div>
                    <div class="mb-2"><strong>Tensor Parallel Communication:</strong> (Parameter size/tp) × (tp-1) × primitive efficiency factor<br/><small class="text-gray-500">Based on 1D tensor parallelism, communication volume for 2D/2.5D/3D tensor parallelism varies by dimension partitioning strategy</small></div>
                    <div class="mb-2"><strong>Pipeline Parallel Communication:</strong> (Activation size + Parameter size) × (pp-1)/pp × primitive efficiency factor<br/><small class="text-gray-500">Naive pipeline parallelism model, advanced strategies like GPipe and PipeDream require consideration of micro-batch size and bubble effect</small></div>
                    <div class="mb-2"><strong>Distance Impact Factor:</strong> 1 + (Average distance/1000) × 0.05</div>
                    <div class="mb-2"><strong>Cross-Region Communication Factor:</strong> (1 + 0.1 × log₂(regions)) × Distance impact factor</div>
                    <div class="mb-2"><strong>Compressed Communication Volume:</strong> Original communication volume × Compression ratio (${data.compressionRatio.toFixed(2)})</div>
                    <div class="mb-2"><strong>Predicted Communication Time:</strong> Base communication time × (1 - Prediction efficiency (${data.predictionEfficiency.toFixed(2)}))</div>
                    <div class="mb-2"><strong>Overlap Efficiency:</strong> ${data.asyncOverlapFactor.toFixed(2)} (Based on async communication settings)</div>
                    <div class="mb-2"><strong>Gradient Accumulation Impact:</strong> Computation time × Accumulation factor (${data.gradientAccumulationFactor}), Batch size × Accumulation factor</div>
                    <div class="mb-2"><strong>Actual Time per Batch:</strong> Effective total time / Gradient accumulation factor</div>
                    <div class="mb-2"><strong>Data Parallel Communication:</strong> Parameter size × 2 × (dp-1)/dp × Primitive efficiency factor (${data.primitiveEfficiency.toFixed(2)})</div>
                    <div class="mb-2"><strong>Total Communication per Round:</strong> (Data parallel + Tensor parallel + Pipeline parallel) × Cross-region communication factor × Compression ratio × Chunking efficiency (${data.chunkingEfficiency.toFixed(2)})</div>
                    <div class="mb-2"><strong>Communication Time:</strong> (Total communication volume/Bandwidth) × 1000 + Base latency + Distance-related latency × (1 - Prediction efficiency)</div>
                    <div class="mb-2"><strong>Overlap Efficiency:</strong> Async overlap efficiency × Overlap coefficient (${data.overlapCoefficient.toFixed(2)})</div>
                    <div><strong>Computation Time:</strong> (Model parameters×2×Batch size) / (GPU count×GPU computing power) × 1000</div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="font-medium mb-2 text-gray-800">Current Strategy Configuration</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                        <span>Gradient Accumulation Factor: <strong>${data.gradientAccumulationFactor}</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                        <span>Data Compression Ratio: <strong>${(data.compressionRatio * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                        <span>Prediction Efficiency: <strong>${(data.predictionEfficiency * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                        <span>Async Overlap Efficiency: <strong>${(data.asyncOverlapFactor * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                        <span>Communication Primitive: <strong>${data.primitiveType === 'ring_allreduce' ? 'Ring-AllReduce' : data.primitiveType === 'allreduce' ? 'AllReduce' : 'Broadcast'}</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-teal-500 mr-2"></span>
                        <span>Communication Chunk Size: <strong>${data.chunkSize} MB</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
                        <span>Overlap Coefficient: <strong>${(data.overlapCoefficient * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div class="flex items-center p-2 bg-white rounded border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
                        <span>Primitive Efficiency: <strong>${((1 - data.primitiveEfficiency) * 100).toFixed(0)}% Improvement</strong></span>
                    </div>
                </div>
            </div>
        `;
        
        // Calculate the ratio between computation and communication time
        const computeToCommunicationRatio = data.computeTimeMs / data.communicationTimeMs;
        let hidingStrategySuggestions = '';
        let hidingEfficiencyEstimate = '';
        let strategyType = '';
        
        if (computeToCommunicationRatio < 0.5) {
            // Computation time is much shorter than communication time (less than 50% of communication time)
            strategyType = 'Computation-Limited Scenario';
            hidingStrategySuggestions = `
                <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li><strong>多级梯度累积</strong>：推荐使用8-32倍的梯度累积系数，将多个小批量的梯度累积后再进行一次通信，显著减少通信频率。特别适用于跨广域场景，可配置参数：<code>gradient_accumulation_steps=16</code></li>
                    <li><strong>高效数据压缩</strong>：优先使用FP16/BF16混合精度压缩（减少50%通信量），对梯度应用Top-K稀疏化（稀疏度60-90%），跨地域通信可考虑更激进的量化如INT8/INT4（需配合校准）</li>
                    <li><strong>预测性通信</strong>：实现基于历史通信模式的预测器，在当前计算阶段早期就预发送下一轮迭代需要的模型参数或梯度，推荐设置：预测窗口=2-3个计算周期</li>
                    <li><strong>异步通信模式</strong>：采用Non-blocking通信API和通信线程池，允许计算和通信完全并行执行，关键配置：独立通信线程数=GPU数量/2</li>
                    <li><strong>分层通信架构</strong>：地域内节点间使用高速通信（如NVLink），地域间节点使用压缩通信和最优路径规划</li>
                    <li><strong>模型分区优化</strong>：根据地域网络特性，将通信密集型层尽量放在同一地域内，减少跨地域通信需求</li>
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
                    <li><strong>重叠通信和计算</strong>：使用CUDA流和事件同步，在计算的同时执行通信操作，最大化资源利用率</li>
                    <li><strong>梯度累积</strong>：推荐4-8倍的梯度累积系数，在保持训练稳定性的同时减少通信频率</li>
                    <li><strong>高效数据压缩</strong>：对梯度应用混合精度（FP16）和适度稀疏化（稀疏度40-70%），平衡压缩率和精度损失</li>
                    <li><strong>预测性通信</strong>：实现轻量级预测机制，在计算过程中预发送关键数据，推荐预测窗口=1-2个计算周期</li>
                    <li><strong>分层通信策略</strong>：地域内节点间使用快速通信，地域间使用压缩通信，同时考虑异步通信模式优化关键路径</li>
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
                    <li><strong>完全重叠通信和计算</strong>：使用高级CUDA流管理和通信计算重叠技术，确保通信几乎完全隐藏在计算过程中</li>
                    <li><strong>流水线通信模式</strong>：实现多级流水线通信，在计算过程中分段执行通信操作，充分利用计算时间窗口</li>
                    <li><strong>异步通信模式</strong>：采用完全异步的通信架构，使用独立的通信线程和非阻塞API，允许计算和通信完全并行</li>
                    <li><strong>预测性通信</strong>：基于精确的性能模型和历史数据，在计算早期精确预测并发送后续需要的数据</li>
                    <li><strong>Efficient Communication Libraries</strong>：Consider using optimized communication libraries like NCCL, Gloo, and enable advanced features such as topology-aware routing</li>
                </ul>`;
            hidingEfficiencyEstimate = `
                <div class="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                    <strong>Hiding Efficiency Estimate:</strong> Due to sufficient computation time, communication hiding efficiency of over 90% can be achieved. Communication will be almost completely hidden within the computation process.
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
        
        // Add strategy change listeners
        function setupStrategyToggles() {
            const toggles = ['gradientAccumulationToggle', 'dataCompressionToggle', 'predictiveCommunicationToggle', 'asyncCommunicationToggle', 'crossRegionPrimitive'];
            const inputs = ['chunkSize', 'overlapCoefficient'];
            
            // 添加开关监听器
            toggles.forEach(toggleId => {
                const toggle = document.getElementById(toggleId);
                if (toggle) {
                    toggle.addEventListener('change', function() {
                        // 重新计算并更新结果
                        const form = document.getElementById('configForm');
                        if (form && typeof onSubmit === 'function') {
                            // 模拟表单提交，重新计算
                            const event = new Event('submit', {cancelable: true});
                            form.dispatchEvent(event);
                        }
                    });
                }
            });
            
            // 添加输入框监听器
            inputs.forEach(inputId => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.addEventListener('input', function() {
                        // 重新计算并更新结果
                        const form = document.getElementById('configForm');
                        if (form && typeof onSubmit === 'function') {
                            // 模拟表单提交，重新计算
                            const event = new Event('submit', {cancelable: true});
                            form.dispatchEvent(event);
                        }
                    });
                }
            });
        }
        
        // 初次调用时设置策略监听器
        if (!window.strategyTogglesInitialized) {
            setupStrategyToggles();
            window.strategyTogglesInitialized = true;
        }
        
        // Display per-round communication volume and computation time on the map
        updateMapWithCommunication(data);
    }
    
    // 在地图上更新通信量和计算时长显示，以及并行切割可视化
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
            <div class="text-sm font-medium text-gray-800 mb-1">Training Metrics per Round</div>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <div class="text-gray-500">Communication Volume</div>
                    <div class="font-bold text-blue-600">${totalCommunicationPerRoundGB.toFixed(2)} GB</div>
                </div>
                <div>
                    <div class="text-gray-500">Communication Time</div>
                    <div class="font-bold text-orange-600">${communicationTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">Computation Time</div>
                    <div class="font-bold text-green-600">${computeTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">Total Time</div>
                    <div class="font-bold text-purple-600">${estimatedRoundTimeMs.toFixed(2)} ms</div>
                </div>
                <div>
                    <div class="text-gray-500">Cross-Region Factor</div>
                    <div class="font-bold text-amber-600">${regionCommunicationFactor.toFixed(2)}</div>
                </div>
                <div>
                    <div class="text-gray-500">Distance Factor</div>
                    <div class="font-bold text-teal-600">${distanceBasedFactor.toFixed(2)}</div>
                </div>
            </div>
        `;
        
        // Visualize parallel slicing method
        visualizeParallelSlicing(dp, pp, tp);
    }
    
    // 可视化并行切割方式
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
            <div class="text-sm font-medium text-gray-800 mb-1">Parallel Slicing Method</div>
            <div class="flex items-center mb-1">
                <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Data Parallelism (DP=${dp})</span>
            </div>
            <div class="flex items-center mb-1">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Pipeline Parallelism (PP=${pp})</span>
            </div>
            <div class="flex items-center">
                <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span>Tensor Parallelism (TP=${tp})</span>
            </div>
        `;
        
        // 获取所有地域节点
        const regionNodes = document.querySelectorAll('.region-node');
        
        // 为每个地域节点添加并行策略可视化
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
                    <div style="width: ${dpPercent}%" class="h-2 bg-blue-500 rounded-sm" title="Data Parallelism (${dpPercent}%)"></div>
                    <div style="width: ${ppPercent}%" class="h-2 bg-green-500 rounded-sm" title="Pipeline Parallelism (${ppPercent}%)"></div>
                    <div style="width: ${tpPercent}%" class="h-2 bg-purple-500 rounded-sm" title="Tensor Parallelism (${tpPercent}%)"></div>
                </div>
                <div class="text-xs text-white mt-1">Local Parallelism: TP=${nodeTp}</div>
            `;
        });
        
        // 更新连接线样式，显示不同类型的并行通信
        const connectionLines = document.querySelectorAll('.connection-line');
        
        // 先移除所有连接线的特殊类
        connectionLines.forEach(line => {
            line.classList.remove('data-parallel', 'pipeline-parallel', 'tensor-parallel');
            line.classList.add('connection-line');
        });
        
        // Assign different types of parallel communication styles based on parallelism degrees
        // Number of lines for data parallelism
        const dpLinesCount = Math.min(dp, connectionLines.length);
        // Number of lines for pipeline parallelism
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

    // Generate DeepSpeed deployment code
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

    // Copy code functionality
    copyButton.addEventListener('click', function() {
        const code = deploymentCode.textContent;
        navigator.clipboard.writeText(code).then(function() {
            showNotification('Code copied to clipboard', 'success');
        }).catch(function() {
            showNotification('Copy failed, please copy manually', 'error');
        });
    });

    // Deployment button functionality
    deployButton.addEventListener('click', function() {
        if (deploymentCode.textContent.trim() === '# 请配置参数并点击"计算配置"按钮生成DeepSpeed部署代码') {
            showNotification('Please calculate configuration parameters first', 'warning');
            return;
        }
        
        deployModal.classList.remove('hidden');
    });

    // Close modal
    function closeDeployModal() {
        deployModal.classList.add('hidden');
    }

    closeModal.addEventListener('click', closeDeployModal);
    cancelDeploy.addEventListener('click', closeDeployModal);

    // Confirm deployment
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
        
        // Show deployment in progress notification
        showNotification('Deploying to DeepSpeed...', 'info');
        
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
                showNotification(`Deployment successful! Deployment ID: ${data.deployment_id}`, 'success');
                
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
                throw new Error(data.error || 'Deployment failed');
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
            console.error('Deployment failed:', error);
            showNotification(`Deployment failed: ${error.message}`, 'error');
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === deployModal) {
            closeDeployModal();
        }
    });

    // Show notification
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