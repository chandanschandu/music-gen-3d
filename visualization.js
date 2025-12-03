class Visualizer {
    constructor() {
        this.inputCanvas = document.getElementById('input-canvas');
        this.outputCanvas = document.getElementById('output-canvas');
        this.tensorCanvas = document.getElementById('tensor-canvas');
        
        this.inputCtx = this.inputCanvas.getContext('2d');
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.tensorCtx = this.tensorCanvas.getContext('2d');
        
        this.setupCanvases();
        
        // Add resize handler
        window.addEventListener('resize', () => {
            this.setupCanvases();
        });
    }
    
    setupCanvases() {
        // Set canvas sizes
        [this.inputCanvas, this.outputCanvas].forEach(canvas => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
        });
        
        // Special handling for tensor canvas
        this.tensorCanvas.width = this.tensorCanvas.offsetWidth * window.devicePixelRatio;
        this.tensorCanvas.height = this.tensorCanvas.offsetHeight * window.devicePixelRatio;
        this.tensorCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Ensure tensor canvas has proper dimensions
        if (this.tensorCanvas.offsetWidth === 0 || this.tensorCanvas.offsetHeight === 0) {
            console.warn('Tensor canvas has zero dimensions, setting default size');
            this.tensorCanvas.width = 200 * window.devicePixelRatio;
            this.tensorCanvas.height = 120 * window.devicePixelRatio;
            this.tensorCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        
        console.log('Tensor canvas setup:', {
            width: this.tensorCanvas.width,
            height: this.tensorCanvas.height,
            offsetWidth: this.tensorCanvas.offsetWidth,
            offsetHeight: this.tensorCanvas.offsetHeight
        });
    }
    
    drawPianoRoll(ctx, canvas, notes, title = '') {
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        
        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        // Draw grid
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        
        // Vertical lines (time)
        for (let x = 0; x < w; x += w / 16) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        
        // Horizontal lines (pitch)
        for (let y = 0; y < h; y += h / 12) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        // Draw C notes more prominently
        for (let y = 0; y < h; y += h / 12) {
            ctx.strokeStyle = '#2a2a2a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        if (!notes || notes.length === 0) return;
        
        // Calculate bounds
        const times = notes.map(n => n.time + n.duration);
        const maxTime = Math.max(...times);
        const pitches = notes.map(n => n.pitch);
        const minPitch = Math.min(...pitches);
        const maxPitch = Math.max(...pitches);
        const pitchRange = maxPitch - minPitch || 24;
        
        // Draw notes
        notes.forEach(note => {
            const x = (note.time / maxTime) * w;
            const noteWidth = Math.max((note.duration / maxTime) * w, 2);
            const y = h - ((note.pitch - minPitch) / pitchRange) * h;
            const noteHeight = Math.max(h / pitchRange * 0.8, 3);
            
            // Color based on pitch and velocity
            const hue = ((note.pitch - 36) / 60) * 280;
            const saturation = 100;
            const lightness = 40 + (note.velocity * 30);
            
            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness + 20}%)`;
            
            // Note rectangle
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.fillRect(x, y - noteHeight/2, noteWidth, noteHeight);
            
            // Bright edge
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 30}%, 0.8)`;
            ctx.fillRect(x, y - noteHeight/2, 2, noteHeight);
            
            ctx.shadowBlur = 0;
        });
        
        // Title
        if (title) {
            ctx.fillStyle = '#00d4ff';
            ctx.font = 'bold 14px Inter';
            ctx.fillText(title, 10, 20);
        }
    }
    
    drawInput(notes) {
        this.drawPianoRoll(this.inputCtx, this.inputCanvas, notes, '');
        
        // Update info
        if (notes && notes.length > 0) {
            document.getElementById('input-shape').textContent = `[${notes.length}, 88]`;
            document.getElementById('input-notes').textContent = notes.length;
            const duration = notes[notes.length - 1].time + notes[notes.length - 1].duration;
            document.getElementById('input-duration').textContent = duration.toFixed(1) + 's';
        }
    }
    
    drawOutput(notes) {
        this.drawPianoRoll(this.outputCtx, this.outputCanvas, notes, '');
        
        // Update info
        if (notes && notes.length > 0) {
            document.getElementById('output-shape').textContent = `[${notes.length}, 88]`;
            document.getElementById('output-notes').textContent = notes.length;
        }
    }
    
    drawTensorActivation(activationMap) {
        if (!activationMap) {
            console.log('No activation map provided');
            return;
        }
        
        const canvas = document.getElementById('tensor-canvas');
        if (!canvas) {
            console.log('Tensor canvas not found');
            return;
        }
        
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        
        if (w === 0 || h === 0) {
            console.log('Canvas has zero dimensions');
            return;
        }
        
        this.tensorCtx.fillStyle = '#000';
        this.tensorCtx.fillRect(0, 0, w, h);
        
        const rows = activationMap.length;
        const cols = activationMap[0].length;
        const cellW = w / cols;
        const cellH = h / rows;
        
        console.log(`Drawing activation map: ${rows}x${cols} on canvas ${w}x${h}`);
        
        activationMap.forEach((row, i) => {
            row.forEach((value, j) => {
                const intensity = Math.floor(value * 255);
                const hue = 180 + (value * 100); // Cyan to green
                this.tensorCtx.fillStyle = `hsl(${hue}, 100%, ${intensity * 0.3}%)`;
                this.tensorCtx.fillRect(j * cellW, i * cellH, cellW - 1, cellH - 1);
            });
        });
    }
    
    animateProgress(step, total) {
        // Always use architecture total for correct progress
        const arch = AppState.getCurrentArch();
        const actualTotal = arch.layers.length;
        const percentage = ((step + 1) / actualTotal) * 100;
        
        const fillElement = document.getElementById('progress-fill');
        fillElement.style.width = percentage + '%';
        
        document.getElementById('progress-text').textContent = `Step ${step + 1} / ${actualTotal}`;
    }
    
    updateLayerInfo(layerData, stepIndex) {
        const arch = AppState.getCurrentArch();
        const layer = arch.layers[stepIndex];
        
        console.log(`Updating layer info for step ${stepIndex}:`, layer.name);
        console.log('Layer data:', layerData);
        
        // Show layer overlay
        const overlay = document.getElementById('layer-info');
        overlay.style.display = 'block';
        
        // Update content
        document.getElementById('layer-title').textContent = layer.name;
        document.getElementById('detail-input').textContent = layer.inputShape;
        document.getElementById('detail-operation').textContent = layer.operation;
        document.getElementById('detail-output').textContent = layer.outputShape;
        document.getElementById('detail-params').textContent = layer.params.toLocaleString();
        document.getElementById('formula-text').textContent = layer.formula;
        
        // Always show tensor preview with meaningful data
        document.getElementById('tensor-preview').style.display = 'block';
        
        // Generate or use existing activation
        let activation = layerData.activation;
        if (!activation) {
            console.log('No activation in layer data, generating new one');
            activation = this.generateActivationMap(stepIndex);
        } else {
            console.log('Using existing activation map');
        }
        
        // Also show layer-specific info in tensor area
        this.drawTensorWithInfo(activation, layer, layerData, stepIndex);
        
        // Update explanation
        document.getElementById('explanation').textContent = layer.description;
    }
    
    drawTensorWithInfo(activation, layer, layerData, stepIndex) {
        const canvas = document.getElementById('tensor-canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        
        // Clear canvas with proper sizing
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        // Draw activation map
        this.drawTensorActivation(activation);
        
        // Add layer-specific text overlay
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`Layer: ${layer.name}`, 10, 20);
        
        ctx.fillStyle = '#00ff88';
        ctx.font = '12px monospace';
        ctx.fillText(`Type: ${layer.type}`, 10, 35);
        ctx.fillText(`Shape: ${layer.outputShape}`, 10, 50);
        
        // Show data info if available
        if (layerData.data) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '11px monospace';
            
            if (Array.isArray(layerData.data)) {
                ctx.fillText(`Data points: ${layerData.data.length}`, 10, 65);
                if (layerData.data.length > 0) {
                    const sample = layerData.data[0];
                    if (sample && typeof sample === 'object') {
                        ctx.fillText(`Sample: pitch=${sample.pitch?.toFixed(1) || 'N/A'}, vel=${sample.velocity?.toFixed(2) || 'N/A'}`, 10, 80);
                    }
                }
            } else if (typeof layerData.data === 'object') {
                ctx.fillText(`Object: ${Object.keys(layerData.data).join(', ')}`, 10, 65);
            }
        }
        
        // Add step info
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`Step ${stepIndex + 1}`, w - 60, 20);
    }
    
    updateLayerList(layers) {
        const listContainer = document.getElementById('layer-list');
        listContainer.innerHTML = '';
        
        const arch = AppState.getCurrentArch();
        const currentStep = AppState.currentStep || 0;
        const totalLayers = layers.length || arch.layers.length;
        
        arch.layers.forEach((layer, index) => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            
            // Fix the state logic
            const processed = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;
            
            let badgeText, badgeColor;
            if (processed) {
                badgeText = '✓ Done';
                badgeColor = '#00ff88';
            } else if (isActive) {
                badgeText = '▶ Active';
                badgeColor = '#00d4ff';
                item.classList.add('active');
            } else {
                badgeText = '⏸ Pending';
                badgeColor = '#666';
            }
            
            item.innerHTML = `
                <div class="layer-item-header">
                    <span class="layer-name">${index + 1}. ${layer.name}</span>
                    <span class="layer-badge" style="background: ${badgeColor}22; color: ${badgeColor};">
                        ${badgeText}
                    </span>
                </div>
                <div class="layer-shape">${layer.inputShape} → ${layer.outputShape}</div>
            `;
            
            item.addEventListener('click', () => {
                if (processed || isActive) {
                    jumpToStep(index);
                }
            });
            
            listContainer.appendChild(item);
        });
    }
    
    showLoadingAnimation() {
        // Add pulsing effect to progress bar
        document.getElementById('progress-fill').classList.add('pulsing');
    }
    
    hideLoadingAnimation() {
        document.getElementById('progress-fill').classList.remove('pulsing');
    }
    
    generateActivationMap(stepIndex) {
        // Generate heatmap data for tensor visualization
        const size = 16;
        const map = [];
        
        for (let i = 0; i < size; i++) {
            const row = [];
            for (let j = 0; j < size; j++) {
                const value = Math.random() * 0.7 + 0.3 * Math.sin((i + j) * 0.5 + stepIndex);
                row.push(Math.max(0, Math.min(1, value)));
            }
            map.push(row);
        }
        
        return map;
    }
}
