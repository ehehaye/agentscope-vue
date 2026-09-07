/**
 * Streaming audio playback support for assistant DataBlocks.
 */

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function parseWavHeader(bytes) {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, false) !== 0x52494646 || view.getUint32(8, false) !== 0x57415645) {
    return null;
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;

  while (offset + 8 <= bytes.length) {
    const chunkId = view.getUint32(offset, false);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkBody = offset + 8;

    if (chunkId === 0x666d7420 /* "fmt " */) {
      if (chunkBody + 16 > bytes.length) return null;
      channels = view.getUint16(chunkBody + 2, true);
      sampleRate = view.getUint32(chunkBody + 4, true);
      bitsPerSample = view.getUint16(chunkBody + 14, true);
    } else if (chunkId === 0x64617461 /* "data" */) {
      dataOffset = chunkBody;
      break;
    }
    offset = chunkBody + chunkSize;
  }

  if (!sampleRate || !channels || !bitsPerSample || dataOffset < 0) return null;
  return { sampleRate, channels, bitsPerSample, dataOffset };
}

function pcmToAudioBuffer(ctx, pcm, header) {
  const { channels, bitsPerSample, sampleRate } = header;
  const bytesPerSample = bitsPerSample / 8;
  const frameSize = bytesPerSample * channels;
  const frameCount = Math.floor(pcm.length / frameSize);
  if (frameCount === 0) return null;

  const buffer = ctx.createBuffer(channels, frameCount, sampleRate);
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);

  for (let ch = 0; ch < channels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      const sampleOffset = i * frameSize + ch * bytesPerSample;
      if (bitsPerSample === 16) {
        channelData[i] = view.getInt16(sampleOffset, true) / 0x8000;
      } else if (bitsPerSample === 8) {
        channelData[i] = (view.getUint8(sampleOffset) - 128) / 128;
      } else {
        channelData[i] = 0;
      }
    }
  }
  return buffer;
}

class WavStreamPlayer {
  constructor() {
    this.ctx = null;
    this.header = null;
    this.pending = new Uint8Array(0);
    this.nextStartTime = 0;
    this.failed = false;
    this.deferredCloseTimer = null;
  }

  append(chunk) {
    if (this.failed) return;
    this.pending = concatBytes(this.pending, chunk);

    if (!this.header) {
      const header = parseWavHeader(this.pending);
      if (!header) return;
      this.header = header;
      try {
        this.ctx = new AudioContext({ sampleRate: header.sampleRate });
        if (this.ctx.state === 'suspended') {
          void this.ctx.resume();
        }
        this.nextStartTime = this.ctx.currentTime;
      } catch {
        this.failed = true;
        return;
      }
      this.pending = this.pending.slice(header.dataOffset);
    }

    if (!this.ctx || !this.header) return;

    const frameSize = (this.header.bitsPerSample / 8) * this.header.channels;
    const playableBytes = Math.floor(this.pending.length / frameSize) * frameSize;
    if (playableBytes === 0) return;

    const toPlay = this.pending.slice(0, playableBytes);
    this.pending = this.pending.slice(playableBytes);

    const audioBuffer = pcmToAudioBuffer(this.ctx, toPlay, this.header);
    if (!audioBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);
    const startAt = Math.max(this.nextStartTime, this.ctx.currentTime);
    source.start(startAt);
    this.nextStartTime = startAt + audioBuffer.duration;
  }

  finalize() {
    if (!this.ctx || this.failed) {
      this.dispose();
      return;
    }
    const remainingMs = Math.max(0, this.nextStartTime - this.ctx.currentTime) * 1000;
    this.deferredCloseTimer = setTimeout(() => {
      this.dispose();
    }, remainingMs + 200);
    this.header = null;
    this.pending = new Uint8Array(0);
  }

  dispose() {
    if (this.deferredCloseTimer) {
      clearTimeout(this.deferredCloseTimer);
      this.deferredCloseTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.pending = new Uint8Array(0);
    this.header = null;
  }
}

export class StreamingAudioManager {
  constructor() {
    this.sessions = new Map();
    this.listeners = new Map();
  }

  emit(blockId) {
    this.listeners.get(blockId)?.forEach((fn) => fn());
  }

  subscribe(blockId, fn) {
    let set = this.listeners.get(blockId);
    if (!set) {
      set = new Set();
      this.listeners.set(blockId, set);
    }
    set.add(fn);
    return () => {
      set?.delete(fn);
      if (set && set.size === 0) this.listeners.delete(blockId);
    };
  }

  getState(blockId) {
    return this.sessions.get(blockId)?.state ?? null;
  }

  start(blockId, mediaType) {
    if (this.sessions.has(blockId)) return;
    const livePlayer = mediaType === 'audio/wav' ? new WavStreamPlayer() : null;
    this.sessions.set(blockId, {
      mediaType,
      chunks: [],
      totalBytes: 0,
      livePlayer,
      hadLivePlayer: livePlayer !== null,
      state: { status: 'streaming', mediaType, url: null, interruptCount: 0 },
    });
    this.emit(blockId);
  }

  append(blockId, data) {
    const session = this.sessions.get(blockId);
    if (!session || !data) return;
    let bytes;
    try {
      bytes = base64ToBytes(data);
    } catch {
      return;
    }
    session.chunks.push(bytes);
    session.totalBytes += bytes.length;
    session.livePlayer?.append(bytes);
  }

  end(blockId) {
    const session = this.sessions.get(blockId);
    if (!session) return;

    const hadLivePlayback = session.hadLivePlayer;
    if (session.livePlayer) {
      session.livePlayer.finalize();
    }

    const blob = new Blob(session.chunks, { type: session.mediaType });
    const url = URL.createObjectURL(blob);
    session.chunks = [];

    session.state = {
      status: 'ready',
      mediaType: session.mediaType,
      url,
      interruptCount: session.state.interruptCount,
    };
    this.emit(blockId);

    if (!hadLivePlayback) {
      const el = new Audio(url);
      void el.play().catch(() => undefined);
    }
  }

  stopLivePlayback() {
    for (const session of this.sessions.values()) {
      if (session.livePlayer) {
        session.livePlayer.dispose();
        session.livePlayer = null;
      }
    }
  }

  stopAllPlayback() {
    for (const [blockId, session] of this.sessions) {
      if (session.livePlayer) {
        session.livePlayer.dispose();
        session.livePlayer = null;
      }
      session.state = {
        ...session.state,
        interruptCount: session.state.interruptCount + 1,
      };
      this.emit(blockId);
    }
  }

  dispose(blockId) {
    const session = this.sessions.get(blockId);
    if (!session) return;
    session.livePlayer?.dispose();
    if (session.state.url) URL.revokeObjectURL(session.state.url);
    this.sessions.delete(blockId);
    this.listeners.delete(blockId);
  }

  disposeAll() {
    for (const id of [...this.sessions.keys()]) this.dispose(id);
  }
}
