// Global Application State
const AppState = {
    // Current architecture
    currentArchitecture: 'VAE',
    
    // Input data
    inputData: null,
    inputNotes: [],
    
    // Layer outputs
    layerOutputs: [],
    
    // Current step
    currentStep: 0,
    totalSteps: 0,
    
    // Animation
    isAnimating: false,
    isAutoPlaying: false,
    animationSpeed: 1.0,
    
    // Parameters
    temperature: 1.0,
    latentDim: 128,
    
    // Output data
    outputNotes: [],
    
    // Architecture definitions
    architectures: {
        VAE: {
            name: 'Variational Autoencoder',
            layers: [
                {
                    name: 'Input Layer',
                    type: 'input',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 88]',
                    operation: 'Input(piano_roll)',
                    color: 0x00d4ff,
                    params: 0,
                    formula: 'X ∈ ℝ^(T×88)',
                    description: 'Piano roll input representation with 88 piano keys over time'
                },
                {
                    name: 'Encoder Conv1',
                    type: 'conv',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 256]',
                    operation: 'Conv1D(filters=256, kernel=3)',
                    color: 0x0099ff,
                    params: 67840,
                    formula: 'h₁ = ReLU(W₁ ∗ X + b₁)',
                    description: 'First convolutional layer extracts low-level musical features like note patterns'
                },
                {
                    name: 'Encoder Conv2',
                    type: 'conv',
                    inputShape: '[T, 256]',
                    outputShape: '[T, 512]',
                    operation: 'Conv1D(filters=512, kernel=3)',
                    color: 0x0066ff,
                    params: 393728,
                    formula: 'h₂ = ReLU(W₂ ∗ h₁ + b₂)',
                    description: 'Second convolutional layer captures higher-level musical structures and motifs'
                },
                {
                    name: 'Latent Space (μ, σ)',
                    type: 'latent',
                    inputShape: '[T, 512]',
                    outputShape: '[128]',
                    operation: 'Dense(128) + Sampling',
                    color: 0xff00ff,
                    params: 131200,
                    formula: 'z ~ N(μ(h₂), σ²(h₂))',
                    description: 'Compressed latent representation with stochastic sampling for variation'
                },
                {
                    name: 'Decoder Dense',
                    type: 'dense',
                    inputShape: '[128]',
                    outputShape: '[T, 512]',
                    operation: 'Dense(T×512) + Reshape',
                    color: 0xff6600,
                    params: 131584,
                    formula: 'h₃ = ReLU(W₃z + b₃)',
                    description: 'Expands latent vector back to sequence representation'
                },
                {
                    name: 'Decoder Conv1',
                    type: 'deconv',
                    inputShape: '[T, 512]',
                    outputShape: '[T, 256]',
                    operation: 'ConvTranspose1D(filters=256)',
                    color: 0xff9900,
                    params: 393472,
                    formula: 'h₄ = ReLU(W₄ᵀ ∗ h₃ + b₄)',
                    description: 'First decoder layer reconstructs musical structure'
                },
                {
                    name: 'Output Layer',
                    type: 'output',
                    inputShape: '[T, 256]',
                    outputShape: '[T, 88]',
                    operation: 'ConvTranspose1D(filters=88) + Sigmoid',
                    color: 0x00ff88,
                    params: 67672,
                    formula: 'Y = σ(W₅ᵀ ∗ h₄ + b₅)',
                    description: 'Final layer generates piano roll output with note probabilities'
                }
            ]
        },
        LSTM: {
            name: 'LSTM Recurrent Network',
            layers: [
                {
                    name: 'Input Sequence',
                    type: 'input',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 88]',
                    operation: 'Input(sequence)',
                    color: 0x00d4ff,
                    params: 0,
                    formula: 'X = [x₁, x₂, ..., xₜ]',
                    description: 'Sequential input where each timestep is a piano roll frame'
                },
                {
                    name: 'Embedding Layer',
                    type: 'embedding',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 256]',
                    operation: 'Dense(256)',
                    color: 0x00aaff,
                    params: 22784,
                    formula: 'e = Wx + b',
                    description: 'Embeds discrete notes into continuous vector space'
                },
                {
                    name: 'LSTM Layer 1',
                    type: 'lstm',
                    inputShape: '[T, 256]',
                    outputShape: '[T, 256]',
                    operation: 'LSTM(units=256, return_seq=True)',
                    color: 0x0066ff,
                    params: 525312,
                    formula: 'hₜ = LSTM(hₜ₋₁, xₜ)',
                    description: 'First LSTM processes sequence while maintaining hidden state'
                },
                {
                    name: 'LSTM Layer 2',
                    type: 'lstm',
                    inputShape: '[T, 256]',
                    outputShape: '[T, 256]',
                    operation: 'LSTM(units=256, return_seq=True)',
                    color: 0x3366ff,
                    params: 525312,
                    formula: 'h\'ₜ = LSTM(h\'ₜ₋₁, hₜ)',
                    description: 'Second LSTM layer captures longer-term dependencies'
                },
                {
                    name: 'Output Projection',
                    type: 'output',
                    inputShape: '[T, 256]',
                    outputShape: '[T, 88]',
                    operation: 'Dense(88) + Softmax',
                    color: 0x00ff88,
                    params: 22616,
                    formula: 'Y = softmax(Wh + b)',
                    description: 'Projects LSTM output to piano roll with note probabilities'
                }
            ]
        },
        Transformer: {
            name: 'Transformer Architecture',
            layers: [
                {
                    name: 'Input Embedding',
                    type: 'input',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 512]',
                    operation: 'Embedding(512)',
                    color: 0x00d4ff,
                    params: 45056,
                    formula: 'E = Embed(X)',
                    description: 'Embeds input tokens into high-dimensional space'
                },
                {
                    name: 'Positional Encoding',
                    type: 'positional',
                    inputShape: '[T, 512]',
                    outputShape: '[T, 512]',
                    operation: 'AddPosEncoding',
                    color: 0x0099ff,
                    params: 0,
                    formula: 'PE(pos,2i) = sin(pos/10000^(2i/d))',
                    description: 'Adds positional information since Transformer has no inherent sequence order'
                },
                {
                    name: 'Multi-Head Attention',
                    type: 'attention',
                    inputShape: '[T, 512]',
                    outputShape: '[T, 512]',
                    operation: 'MultiHeadAttention(heads=8)',
                    color: 0xff00ff,
                    params: 1049600,
                    formula: 'Attention(Q,K,V) = softmax(QKᵀ/√d)V',
                    description: 'Self-attention mechanism allows each position to attend to all positions'
                },
                {
                    name: 'Feed Forward Network',
                    type: 'ffn',
                    inputShape: '[T, 512]',
                    outputShape: '[T, 512]',
                    operation: 'FFN(2048→512)',
                    color: 0xff6600,
                    params: 2099200,
                    formula: 'FFN(x) = ReLU(W₁x + b₁)W₂ + b₂',
                    description: 'Position-wise feed-forward network applied to each position independently'
                },
                {
                    name: 'Output Projection',
                    type: 'output',
                    inputShape: '[T, 512]',
                    outputShape: '[T, 88]',
                    operation: 'Linear(88)',
                    color: 0x00ff88,
                    params: 45144,
                    formula: 'Y = Wx + b',
                    description: 'Final linear projection to output vocabulary (88 piano keys)'
                }
            ]
        },
        Diffusion: {
            name: 'Diffusion Model',
            layers: [
                {
                    name: 'Noisy Input',
                    type: 'input',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 88]',
                    operation: 'AddNoise(t, β)',
                    color: 0xff0000,
                    params: 0,
                    formula: 'xₜ = √ᾱₜx₀ + √(1-ᾱₜ)ε',
                    description: 'Input with Gaussian noise added according to diffusion schedule at timestep t'
                },
                {
                    name: 'Time Embedding',
                    type: 'time',
                    inputShape: '[1]',
                    outputShape: '[256]',
                    operation: 'SinusoidalPosEmbed(t)',
                    color: 0xff6600,
                    params: 0,
                    formula: 'tₑ = [sin(t·ω), cos(t·ω)]',
                    description: 'Embeds timestep information to condition the model on noise level'
                },
                {
                    name: 'U-Net Downsampling',
                    type: 'down',
                    inputShape: '[T, 88]',
                    outputShape: '[T/2, 512]',
                    operation: 'Conv2D(512) + Downsample',
                    color: 0xff9900,
                    params: 451584,
                    formula: 'h↓ = Conv(xₜ, tₑ)',
                    description: 'Downsampling path extracts features at multiple scales'
                },
                {
                    name: 'Bottleneck',
                    type: 'bottleneck',
                    inputShape: '[T/2, 512]',
                    outputShape: '[T/4, 1024]',
                    operation: 'ResBlock(1024) + Attention',
                    color: 0xff00ff,
                    params: 2099200,
                    formula: 'h = ResBlock(h↓) + Attn(h↓)',
                    description: 'Bottleneck with residual connections and self-attention'
                },
                {
                    name: 'U-Net Upsampling',
                    type: 'up',
                    inputShape: '[T/4, 1024]',
                    outputShape: '[T/2, 512]',
                    operation: 'ConvTranspose2D(512) + Skip',
                    color: 0x00d4ff,
                    params: 2098176,
                    formula: 'h↑ = ConvT(h, skip)',
                    description: 'Upsampling path reconstructs with skip connections from downsampling'
                },
                {
                    name: 'Noise Prediction',
                    type: 'predict',
                    inputShape: '[T/2, 512]',
                    outputShape: '[T, 88]',
                    operation: 'Conv2D(88) + Upsample',
                    color: 0x0099ff,
                    params: 225280,
                    formula: 'ε̂ = fθ(xₜ, t)',
                    description: 'Predicts the noise component that was added to the input'
                },
                {
                    name: 'Denoised Output',
                    type: 'output',
                    inputShape: '[T, 88]',
                    outputShape: '[T, 88]',
                    operation: 'x₀ = (xₜ - √(1-ᾱₜ)ε̂) / √ᾱₜ',
                    color: 0x00ff88,
                    params: 0,
                    formula: 'x̂₀ = Denoise(xₜ, ε̂, t)',
                    description: 'Removes predicted noise to recover clean music signal'
                }
            ]
        }
    },
    
    // Get current architecture
    getCurrentArch() {
        return this.architectures[this.currentArchitecture];
    },
    
    // Reset state
    reset() {
        this.currentStep = 0;
        this.layerOutputs = [];
        this.outputNotes = [];
        this.isAnimating = false;
    }
};
