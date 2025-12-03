// Global instances
let engine3D, dataGenerator, visualizer, audioPlayer;
let autoPlayInterval = null;

// Wait for everything to load
window.addEventListener('load', () => {
    console.log('🎵 Window loaded - initializing...');
    
    // Extra delay to ensure DOM is ready
    setTimeout(initApp, 200);
});

function initApp() {
    try {
        console.log('Starting initialization...');
        
        // Check if canvas exists
        const canvas3d = document.getElementById('canvas-3d');
        console.log('Canvas element:', canvas3d);
        console.log('Canvas width:', canvas3d ? canvas3d.offsetWidth : 'N/A');
        console.log('Canvas height:', canvas3d ? canvas3d.offsetHeight : 'N/A');
        
        if (!canvas3d) {
            throw new Error('canvas-3d element not found!');
        }
        
        // Initialize components
        console.log('Creating 3D engine...');
        engine3D = new Engine3D('canvas-3d');
        
        console.log('Creating data generator...');
        dataGenerator = new DataGenerator();
        
        console.log('Creating visualizer...');
        visualizer = new Visualizer();
        
        console.log('Creating audio player...');
        audioPlayer = new AudioPlayer();
        
        console.log('✅ All components initialized');
        
        setupEventListeners();
        initializeArchitecture();
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        document.getElementById('explanation').textContent = '❌ Error: ' + error.message + '. Please refresh the page.';
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Architecture buttons
    document.querySelectorAll('.arch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const arch = e.target.dataset.arch;
            console.log('Switching to:', arch);
            
            document.querySelectorAll('.arch-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            AppState.currentArchitecture = arch;
            AppState.reset();
            
            engine3D.buildNetwork(arch);
            visualizer.updateLayerList([]);
            
            document.getElementById('layer-info').style.display = 'none';
            document.getElementById('tensor-preview').style.display = 'none';
            
            updateExplanation(`Switched to ${AppState.getCurrentArch().name}. Generate input data to begin.`);
        });
    });
    
    // Input buttons
    document.querySelectorAll('.input-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const inputType = e.currentTarget.dataset.input;
            generateInput(inputType);
        });
    });
    
    // Sliders
    document.getElementById('temp-slider').addEventListener('input', (e) => {
        AppState.temperature = parseFloat(e.target.value);
        document.getElementById('temp-display').textContent = e.target.value;
    });
    
    document.getElementById('latent-slider').addEventListener('input', (e) => {
        AppState.latentDim = parseInt(e.target.value);
        document.getElementById('latent-display').textContent = e.target.value;
    });
    
    document.getElementById('speed-slider').addEventListener('input', (e) => {
        AppState.animationSpeed = parseFloat(e.target.value);
        document.getElementById('speed-display').textContent = e.target.value + 'x';
    });
    
    // Control buttons
    document.getElementById('run-btn').addEventListener('click', runForwardPass);
    document.getElementById('step-forward-btn').addEventListener('click', stepForward);
    document.getElementById('step-back-btn').addEventListener('click', stepBack);
    document.getElementById('reset-btn').addEventListener('click', resetVisualization);
    document.getElementById('autoplay-btn').addEventListener('click', toggleAutoPlay);
    
    // Audio
    document.getElementById('play-btn').addEventListener('click', () => {
        if (AppState.outputNotes && AppState.outputNotes.length > 0) {
            audioPlayer.play(AppState.outputNotes);
        } else {
            updateExplanation('⚠️ No output generated yet. Run forward pass first.');
        }
    });
    
    document.getElementById('stop-btn').addEventListener('click', () => {
        audioPlayer.stop();
    });
    
    console.log('✅ Event listeners attached');
}

function initializeArchitecture() {
    engine3D.buildNetwork('VAE');
    visualizer.updateLayerList([]);
    updateExplanation('Welcome! Select an input type to generate music data, then click "Run Forward Pass" to see the neural network in action.');
}

function generateInput(type) {
    try {
        const notes = dataGenerator.generateInput(type);
        AppState.inputNotes = notes;
        AppState.inputData = notes;
        
        visualizer.drawInput(notes);
        visualizer.updateLayerList([]);
        AppState.reset();
        
        const typeNames = { 'random': 'random melody', 'scale': 'C major scale', 'chord': 'chord progression' };
        updateExplanation(`✅ Generated ${typeNames[type]} with ${notes.length} notes. Click "Run Forward Pass" to process.`);
    } catch (error) {
        console.error('Error generating input:', error);
        updateExplanation('❌ Error generating input.');
    }
}

function runForwardPass() {
    if (!AppState.inputData || AppState.inputData.length === 0) {
        updateExplanation('⚠️ Please generate input data first.');
        return;
    }
    
    if (AppState.isAnimating) return;
    
    try {
        AppState.reset();
        AppState.isAnimating = true;
        visualizer.showLoadingAnimation();
        
        processAllLayers();
    } catch (error) {
        console.error('Error in forward pass:', error);
        AppState.isAnimating = false;
        visualizer.hideLoadingAnimation();
        updateExplanation('❌ Error during forward pass.');
    }
}

function processAllLayers() {
    const arch = AppState.getCurrentArch();
    let currentData = AppState.inputData;
    
    arch.layers.forEach((layer, index) => {
        const layerOutput = dataGenerator.processLayer(index, currentData);
        AppState.layerOutputs.push(layerOutput);
        currentData = layerOutput.data;
    });
    
    animateStep(0);
}

function animateStep(step) {
    const arch = AppState.getCurrentArch();
    const totalLayers = arch.layers.length;
    
    if (step >= totalLayers) {
        completeForwardPass();
        return;
    }
    
    AppState.currentStep = step;
    
    // Get layer data or generate if needed
    let layerData = AppState.layerOutputs[step];
    if (!layerData && step < AppState.layerOutputs.length) {
        layerData = AppState.layerOutputs[step];
    }
    
    engine3D.highlightLayer(step);
    
    if (layerData) {
        visualizer.updateLayerInfo(layerData, step);
    }
    
    visualizer.animateProgress(step, totalLayers);
    visualizer.updateLayerList(AppState.layerOutputs);
    
    // Only auto-continue if we're in auto-play mode or running forward pass
    if (AppState.isAnimating || AppState.isAutoPlaying) {
        if (step < totalLayers - 1) {
            const delay = 1000 / AppState.animationSpeed;
            // Only animate data flow if we have actual layer outputs
            if (step < AppState.layerOutputs.length - 1) {
                engine3D.animateDataFlow(step, step + 1, () => {
                    setTimeout(() => animateStep(step + 1), delay);
                });
            } else {
                setTimeout(() => animateStep(step + 1), delay);
            }
        } else {
            setTimeout(() => animateStep(step + 1), 500);
        }
    }
}

function completeForwardPass() {
    AppState.isAnimating = false;
    visualizer.hideLoadingAnimation();
    
    // Set current step to the last layer in architecture
    const arch = AppState.getCurrentArch();
    AppState.currentStep = arch.layers.length - 1;
    
    // Generate final output
    const finalLayerData = AppState.layerOutputs[AppState.layerOutputs.length - 1];
    if (finalLayerData) {
        AppState.outputNotes = dataGenerator.generateOutput(finalLayerData.data);
        visualizer.drawOutput(AppState.outputNotes);
    }
    
    // Update final view
    updateStepView();
    
    updateExplanation(`✅ Forward pass complete! Generated ${AppState.outputNotes.length} notes. Click "Play" to hear.`);
}

function generateDataOnly() {
    if (!AppState.inputData || AppState.inputData.length === 0) {
        updateExplanation('⚠️ Please generate input data first.');
        return;
    }
    
    try {
        AppState.reset();
        
        // Process all layers without animation
        const arch = AppState.getCurrentArch();
        let currentData = AppState.inputData;
        
        arch.layers.forEach((layer, index) => {
            const layerOutput = dataGenerator.processLayer(index, currentData);
            AppState.layerOutputs.push(layerOutput);
            currentData = layerOutput.data;
        });
        
        // Set to first step and update view
        AppState.currentStep = 0;
        updateStepView();
        
    } catch (error) {
        console.error('Error generating data:', error);
        updateExplanation('❌ Error generating data.');
    }
}

function stepForward() {
    if (AppState.isAnimating) return;
    
    if (AppState.layerOutputs.length === 0) {
        // Generate data but don't start animation
        generateDataOnly();
        return;
    }
    
    const arch = AppState.getCurrentArch();
    const totalLayers = arch.layers.length;
    
    if (AppState.currentStep < totalLayers - 1) {
        AppState.currentStep++;
        
        // Direct update without animation continuation
        const step = AppState.currentStep;
        const layerData = AppState.layerOutputs[step];
        
        engine3D.highlightLayer(step);
        
        if (layerData) {
            visualizer.updateLayerInfo(layerData, step);
        }
        
        visualizer.animateProgress(step, totalLayers);
        visualizer.updateLayerList(AppState.layerOutputs);
        
        if (step === totalLayers - 1 && layerData) {
            AppState.outputNotes = dataGenerator.generateOutput(layerData.data);
            visualizer.drawOutput(AppState.outputNotes);
        }
    }
}

function stepBack() {
    if (AppState.isAnimating) return;
    
    if (AppState.layerOutputs.length === 0) return;
    
    if (AppState.currentStep > 0) {
        AppState.currentStep--;
        
        // Direct update without animation continuation
        const step = AppState.currentStep;
        const layerData = AppState.layerOutputs[step];
        
        engine3D.highlightLayer(step);
        
        if (layerData) {
            visualizer.updateLayerInfo(layerData, step);
        }
        
        visualizer.animateProgress(step, AppState.getCurrentArch().layers.length);
        visualizer.updateLayerList(AppState.layerOutputs);
    }
}

function updateStepView() {
    const step = AppState.currentStep || 0;
    const layerData = AppState.layerOutputs[step];
    
    // Update step counter display - use total architecture layers
    const stepDisplay = document.querySelector('.progress-text');
    if (stepDisplay) {
        const arch = AppState.getCurrentArch();
        const totalLayers = arch.layers.length;
        stepDisplay.textContent = `Step ${step + 1} / ${totalLayers}`;
    }
    
    engine3D.highlightLayer(step);
    
    if (layerData) {
        visualizer.updateLayerInfo(layerData, step);
    }
    
    visualizer.animateProgress(step, AppState.layerOutputs.length);
    visualizer.updateLayerList(AppState.layerOutputs);
    
    if (step === AppState.layerOutputs.length - 1 && layerData) {
        AppState.outputNotes = dataGenerator.generateOutput(layerData.data);
        visualizer.drawOutput(AppState.outputNotes);
    }
}

function jumpToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= AppState.totalSteps) return;
    
    AppState.currentStep = stepIndex;
    
    // Generate layer outputs if they don't exist
    if (AppState.layerOutputs.length === 0 && AppState.inputData) {
        const arch = AppState.getCurrentArch();
        let currentData = AppState.inputData;
        
        arch.layers.forEach((layer, index) => {
            const layerOutput = dataGenerator.processLayer(index, currentData);
            AppState.layerOutputs.push(layerOutput);
            currentData = layerOutput.data;
        });
    }
    
    updateStepView();
}

function resetVisualization() {
    AppState.reset();
    
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        AppState.isAutoPlaying = false;
        document.getElementById('autoplay-btn').textContent = '⏯️ Auto Play';
    }
    
    audioPlayer.stop();
    visualizer.hideLoadingAnimation();
    
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Step 0 / 0';
    document.getElementById('layer-info').style.display = 'none';
    document.getElementById('tensor-preview').style.display = 'none';
    
    visualizer.updateLayerList([]);
    
    const outputCanvas = document.getElementById('output-canvas');
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.fillStyle = '#000';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    
    document.getElementById('output-shape').textContent = '[0, 88]';
    document.getElementById('output-notes').textContent = '0';
    
    engine3D.layerNodes.forEach(group => {
        group.children.forEach(node => {
            if (node.isMesh) {
                node.material.emissiveIntensity = 0.3;
                node.material.opacity = 0.85;
                node.scale.setScalar(1);
            }
        });
    });
    
    updateExplanation('Reset complete. Ready for new forward pass.');
}

function toggleAutoPlay() {
    AppState.isAutoPlaying = !AppState.isAutoPlaying;
    
    const btn = document.getElementById('autoplay-btn');
    
    if (AppState.isAutoPlaying) {
        btn.textContent = '⏸️ Pause';
        
        if (AppState.layerOutputs.length === 0) {
            runForwardPass();
        }
        
        autoPlayInterval = setInterval(() => {
            if (AppState.currentStep >= AppState.totalSteps - 1) {
                AppState.currentStep = -1;
            }
            stepForward();
        }, 2000 / AppState.animationSpeed);
        
    } else {
        btn.textContent = '⏯️ Auto Play';
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }
}

function updateExplanation(text) {
    const el = document.getElementById('explanation');
    if (el) el.textContent = text;
    console.log('💬', text);
}

console.log('📜 app.js loaded');
