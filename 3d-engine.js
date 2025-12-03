class Engine3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            50,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: true 
        });
        
        this.init();
        this.setupLights();
        this.setupControls();
        
        this.layerNodes = [];
        this.connections = [];
        this.particles = [];
        
        this.animate();
    }
    
    init() {
        // Force canvas to use full container size
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0a0e27, 1);
        
        this.camera.position.set(0, 5, 12); // Much closer for larger appearance
        this.camera.lookAt(0, 0, 0);
        
        // Fog for depth
        this.scene.fog = new THREE.Fog(0x0a0e27, 30, 80);
        
        // Resize handler with forced sizing
        window.addEventListener('resize', () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }
    
    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);
        
        // Point lights for dramatic effect
        const light1 = new THREE.PointLight(0x00d4ff, 1.5, 50);
        light1.position.set(15, 10, 15);
        this.scene.add(light1);
        
        const light2 = new THREE.PointLight(0xff00ff, 1.2, 50);
        light2.position.set(-15, 10, -15);
        this.scene.add(light2);
        
        const light3 = new THREE.PointLight(0x00ff88, 1, 40);
        light3.position.set(0, -10, 10);
        this.scene.add(light3);
        
        // Add moving lights
        this.movingLights = [light1, light2, light3];
    }
    
    setupControls() {
        let isDragging = false;
        let previousMouse = { x: 0, y: 0 };
        let rotation = { x: 0, y: 0 };
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        this.selectedObject = null;
        
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMouse = { x: e.clientX, y: e.clientY };
            
            // Check for object selection
            this.updateMousePosition(e);
            this.checkIntersections();
            
            if (this.hoveredObject) {
                this.selectedObject = this.hoveredObject;
                this.onObjectClick(this.selectedObject);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
            
            if (isDragging) {
                const deltaX = e.clientX - previousMouse.x;
                const deltaY = e.clientY - previousMouse.y;
                
                rotation.y += deltaX * 0.005;
                rotation.x += deltaY * 0.005;
                
                // Clamp rotation
                rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotation.x));
                
                this.scene.rotation.y = rotation.y;
                this.scene.rotation.x = rotation.x;
                
                previousMouse = { x: e.clientX, y: e.clientY };
            } else {
                // Check for hover
                this.checkIntersections();
            }
        });
        
        // Zoom with mouse wheel
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.position.z += e.deltaY * 0.02;
            this.camera.position.z = Math.max(8, Math.min(25, this.camera.position.z));
        });
    }
    
    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all interactive objects
        const interactiveObjects = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData && Object.keys(child.userData).length > 0) {
                interactiveObjects.push(child);
            }
        });
        
        const intersects = this.raycaster.intersectObjects(interactiveObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (this.hoveredObject !== object) {
                // Reset previous hover
                if (this.hoveredObject) {
                    this.onObjectHoverEnd(this.hoveredObject);
                }
                
                // Set new hover
                this.hoveredObject = object;
                this.onObjectHoverStart(object);
            }
        } else {
            if (this.hoveredObject) {
                this.onObjectHoverEnd(this.hoveredObject);
                this.hoveredObject = null;
            }
        }
    }
    
    onObjectHoverStart(object) {
        // Change cursor
        this.canvas.style.cursor = 'pointer';
        
        // Highlight object
        if (object.material) {
            object.originalEmissive = object.material.emissiveIntensity;
            object.material.emissiveIntensity = 1.0;
            
            // Scale up slightly
            object.originalScale = object.scale.clone();
            object.scale.multiplyScalar(1.2);
        }
        
        // Show tooltip
        this.showObjectTooltip(object);
    }
    
    onObjectHoverEnd(object) {
        // Reset cursor
        this.canvas.style.cursor = 'grab';
        
        // Reset highlight
        if (object.material && object.originalEmissive !== undefined) {
            object.material.emissiveIntensity = object.originalEmissive;
            delete object.originalEmissive;
        }
        
        if (object.originalScale) {
            object.scale.copy(object.originalScale);
            delete object.originalScale;
        }
        
        // Hide tooltip
        this.hideObjectTooltip();
    }
    
    onObjectClick(object) {
        const userData = object.userData;
        
        if (userData.type === 'lstm-gate') {
            this.showLSTMGateInfo(userData.gateType, userData.layerIndex);
        } else if (userData.type === 'attention-head') {
            this.showAttentionHeadInfo(userData.headIndex);
        } else if (userData.type === 'qkv-node') {
            this.showQKVNodeInfo(userData.qkvType, userData.headIndex);
        } else if (userData.type === 'timestep') {
            this.showTimestepInfo(userData.timestep, userData.noiseLevel);
        } else if (userData.type === 'sampling-particle') {
            this.showVAESamplingInfo();
        } else if (userData.layerIndex !== undefined) {
            // Regular layer node
            const layer = AppState.getCurrentArch().layers[userData.layerIndex];
            if (layer) {
                this.showLayerInfo(layer, userData.layerIndex);
            }
        }
    }
    
    showObjectTooltip(object) {
        const userData = object.userData;
        let tooltipText = '';
        
        if (userData.type === 'lstm-gate') {
            tooltipText = `${userData.gateType.toUpperCase()} Gate`;
        } else if (userData.type === 'attention-head') {
            tooltipText = `Attention Head ${userData.headIndex}`;
        } else if (userData.type === 'qkv-node') {
            tooltipText = `${userData.qkvType} Vector (Head ${userData.headIndex})`;
        } else if (userData.type === 'timestep') {
            tooltipText = `Timestep ${userData.timestep} (Noise: ${(userData.noiseLevel * 100).toFixed(0)}%)`;
        } else if (userData.type === 'sampling-particle') {
            tooltipText = 'Latent Sample';
        } else if (userData.layerIndex !== undefined) {
            const layer = AppState.getCurrentArch().layers[userData.layerIndex];
            tooltipText = layer ? layer.name : 'Layer';
        }
        
        if (tooltipText) {
            this.createTooltip(tooltipText);
        }
    }
    
    createTooltip(text) {
        // Remove existing tooltip
        this.hideObjectTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'three-js-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: #00d4ff;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #00d4ff;
            font-size: 12px;
            font-weight: 600;
            pointer-events: none;
            z-index: 1000;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(tooltip);
        this.tooltipElement = tooltip;
        
        // Update tooltip position on mouse move
        this.updateTooltipPosition = (e) => {
            tooltip.style.left = e.clientX + 15 + 'px';
            tooltip.style.top = e.clientY - 30 + 'px';
        };
        
        this.canvas.addEventListener('mousemove', this.updateTooltipPosition);
    }
    
    hideObjectTooltip() {
        if (this.tooltipElement) {
            document.body.removeChild(this.tooltipElement);
            this.tooltipElement = null;
            
            if (this.updateTooltipPosition) {
                this.canvas.removeEventListener('mousemove', this.updateTooltipPosition);
                this.updateTooltipPosition = null;
            }
        }
    }
    
    showLSTMGateInfo(gateType, layerIndex) {
        const gateDescriptions = {
            forget: 'Controls what information to discard from the cell state',
            input: 'Decides which values to update in the cell state',
            output: 'Determines what parts of the cell state to output',
            cell: 'Internal memory that stores long-term information'
        };
        
        const info = gateDescriptions[gateType] || 'LSTM Gate';
        this.showDetailedInfo(`${gateType.toUpperCase()} Gate`, info);
    }
    
    showAttentionHeadInfo(headIndex) {
        this.showDetailedInfo(
            `Attention Head ${headIndex}`,
            `Processes input sequence with learned attention patterns. Each head focuses on different aspects of the sequence.`
        );
    }
    
    showQKVNodeInfo(qkvType, headIndex) {
        const descriptions = {
            'Q': 'Query: What am I looking for?',
            'K': 'Key: What do I contain?',
            'V': 'Value: What information do I provide?'
        };
        
        this.showDetailedInfo(
            `${qkvType} Vector (Head ${headIndex})`,
            descriptions[qkvType] || 'Attention vector'
        );
    }
    
    showTimestepInfo(timestep, noiseLevel) {
        const process = timestep < 5 ? 'Forward (Adding Noise)' : 'Reverse (Denoising)';
        this.showDetailedInfo(
            `Timestep ${timestep}`,
            `${process}\nNoise Level: ${(noiseLevel * 100).toFixed(0)}%\nβ: ${(noiseLevel * 0.02).toFixed(4)}`
        );
    }
    
    showVAESamplingInfo() {
        this.showDetailedInfo(
            'Latent Space Sampling',
            'z ~ N(μ, σ²)\nSampling from learned distribution\nEnables generation of new variations'
        );
    }
    
    showLayerInfo(layer, layerIndex) {
        this.showDetailedInfo(
            layer.name,
            `${layer.operation}\nInput: ${layer.inputShape}\nOutput: ${layer.outputShape}\nParameters: ${layer.params.toLocaleString()}`
        );
    }
    
    showDetailedInfo(title, content) {
        const overlay = document.getElementById('layer-info');
        const titleEl = document.getElementById('layer-title');
        const detailGrid = overlay.querySelector('.detail-grid');
        
        titleEl.textContent = title;
        
        // Update detail grid with content
        const lines = content.split('\n');
        let gridHTML = '';
        
        lines.forEach(line => {
            if (line.includes(':')) {
                const [label, value] = line.split(':');
                gridHTML += `
                    <span class="detail-label">${label.trim()}:</span>
                    <span class="detail-value">${value.trim()}</span>
                `;
            } else {
                gridHTML += `
                    <span class="detail-label">Info:</span>
                    <span class="detail-value">${line}</span>
                `;
            }
        });
        
        detailGrid.innerHTML = gridHTML;
        overlay.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (overlay.style.display === 'block' && titleEl.textContent === title) {
                overlay.style.display = 'none';
            }
        }, 5000);
    }
    
    buildNetwork(architecture) {
        this.clearNetwork();
        
        const layers = AppState.getCurrentArch().layers;
        const spacing = 18; // Much larger spacing between layers
        const startX = -(layers.length - 1) * spacing / 2;
        
        layers.forEach((layer, index) => {
            const group = this.createLayerGroup(layer, index, startX + index * spacing);
            this.layerNodes.push(group);
            
            // Create connections to next layer
            if (index < layers.length - 1) {
                this.createConnections(index, layers);
            }
        });
        
        // Add architecture-specific visualizations
        if (architecture === 'VAE') {
            this.addVAELatentVisualization();
        } else if (architecture === 'LSTM') {
            this.addLSTMGateVisualization();
        } else if (architecture === 'Transformer') {
            this.addTransformerAttentionVisualization();
        } else if (architecture === 'Diffusion') {
            this.addDiffusionProcessVisualization();
        }
        
        AppState.totalSteps = layers.length;
    }
    
    createLayerGroup(layerInfo, layerIndex, xPosition) {
        const group = new THREE.Group();
        group.userData = { layerIndex, layerInfo };
        
        // Calculate node count based on layer
        let nodeCount = this.getNodeCount(layerInfo.type);
        const nodeRadius = layerInfo.type === 'latent' ? 2.5 : 1.8; // Dramatically increased node size
        const spacing = 3.5; // Much larger spacing between nodes
        
        // Create 3D arrangement
        const rows = Math.ceil(Math.sqrt(nodeCount));
        const cols = Math.ceil(nodeCount / rows);
        
        const startY = -(rows - 1) * spacing / 2;
        const startZ = -(cols - 1) * spacing / 2;
        
        for (let i = 0; i < nodeCount; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const geometry = new THREE.SphereGeometry(nodeRadius, 24, 24);
            const material = new THREE.MeshPhongMaterial({
                color: layerInfo.color,
                emissive: layerInfo.color,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.85,
                shininess: 100
            });
            
            const node = new THREE.Mesh(geometry, material);
            node.position.set(
                xPosition,
                startY + row * spacing,
                startZ + col * spacing
            );
            
            node.userData = {
                layerIndex,
                nodeIndex: i,
                originalEmissive: 0.3,
                originalScale: 1
            };
            
            this.scene.add(node);
            group.add(node);
        }
        
        // Add layer label with larger text
        this.createTextSprite(layerInfo.name, xPosition, startY - 3, startZ);
        
        return group;
    }
    
    getNodeCount(type) {
        const counts = {
            'input': 16,
            'conv': 20,
            'deconv': 20,
            'lstm': 18,
            'embedding': 16,
            'positional': 16,
            'attention': 24,
            'ffn': 20,
            'latent': 12,
            'dense': 18,
            'time': 8,
            'down': 16,
            'bottleneck': 20,
            'up': 16,
            'predict': 14,
            'output': 16
        };
        return counts[type] || 16;
    }
    
    createTextSprite(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = 'rgba(0, 212, 255, 0.9)';
        context.font = 'bold 24px Inter'; // Smaller font for 3D model labels
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.set(x, y, z);
        sprite.scale.set(4, 1, 1); // Smaller text scale for 3D models
        
        this.scene.add(sprite);
    }
    
    createConnections(fromIndex, layers) {
        const fromGroup = this.layerNodes[fromIndex];
        const toGroup = this.layerNodes[fromIndex + 1];
        
        if (!fromGroup || !toGroup) return;
        
        const fromNodes = fromGroup.children;
        const toNodes = toGroup.children;
        
        // Create sample connections
        const connectionDensity = 0.15;
        
        fromNodes.forEach((fromNode, i) => {
            toNodes.forEach((toNode, j) => {
                if (Math.random() < connectionDensity) {
                    const points = [
                        fromNode.position.clone(),
                        toNode.position.clone()
                    ];
                    
                    const curve = new THREE.CatmullRomCurve3(points);
                    const tubeGeometry = new THREE.TubeGeometry(curve, 10, 0.15, 8, false);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0x00d4ff,
                        transparent: true,
                        opacity: 0.08
                    });
                    
                    const connection = new THREE.Mesh(tubeGeometry, material);
                    connection.userData = { fromIndex, toIndex: fromIndex + 1 };
                    
                    this.scene.add(connection);
                    this.connections.push(connection);
                }
            });
        });
    }
    
    highlightLayer(layerIndex) {
        this.layerNodes.forEach((group, index) => {
            group.children.forEach(node => {
                if (node.isMesh) {
                    if (index === layerIndex) {
                        // Highlight active layer
                        node.material.emissiveIntensity = 0.9;
                        node.material.opacity = 1;
                        node.scale.setScalar(1.4);
                    } else if (index < layerIndex) {
                        // Dim processed layers
                        node.material.emissiveIntensity = 0.2;
                        node.material.opacity = 0.5;
                        node.scale.setScalar(1);
                    } else {
                        // Very dim unprocessed layers
                        node.material.emissiveIntensity = 0.1;
                        node.material.opacity = 0.3;
                        node.scale.setScalar(0.9);
                    }
                }
            });
        });
        
        // Highlight connections
        this.connections.forEach(conn => {
            if (conn.userData.fromIndex === layerIndex - 1 && 
                conn.userData.toIndex === layerIndex) {
                conn.material.opacity = 0.3;
                conn.material.color.setHex(0x00ff88);
            } else {
                conn.material.opacity = 0.05;
                conn.material.color.setHex(0x00d4ff);
            }
        });
    }
    
    animateDataFlow(fromLayer, toLayer, callback) {
        const fromGroup = this.layerNodes[fromLayer];
        const toGroup = this.layerNodes[toLayer];
        
        if (!fromGroup || !toGroup) {
            if (callback) callback();
            return;
        }
        
        const particleCount = 40;
        const newParticles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const fromNode = fromGroup.children[Math.floor(Math.random() * fromGroup.children.length)];
            const toNode = toGroup.children[Math.floor(Math.random() * toGroup.children.length)];
            
            if (!fromNode || !toNode || !fromNode.position) continue;
            
            const geometry = new THREE.SphereGeometry(0.6, 12, 12);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.9
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(fromNode.position);
            
            particle.userData = {
                start: fromNode.position.clone(),
                end: toNode.position.clone(),
                progress: Math.random() * 0.15,
                speed: 0.015 + Math.random() * 0.01,
                tensorShape: this.getTensorShape(fromLayer, toLayer),
                dataSize: this.getDataSize(fromLayer, toLayer)
            };
            
            this.scene.add(particle);
            this.particles.push(particle);
            newParticles.push(particle);
        }
        
        // Update tensor shape display during animation
        this.updateTensorShapeDisplay(fromLayer, toLayer);
        
        // Animate particles
        const animateParticles = () => {
            let allDone = true;
            
            newParticles.forEach(particle => {
                if (particle.userData.progress < 1) {
                    particle.userData.progress += particle.userData.speed;
                    particle.position.lerpVectors(
                        particle.userData.start,
                        particle.userData.end,
                        Math.min(particle.userData.progress, 1)
                    );
                    
                    // Fade out near end
                    if (particle.userData.progress > 0.8) {
                        particle.material.opacity = 0.9 * (1 - (particle.userData.progress - 0.8) / 0.2);
                    }
                    
                    allDone = false;
                }
            });
            
            if (!allDone) {
                requestAnimationFrame(animateParticles);
            } else {
                // Clean up
                newParticles.forEach(p => {
                    this.scene.remove(p);
                    const index = this.particles.indexOf(p);
                    if (index > -1) this.particles.splice(index, 1);
                });
                if (callback) callback();
            }
        };
        
        animateParticles();
    }
    
    getTensorShape(fromLayer, toLayer) {
        const arch = AppState.getCurrentArch();
        const fromShape = arch.layers[fromLayer].outputShape;
        const toShape = arch.layers[toLayer].outputShape;
        return { from: fromShape, to: toShape };
    }
    
    getDataSize(fromLayer, toLayer) {
        const arch = AppState.getCurrentArch();
        const fromParams = arch.layers[fromLayer].params || 0;
        const toParams = arch.layers[toLayer].params || 0;
        return { from: fromParams, to: toParams };
    }
    
    updateTensorShapeDisplay(fromLayer, toLayer) {
        const tensorPreview = document.getElementById('tensor-preview');
        const tensorCanvas = document.getElementById('tensor-canvas');
        
        if (!tensorPreview || !tensorCanvas) return;
        
        const shapes = this.getTensorShape(fromLayer, toLayer);
        const sizes = this.getDataSize(fromLayer, toLayer);
        
        // Show tensor preview
        tensorPreview.style.display = 'block';
        
        // Draw tensor visualization
        const ctx = tensorCanvas.getContext('2d');
        const width = tensorCanvas.width = 200;
        const height = tensorCanvas.height = 120;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw tensor shapes
        this.drawTensorShape(ctx, shapes.from, 20, 30, '#00d4ff', 'Input');
        this.drawTensorShape(ctx, shapes.to, 120, 30, '#00ff88', 'Output');
        
        // Draw arrow
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(70, 60);
        ctx.lineTo(110, 60);
        ctx.stroke();
        
        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(110, 60);
        ctx.lineTo(105, 55);
        ctx.lineTo(105, 65);
        ctx.closePath();
        ctx.fillStyle = '#ff00ff';
        ctx.fill();
        
        // Add parameter info
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(`Params: ${sizes.from.toLocaleString()} → ${sizes.to.toLocaleString()}`, 20, 100);
        
        // Auto-hide after animation
        setTimeout(() => {
            if (tensorPreview.style.display === 'block') {
                tensorPreview.style.display = 'none';
            }
        }, 2000);
    }
    
    drawTensorShape(ctx, shape, x, y, color, label) {
        // Parse shape like "[T, 512]" or "[128]"
        const dimensions = shape.match(/\d+/g);
        if (!dimensions) return;
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        if (dimensions.length === 1) {
            // 1D tensor - draw as rectangle
            const size = Math.min(parseInt(dimensions[0]) / 10, 40);
            ctx.fillRect(x - size/2, y - size/4, size, size/2);
        } else if (dimensions.length === 2) {
            // 2D tensor - draw as 3D box
            const width = Math.min(parseInt(dimensions[1]) / 20, 30);
            const height = Math.min(parseInt(dimensions[0]) / 20, 20);
            
            // Front face
            ctx.fillRect(x - width/2, y - height/2, width, height);
            
            // 3D effect
            ctx.beginPath();
            ctx.moveTo(x - width/2, y - height/2);
            ctx.lineTo(x - width/2 + 5, y - height/2 - 5);
            ctx.lineTo(x + width/2 + 5, y - height/2 - 5);
            ctx.lineTo(x + width/2, y - height/2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + width/2, y - height/2);
            ctx.lineTo(x + width/2 + 5, y - height/2 - 5);
            ctx.lineTo(x + width/2 + 5, y + height/2 - 5);
            ctx.lineTo(x + width/2, y + height/2);
            ctx.stroke();
        }
        
        // Add label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 25);
        
        // Add shape text
        ctx.fillStyle = color;
        ctx.font = '9px monospace';
        ctx.fillText(shape, x, y + 35);
    }
    
    clearNetwork() {
        // Clear ALL objects from scene
        while(this.scene.children.length > 0) { 
            const child = this.scene.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            this.scene.remove(child); 
        }
        
        // Reset arrays
        this.layerNodes = [];
        this.connections = [];
        this.particles = [];
        this.vaeSamplingGroup = null;
        
        // Re-add lights after clearing
        this.setupLights();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        // Gentle auto-rotation
        this.scene.rotation.y += 0.0002;
        
        // Animate lights
        if (this.movingLights) {
            this.movingLights[0].position.x = Math.sin(time * 0.5) * 15;
            this.movingLights[1].position.z = Math.cos(time * 0.3) * 15;
            this.movingLights[2].position.y = Math.sin(time * 0.4) * 10;
        }
        
        // Pulse active nodes
        this.layerNodes.forEach(group => {
            group.children.forEach(node => {
                if (node.isMesh && node.material.emissiveIntensity > 0.7) {
                    node.material.emissiveIntensity = 0.8 + Math.sin(time * 4) * 0.15;
                    const scale = 1.4 + Math.sin(time * 4) * 0.05;
                    node.scale.setScalar(scale);
                }
            });
        });
        
        // Architecture-specific animations
        this.animateArchitectureSpecific(time);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    animateArchitectureSpecific(time) {
        const arch = AppState.currentArchitecture;
        
        if (arch === 'VAE' && this.vaeSamplingGroup) {
            // Animate VAE sampling particles
            this.vaeSamplingGroup.children.forEach(child => {
                if (child.userData.type === 'sampling-particle') {
                    // Gentle floating motion
                    const originalPos = child.userData.originalPosition;
                    const offsetX = Math.sin(time * 2 + child.position.x) * 0.1;
                    const offsetY = Math.cos(time * 1.5 + child.position.z) * 0.1;
                    const offsetZ = Math.sin(time * 1.8 + child.position.x) * 0.1;
                    
                    child.position.x = originalPos.x + offsetX;
                    child.position.y = originalPos.y + offsetY;
                    child.position.z = originalPos.z + offsetZ;
                    
                    // Pulsing opacity
                    child.material.opacity = 0.6 + Math.sin(time * 3 + child.position.x) * 0.2;
                }
            });
        } else if (arch === 'LSTM') {
            // Animate LSTM gates
            this.scene.traverse((child) => {
                if (child.userData.type === 'lstm-gate') {
                    // Pulsing based on gate type
                    const gateType = child.userData.gateType;
                    const phase = gateType === 'forget' ? 0 : 
                                 gateType === 'input' ? Math.PI/2 : 
                                 gateType === 'output' ? Math.PI : 3*Math.PI/2;
                    
                    const intensity = 0.3 + Math.sin(time * 2 + phase) * 0.2;
                    child.material.emissiveIntensity = intensity;
                    
                    // Scale pulsing
                    const scale = 1 + Math.sin(time * 3 + phase) * 0.1;
                    child.scale.setScalar(scale);
                }
            });
        } else if (arch === 'Transformer') {
            // Animate attention heads
            this.scene.traverse((child) => {
                if (child.userData.type === 'attention-head') {
                    // Rotating attention pattern
                    const headIndex = child.userData.headIndex;
                    const rotationOffset = (headIndex / 8) * Math.PI * 2;
                    child.rotation.y = rotationOffset + time * 0.5;
                    
                    // Pulsing based on head activity
                    const activity = Math.sin(time * 1.5 + headIndex * 0.5) * 0.3 + 0.7;
                    child.material.emissiveIntensity = activity;
                } else if (child.userData.type === 'qkv-node') {
                    // QKV nodes orbiting their attention head
                    const headIndex = child.userData.headIndex;
                    const qkvType = child.userData.qkvType;
                    const offset = qkvType === 'Q' ? 0 : qkvType === 'K' ? 2*Math.PI/3 : 4*Math.PI/3;
                    
                    const angle = time + offset + headIndex * 0.2;
                    const radius = 0.8;
                    const centerX = this.layerNodes[2].children[0].position.x;
                    const centerZ = this.layerNodes[2].children[0].position.z;
                    
                    child.position.x = centerX + Math.cos(angle) * radius;
                    child.position.z = centerZ + Math.sin(angle) * radius;
                } else if (child.userData.type === 'attention-connection') {
                    // Pulsing attention connections
                    const intensity = 0.2 + Math.sin(time * 2 + child.userData.headFrom * 0.3) * 0.1;
                    child.material.opacity = intensity;
                }
            });
        } else if (arch === 'Diffusion') {
            // Animate diffusion timesteps
            this.scene.traverse((child) => {
                if (child.userData.type === 'timestep') {
                    const timestep = child.userData.timestep;
                    const noiseLevel = child.userData.noiseLevel;
                    
                    // Pulsing based on noise level
                    const pulseSpeed = 1 + noiseLevel * 2;
                    const intensity = 0.3 + Math.sin(time * pulseSpeed + timestep * 0.5) * 0.2;
                    child.material.emissiveIntensity = intensity;
                    
                    // Vertical breathing motion
                    const breathOffset = Math.sin(time * pulseSpeed + timestep * 0.3) * 0.1;
                    child.position.y = -3 + breathOffset;
                } else if (child.userData.type === 'noise-particle') {
                    // Random noise particle motion
                    const speed = 0.5 + Math.random() * 0.5;
                    child.position.x += (Math.random() - 0.5) * 0.02 * speed;
                    child.position.y += (Math.random() - 0.5) * 0.02 * speed;
                    child.position.z += (Math.random() - 0.5) * 0.02 * speed;
                    
                    // Fade in/out
                    child.material.opacity = 0.4 * (0.5 + Math.sin(time * speed * 2) * 0.5);
                } else if (child.userData.type === 'forward-arrow') {
                    // Pulsing forward process arrows
                    const intensity = 0.7 + Math.sin(time * 3 + child.userData.from * 0.4) * 0.3;
                    child.material.opacity = intensity;
                }
            });
        }
    }
    
    // VAE-specific visualization for latent space sampling
    addVAELatentVisualization() {
        const latentIndex = 3; // Latent space layer index in VAE
        const latentGroup = this.layerNodes[latentIndex];
        if (!latentGroup) return;
        
        // Create sampling visualization around latent space
        const samplingGroup = new THREE.Group();
        
        // Add Gaussian distribution visualization
        const distributionGeometry = new THREE.SphereGeometry(2, 32, 32);
        const distributionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.1,
            wireframe: true
        });
        const distributionSphere = new THREE.Mesh(distributionGeometry, distributionMaterial);
        distributionSphere.position.set(latentGroup.children[0].position.x, 0, 0);
        samplingGroup.add(distributionSphere);
        
        // Add sampling particles
        for (let i = 0; i < 20; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = Math.random() * 1.5;
            
            const particleGeometry = new THREE.SphereGeometry(0.08, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.6
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                latentGroup.children[0].position.x + r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            
            particle.userData = { type: 'sampling-particle', originalPosition: particle.position.clone() };
            samplingGroup.add(particle);
        }
        
        // Add μ and σ labels
        this.createTextSprite('μ', latentGroup.children[0].position.x - 1, -3, 0);
        this.createTextSprite('σ', latentGroup.children[0].position.x + 1, -3, 0);
        
        this.scene.add(samplingGroup);
        this.vaeSamplingGroup = samplingGroup;
    }
    
    // LSTM-specific visualization for gates
    addLSTMGateVisualization() {
        const lstmLayers = [2, 3]; // LSTM layer indices
        
        lstmLayers.forEach((lstmIndex, layerNum) => {
            const lstmGroup = this.layerNodes[lstmIndex];
            if (!lstmGroup) return;
            
            const gateColors = {
                forget: 0xff4444,
                input: 0x44ff44,
                output: 0x4444ff,
                cell: 0xffff44
            };
            
            // Create gate visualization nodes
            const gateSpacing = 1.2;
            const startX = lstmGroup.children[0].position.x - 1.8;
            const z = lstmGroup.children[0].position.z;
            
            Object.entries(gateColors).forEach(([gateType, color], index) => {
                const gateGeometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);
                const gateMaterial = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.8
                });
                
                const gateNode = new THREE.Mesh(gateGeometry, gateMaterial);
                gateNode.position.set(startX + index * gateSpacing, -2.5, z);
                gateNode.userData = { type: 'lstm-gate', gateType, layerIndex: lstmIndex };
                
                this.scene.add(gateNode);
                
                // Add gate label
                const labelCanvas = document.createElement('canvas');
                const labelContext = labelCanvas.getContext('2d');
                labelCanvas.width = 128;
                labelCanvas.height = 32;
                
                labelContext.fillStyle = `${color.toString(16).padStart(6, '0')}`;
                labelContext.font = 'bold 14px Inter';
                labelContext.textAlign = 'center';
                labelContext.textBaseline = 'middle';
                labelContext.fillText(gateType.toUpperCase(), 64, 16);
                
                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
                const labelSprite = new THREE.Sprite(labelMaterial);
                
                labelSprite.position.set(startX + index * gateSpacing, -3.2, z);
                labelSprite.scale.set(1.5, 0.4, 1);
                
                this.scene.add(labelSprite);
            });
        });
    }
    
    // Transformer-specific visualization for attention heads
    addTransformerAttentionVisualization() {
        const attentionIndex = 2; // Multi-head attention layer index
        const attentionGroup = this.layerNodes[attentionIndex];
        if (!attentionGroup) return;
        
        const numHeads = 8;
        const headRadius = 1.5;
        const centerX = attentionGroup.children[0].position.x;
        const centerZ = attentionGroup.children[0].position.z;
        
        // Create attention head visualization
        for (let i = 0; i < numHeads; i++) {
            const angle = (i / numHeads) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * headRadius;
            const z = centerZ + Math.sin(angle) * headRadius;
            
            const headGeometry = new THREE.ConeGeometry(1.8, 3.5, 8);
            const headMaterial = new THREE.MeshPhongMaterial({
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0.9
            });
            
            const headNode = new THREE.Mesh(headGeometry, headMaterial);
            headNode.position.set(x, -2, z);
            headNode.rotation.y = -angle + Math.PI / 2;
            headNode.userData = { type: 'attention-head', headIndex: i, layerIndex: attentionIndex };
            
            this.scene.add(headNode);
            
            // Create Q, K, V visualization for each head
            const qkvGeometry = new THREE.SphereGeometry(0.8, 8, 8);
            const qkvColors = [0x00d4ff, 0x00ff88, 0xff6600];
            const qkvLabels = ['Q', 'K', 'V'];
            
            qkvColors.forEach((color, qkvIndex) => {
                const qkvMaterial = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.8
                });
                
                const qkvNode = new THREE.Mesh(qkvGeometry, qkvMaterial);
                const qkvAngle = angle + (qkvIndex - 1) * 0.3;
                const qkvRadius = 0.8;
                
                qkvNode.position.set(
                    centerX + Math.cos(qkvAngle) * qkvRadius,
                    -1.5,
                    centerZ + Math.sin(qkvAngle) * qkvRadius
                );
                
                qkvNode.userData = { type: 'qkv-node', qkvType: qkvLabels[qkvIndex], headIndex: i };
                this.scene.add(qkvNode);
            });
        }
        
        // Add attention score visualization (connecting lines)
        for (let i = 0; i < numHeads; i++) {
            for (let j = i + 1; j < numHeads; j++) {
                if (Math.random() < 0.3) { // Create sparse connections
                    const angle1 = (i / numHeads) * Math.PI * 2;
                    const angle2 = (j / numHeads) * Math.PI * 2;
                    
                    const points = [
                        new THREE.Vector3(
                            centerX + Math.cos(angle1) * headRadius,
                            -2,
                            centerZ + Math.sin(angle1) * headRadius
                        ),
                        new THREE.Vector3(
                            centerX + Math.cos(angle2) * headRadius,
                            -2,
                            centerZ + Math.sin(angle2) * headRadius
                        )
                    ];
                    
                    const curve = new THREE.CatmullRomCurve3(points);
                    const tubeGeometry = new THREE.TubeGeometry(curve, 8, 0.3, 4, false);
                    const tubeMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff00ff,
                        transparent: true,
                        opacity: 0.2
                    });
                    
                    const connection = new THREE.Mesh(tubeGeometry, tubeMaterial);
                    connection.userData = { type: 'attention-connection', headFrom: i, headTo: j };
                    
                    this.scene.add(connection);
                }
            }
        }
    }
    
    // Diffusion-specific visualization for denoising process
    addDiffusionProcessVisualization() {
        const timeSteps = 10;
        const radius = 3;
        const centerX = 0;
        const centerZ = 0;
        
        // Create circular timestep visualization
        for (let t = 0; t < timeSteps; t++) {
            const angle = (t / timeSteps) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            // Timestep node
            const stepGeometry = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 16);
            const noiseLevel = t / timeSteps;
            
            // Color gradient from clean (green) to noisy (red)
            const r = Math.floor(255 * noiseLevel);
            const g = Math.floor(255 * (1 - noiseLevel));
            const color = new THREE.Color(r / 255, g / 255, 0);
            
            const stepMaterial = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.9
            });
            
            const stepNode = new THREE.Mesh(stepGeometry, stepMaterial);
            stepNode.position.set(x, -3, z);
            stepNode.userData = { type: 'timestep', timestep: t, noiseLevel };
            
            this.scene.add(stepNode);
            
            // Add timestep label
            const labelCanvas = document.createElement('canvas');
            const labelContext = labelCanvas.getContext('2d');
            labelCanvas.width = 64;
            labelCanvas.height = 32;
            
            labelContext.fillStyle = '#ffffff';
            labelContext.font = 'bold 12px Inter';
            labelContext.textAlign = 'center';
            labelContext.textBaseline = 'middle';
            labelContext.fillText(`t=${t}`, 32, 16);
            
            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
            const labelSprite = new THREE.Sprite(labelMaterial);
            
            labelSprite.position.set(x, -3.8, z);
            labelSprite.scale.set(1, 0.5, 1);
            
            this.scene.add(labelSprite);
            
            // Create noise particles for each timestep
            const particleCount = Math.floor(20 * noiseLevel);
            for (let p = 0; p < particleCount; p++) {
                const particleGeometry = new THREE.SphereGeometry(0.25, 4, 4);
                const particleMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff6666,
                    transparent: true,
                    opacity: 0.4 * noiseLevel
                });
                
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                const offsetAngle = Math.random() * Math.PI * 2;
                const offsetRadius = Math.random() * 0.5;
                
                particle.position.set(
                    x + Math.cos(offsetAngle) * offsetRadius,
                    -3 + (Math.random() - 0.5) * 0.5,
                    z + Math.sin(offsetAngle) * offsetRadius
                );
                
                particle.userData = { type: 'noise-particle', timestep: t };
                this.scene.add(particle);
            }
        }
        
        // Add forward/reverse process arrows
        const arrowGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.7
        });
        
        // Forward process (clockwise)
        for (let t = 0; t < timeSteps; t++) {
            const angle1 = (t / timeSteps) * Math.PI * 2 - Math.PI / 2;
            const angle2 = ((t + 1) / timeSteps) * Math.PI * 2 - Math.PI / 2;
            
            const x1 = centerX + Math.cos(angle1) * (radius + 0.5);
            const z1 = centerZ + Math.sin(angle1) * (radius + 0.5);
            const x2 = centerX + Math.cos(angle2) * (radius + 0.5);
            const z2 = centerZ + Math.sin(angle2) * (radius + 0.5);
            
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());
            arrow.position.set((x1 + x2) / 2, -3, (z1 + z2) / 2);
            arrow.lookAt(x2, -3, z2);
            arrow.rotateX(Math.PI / 2);
            arrow.userData = { type: 'forward-arrow', from: t, to: (t + 1) % timeSteps };
            
            this.scene.add(arrow);
        }
    }
}
