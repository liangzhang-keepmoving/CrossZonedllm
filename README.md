# Cross-Zone Distributed Large Model Training Performance Evaluation System

This is a web application for evaluating cross-zone distributed large model training performance. The application helps users configure cross-regional distributed training environments, recommend optimal parallel strategies, and generate DeepSpeed deployment code.

## Features

- **Cross-zone Training Topology Visualization**: Intuitively displays the distribution and connection of training nodes across multiple regions
- **Intelligent Parallel Strategy Recommendation**: Recommends optimal DP/PP/TP parallel methods based on model size, GPU count, and region configuration
- **Communication Analysis**: Calculates and displays communication overhead under different parallel strategies
- **Communication Hiding Strategy**: Provides optimization suggestions to reduce cross-regional communication latency
- **One-click DeepSpeed Deployment**: Automatically generates DeepSpeed configuration files and startup scripts, supporting one-click deployment

## Project Structure

```
CrossZonedllm/
├── index.html        # Main page HTML structure
├── styles.css        # Page styles
├── app.js            # Front-end interaction logic
├── server.py         # Back-end service
├── requirements.txt  # Python dependencies
└── deployments/      # Deployment configuration storage directory
```

## Quick Start

### Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt
```

### Start the Service

```bash
python server.py
```

Once the service starts, visit http://localhost:5000 to use the application.

## Web Interface Overview

The application interface is divided into two main sections: parameter configuration on the left and result visualization on the right. After calculating the configuration, the results are displayed across four tabs:

You can view a preview of the interface by opening the `images/placeholder.html` file in a web browser.

### 1. Training Map

The Training Map provides a visual representation of your distributed training topology across regions:

- Displays region nodes with GPU counts in a circular or grid layout based on the number of regions
- Shows connecting lines between regions with distance labels (in km)
- Includes a metrics panel showing key training metrics per round:
  - Communication Volume (GB)
  - Communication Time (ms)
  - Computation Time (ms)
  - Total Time (ms)
  - Cross-Region Factor
  - Distance Factor
- Visualizes parallel slicing method with color-coded indicators for DP/PP/TP
- Shows connection line styles for different types of parallel communication

![Training Map](images/training-map.png)

### 2. Parallel Strategy

The Parallel Strategy tab presents the recommended data parallelism (DP), pipeline parallelism (PP), and tensor parallelism (TP) configuration:

- Displays parallel strategy values in data cards
- Provides recommendation reasoning optimized for cross-regional scenarios
- Includes a radar chart comparing the recommended strategy with alternative approaches across dimensions:
  - Computational Efficiency
  - Communication Overhead
  - Memory Usage
  - Scalability
  - Cross-region Adaptability

![Parallel Strategy](images/parallel-strategy.png)

### 3. Communication Analysis

The Communication Analysis tab provides detailed insights into the communication overhead and optimization strategies:

- Shows key communication metrics in data cards:
  - Total Communication per Round (GB)
  - Communication Time (ms)
  - Computation Time (ms)
  - Estimated Total Round Time (ms)
  - Parallel Efficiency (%)
  - Communication Ratio (%)
  - Data/ Tensor/ Pipeline Parallel Communication volumes
  - Cross-Region and Distance Impact Factors

- Includes comprehensive calculation formulas for all metrics

- Shows current strategy configuration with visual indicators for:
  - Gradient Accumulation Factor
  - Data Compression Ratio
  - Prediction Efficiency
  - Async Overlap Efficiency
  - Communication Primitive type
  - Communication Chunk Size
  - Overlap Coefficient
  - Primitive Efficiency improvement

- Features strategy toggles to experiment with different optimization approaches:
  - Multi-level Gradient Accumulation
  - High-efficiency Data Compression
  - Predictive Communication
  - Asynchronous Communication Mode
  - Cross-region Communication Primitive selection
  - Communication Chunk Size adjustment
  - Overlap Coefficient configuration

- Provides tailored Communication Hiding Strategy recommendations based on the computation:communication time ratio:
  - Balanced Scenario (0.5-2x ratio)
  - Computation-Limited Scenario (<0.5x ratio)
  - Communication-Limited Scenario (>2x ratio)

- Estimates hiding efficiency based on the selected scenario and strategies

![Communication Analysis](images/communication-analysis.png)

### 4. Deployment Code

The Deployment Code tab generates and displays DeepSpeed configuration files and startup scripts:

- Shows the complete DeepSpeed configuration file (ds_config.json)
- Includes a startup script (run_training.sh) with all necessary parameters
- Supports copying the generated code to clipboard
- Allows for one-click deployment to DeepSpeed

![Deployment Code](images/deployment-code.png)

## Usage Instructions

1. **Configure Parameters**:
   - Set the number of regions participating in training
   - Configure the number of GPUs for each region
   - Select model size
   - Set global batch size
   - Configure inter-region network latency and bandwidth
   - Set inter-region distances (automatically generated when more than one region is selected)

2. **Calculate Configuration**:
   - Click the "Calculate Configuration" button
   - The system will generate a cross-zone training topology map
   - Display the recommended parallel strategy (DP/PP/TP)
   - Analyze communication volume and latency
   - Provide communication hiding strategy recommendations
   - Generate DeepSpeed deployment code

3. **Deploy to DeepSpeed**:
   - Click the "Deploy to DeepSpeed" button
   - Confirm deployment configuration
   - The system will generate DeepSpeed configuration files and training scripts
   - Deployment configurations will be saved in the `deployments` directory

## Technology Stack

- **Front-end**: HTML, CSS, JavaScript, Tailwind CSS, Font Awesome, Chart.js
- **Back-end**: Python, Flask
- **Distributed Training**: DeepSpeed

## Notes

- When actually deploying, you need to replace `master_node_ip` in the startup script with the actual master node IP address
- Ensure good network connectivity between all nodes
- Adjust network parameters according to the actual environment to get more accurate performance evaluation results
- Communication hiding strategies are tailored based on the computation:communication time ratio, and their effectiveness may vary based on actual hardware and network conditions
- The recommended parallel strategies are optimized for cross-regional scenarios, prioritizing reduced inter-region communication

## Development Instructions

To extend functionality, you can:
1. Modify `server.py` to add new API endpoints
2. Update `app.js` to implement new front-end interactions
3. Improve the parallel strategy recommendation algorithm to support more model types

## License

MIT