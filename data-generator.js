class DataGenerator {
    constructor() {
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }
    
    generateInput(type) {
        switch(type) {
            case 'random':
                return this.generateRandom();
            case 'scale':
                return this.generateScale();
            case 'chord':
                return this.generateChords();
            default:
                return this.generateRandom();
        }
    }
    
    generateRandom() {
        const notes = [];
        const length = 32;
        const baseNote = 60;
        
        for (let i = 0; i < length; i++) {
            const pitch = baseNote + Math.floor(Math.random() * 25) - 12;
            notes.push({
                pitch: Math.max(36, Math.min(96, pitch)),
                time: i * 0.25,
                duration: 0.25,
                velocity: Math.random() * 0.4 + 0.6
            });
        }
        
        return notes;
    }
    
    generateScale() {
        const notes = [];
        const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C major
        
        // Ascending
        scale.forEach((pitch, i) => {
            notes.push({
                pitch: pitch,
                time: i * 0.25,
                duration: 0.25,
                velocity: 0.8
            });
        });
        
        // Descending
        [...scale].reverse().forEach((pitch, i) => {
            notes.push({
                pitch: pitch,
                time: (scale.length + i) * 0.25,
                duration: 0.25,
                velocity: 0.8
            });
        });
        
        return notes;
    }
    
    generateChords() {
        const notes = [];
        const chords = [
            [60, 64, 67],      // C major
            [65, 69, 72],      // F major
            [67, 71, 74],      // G major
            [60, 64, 67]       // C major
        ];
        
        chords.forEach((chord, chordIdx) => {
            chord.forEach(pitch => {
                notes.push({
                    pitch: pitch,
                    time: chordIdx * 1.0,
                    duration: 1.0,
                    velocity: 0.75
                });
            });
        });
        
        return notes;
    }
    
    processLayer(layerIndex, inputData) {
        const arch = AppState.getCurrentArch();
        const layer = arch.layers[layerIndex];
        
        // Simulate layer processing with realistic transformations
        let outputData;
        
        switch(layer.type) {
            case 'input':
                outputData = inputData;
                break;
            case 'conv':
            case 'deconv':
                outputData = this.applyConvolution(inputData, layerIndex);
                break;
            case 'lstm':
                outputData = this.applyLSTM(inputData);
                break;
            case 'latent':
                outputData = this.applyLatentSampling(inputData);
                break;
            case 'attention':
                outputData = this.applyAttention(inputData);
                break;
            case 'time':
                outputData = this.applyTimeEmbedding();
                break;
            default:
                outputData = this.applyGenericTransform(inputData, layerIndex);
        }
        
        return {
            layer: layer.name,
            type: layer.type,
            data: outputData,
            activation: this.generateActivationMap(layerIndex)
        };
    }
    
    applyConvolution(data, layerIndex) {
        // Simulate convolution
        return data.map(note => ({
            ...note,
            features: Array(32).fill(0).map(() => Math.random())
        }));
    }
    
    applyLSTM(data) {
        // Simulate LSTM processing
        return data.map(note => ({
            ...note,
            hidden: Math.random(),
            cell: Math.random()
        }));
    }
    
    applyLatentSampling(data) {
        // Sample from latent distribution
        const latentDim = AppState.latentDim;
        return {
            mu: Array(latentDim).fill(0).map(() => Math.random() * 2 - 1),
            sigma: Array(latentDim).fill(0).map(() => Math.random()),
            z: Array(latentDim).fill(0).map(() => Math.random() * 2 - 1)
        };
    }
    
    applyAttention(data) {
        return data.map(note => ({
            ...note,
            attention: Math.random()
        }));
    }
    
    applyTimeEmbedding() {
        return {
            timestep: Math.random(),
            embedding: Array(256).fill(0).map(() => Math.random())
        };
    }
    
    applyGenericTransform(data, layerIndex) {
        const temp = AppState.temperature;
        
        // Check if data is an array, if not convert it
        if (!Array.isArray(data)) {
            // Handle different data types
            if (data && typeof data === 'object') {
                if (data.embedding) {
                    // Handle embedding objects
                    return data.embedding.map(val => ({
                        pitch: val * 127, // Convert to MIDI range
                        velocity: 0.8,
                        duration: 0.5
                    }));
                } else if (data.timestep !== undefined) {
                    // Handle timestep objects
                    return Array(88).fill(0).map((_, i) => ({
                        pitch: i + 21,
                        velocity: data.timestep,
                        duration: 0.5
                    }));
                }
            }
            
            // Fallback: create default array
            return Array(88).fill(0).map((_, i) => ({
                pitch: i + 21,
                velocity: 0.5,
                duration: 0.5
            }));
        }
        
        // Original array processing
        return data.map(note => ({
            ...note,
            pitch: note.pitch + (Math.random() - 0.5) * temp * 2,
            velocity: Math.min(1, Math.max(0, note.velocity + (Math.random() - 0.5) * 0.2))
        }));
    }
    
    generateActivationMap(layerIndex) {
        // Generate heatmap data for tensor visualization
        const size = 16;
        const map = [];
        
        for (let i = 0; i < size; i++) {
            const row = [];
            for (let j = 0; j < size; j++) {
                const value = Math.random() * 0.7 + 0.3 * Math.sin((i + j) * 0.5 + layerIndex);
                row.push(Math.max(0, Math.min(1, value)));
            }
            map.push(row);
        }
        
        return map;
    }
    
    generateOutput(latentData) {
        // Generate final output from latent representation
        const notes = [];
        const length = 32;
        const temp = AppState.temperature;
        
        for (let i = 0; i < length; i++) {
            const pitch = 60 + Math.floor((Math.random() * temp * 24) - 12);
            notes.push({
                pitch: Math.max(36, Math.min(96, pitch)),
                time: i * 0.25,
                duration: 0.25,
                velocity: Math.random() * 0.4 + 0.6
            });
        }
        
        return notes;
    }
}
