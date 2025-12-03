class AudioPlayer {
    constructor() {
        this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: 'triangle'
            },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.3,
                release: 0.5
            }
        }).toDestination();
        
        // Add effects
        this.reverb = new Tone.Reverb({
            decay: 2,
            wet: 0.3
        }).toDestination();
        
        this.synth.connect(this.reverb);
        
        this.isPlaying = false;
        this.currentPart = null;
    }
    
    async play(notes) {
        if (!notes || notes.length === 0) {
            console.warn('No notes to play');
            return;
        }
        
        await Tone.start();
        this.stop(); // Stop any current playback
        
        // Create a new Part for scheduling
        this.currentPart = new Tone.Part((time, note) => {
            this.synth.triggerAttackRelease(
                this.midiToNote(note.pitch),
                note.duration,
                time,
                note.velocity
            );
        }, notes.map(note => ({
            time: note.time,
            pitch: note.pitch,
            duration: note.duration,
            velocity: note.velocity
        }))).start(0);
        
        Tone.Transport.start();
        this.isPlaying = true;
        
        // Auto-stop after sequence
        const duration = notes[notes.length - 1].time + notes[notes.length - 1].duration;
        setTimeout(() => {
            this.stop();
        }, duration * 1000 + 500);
    }
    
    stop() {
        if (this.currentPart) {
            this.currentPart.stop();
            this.currentPart.dispose();
            this.currentPart = null;
        }
        Tone.Transport.stop();
        Tone.Transport.cancel();
        this.synth.releaseAll();
        this.isPlaying = false;
    }
    
    midiToNote(midi) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        return notes[noteIndex] + octave;
    }
}
