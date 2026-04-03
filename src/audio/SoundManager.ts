export class SoundManager {
  private ctx: AudioContext;

  constructor() {
    this.ctx = new AudioContext();
  }

  resume(): void {
    void this.ctx.resume();
  }

  playBlockBreak(): void {
    const now = this.ctx.currentTime;

    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.05));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.1);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playBlockPlace(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playFootstep(): void {
    const now = this.ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.02));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const noise = Math.random() * 2 - 1;
      const envelope = 1 - i / bufferSize;
      data[i] = noise * envelope * 0.14;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(220, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
    source.stop(now + 0.04);
  }

  playJump(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playWShift(): void {
    const now = this.ctx.currentTime;

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.type = 'triangle';
    oscB.type = 'sine';
    oscA.frequency.setValueAtTime(180, now);
    oscB.frequency.setValueAtTime(186, now);
    oscA.frequency.exponentialRampToValueAtTime(260, now + 0.3);
    oscB.frequency.exponentialRampToValueAtTime(268, now + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    const reverbish = this.ctx.createBiquadFilter();
    reverbish.type = 'bandpass';
    reverbish.frequency.setValueAtTime(900, now);
    reverbish.Q.setValueAtTime(1.8, now);

    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(reverbish);
    reverbish.connect(this.ctx.destination);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + 0.32);
    oscB.stop(now + 0.32);
  }
}
