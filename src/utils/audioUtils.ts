export const trimSilence = async (
    audioBlob: Blob,
    threshold = 0.02 // ~ -34dB
): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Analyze first channel (usually sufficient for voice)
    const channelData = audioBuffer.getChannelData(0)
    const len = channelData.length

    // Find start (attack)
    let start = 0
    // Skip first few ms to avoid initial click/pop
    const initialSkip = Math.floor(audioBuffer.sampleRate * 0.05)
    for (let i = initialSkip; i < len; i++) {
        if (Math.abs(channelData[i]) > threshold) {
            start = i
            break
        }
    }

    // Find end (release)
    let end = len
    for (let i = len - 1; i > start; i--) {
        if (Math.abs(channelData[i]) > threshold) {
            end = i + 1 // Include this sample
            break
        }
    }

    // Add small buffer (padding) around the clip - e.g., 0.1s
    const padding = Math.floor(audioBuffer.sampleRate * 0.1)
    start = Math.max(0, start - padding)
    end = Math.min(len, end + padding)

    if (end <= start) {
        // If everything was silence, return original or a minimal empty clip
        console.warn('Trim logic found all silence, returning original')
        return audioBlob
    }

    const newLength = end - start
    const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        audioBuffer.sampleRate
    )

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        trimmedBuffer.copyToChannel(
            audioBuffer.getChannelData(i).subarray(start, end),
            i
        )
    }

    return bufferToWav(trimmedBuffer)
}

const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2 + 44
    const bufferArr = new ArrayBuffer(length)
    const view = new DataView(bufferArr)
    const channels = []
    let sample
    let offset = 0
    let pos = 0

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this writer)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < buffer.length) {
        for (let i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(44 + offset, sample, true);          // write 16-bit sample
            offset += 2;
        }
        pos++;
    }

    // helper to write strings not needed if we use hex, but easier to just use hex constants
    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    return new Blob([bufferArr], { type: 'audio/wav' });
}
