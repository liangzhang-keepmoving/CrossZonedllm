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

## Usage Instructions

1. **Configure Parameters**:
   - Set the number of regions participating in training
   - Configure the number of GPUs for each region
   - Select model size
   - Set global batch size
   - Configure inter-region network latency and bandwidth

2. **Calculate Configuration**:
   - Click the "Calculate Configuration" button
   - The system will generate a cross-zone training topology map
   - Display the recommended parallel strategy (DP/PP/TP)
   - Analyze communication volume and latency
   - Provide communication hiding strategy recommendations

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

## Development Instructions

To extend functionality, you can:
1. Modify `server.py` to add new API endpoints
2. Update `app.js` to implement new front-end interactions
3. Improve the parallel strategy recommendation algorithm to support more model types

## License

MIT