export class RingtoneService {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private timer: any = null;

  private frequencies = [880, 1046, 1318, 1046];
  private noteDuration = 0.15;
  private patternGap = 0.3;

  constructor() {}

  private initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.initAudio();

    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.playPattern();
  }

  private playPattern() {
    if (!this.isPlaying || !this.audioCtx) return;

    const startTime = this.audioCtx.currentTime;
    
    this.frequencies.forEach((freq, index) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + index * this.noteDuration);

      gain.gain.setValueAtTime(0, startTime + index * this.noteDuration);
      gain.gain.linearRampToValueAtTime(0.2, startTime + index * this.noteDuration + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (index + 1) * this.noteDuration);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);

      osc.start(startTime + index * this.noteDuration);
      osc.stop(startTime + (index + 1) * this.noteDuration);
    });

    const totalPatternDuration = this.frequencies.length * this.noteDuration;
    this.timer = setTimeout(() => {
      if (this.isPlaying) {
        this.playPattern();
      }
    }, (totalPatternDuration + this.patternGap) * 1000);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public playNotificationTone() {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      [1046, 0.08],
      [1318, 0.12],
      [1046, 0.08]
    ];
    let t = ctx.currentTime + 0.01;
    notes.forEach(([freq, dur]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0.3, t);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.start(t);
      o.stop(t + dur + 0.01);
      t += dur + 0.02;
    });
  }
}

export const ringtone = new RingtoneService();
