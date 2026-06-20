import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start(250); // timeslice for frequent chunks
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Float32Array | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current) {
        resolve(null);
        return;
      }

      mediaRecorder.current.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());

        // Convert Blob to Float32Array at 16000Hz (required by Transformers.js Whisper)
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          // OfflineAudioContext is safer for pure decoding without playing
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const float32Array = audioBuffer.getChannelData(0);
          resolve(float32Array);
        } catch (err) {
          console.error("Audio decoding failed:", err);
          resolve(null);
        }
      };

      mediaRecorder.current.stop();
    });
  }, []);

  return { isRecording, startRecording, stopRecording };
}
