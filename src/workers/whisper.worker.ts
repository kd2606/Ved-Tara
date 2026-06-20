import { pipeline, env, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

// Disable local models to fetch from HuggingFace, enable caching
env.allowLocalModels = false;
env.useBrowserCache = true;

class WhisperPipeline {
  static task: any = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-tiny';
  static instance: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

  static async getInstance(progress_callback?: any) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback }) as Promise<AutomaticSpeechRecognitionPipeline>;
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, audio } = event.data;

  if (type === 'INIT') {
    try {
      await WhisperPipeline.getInstance((progress: any) => {
        self.postMessage({ type: 'PROGRESS', progress });
      });
      self.postMessage({ type: 'READY' });
    } catch (error) {
      console.error("Whisper Init Error:", error);
      self.postMessage({ type: 'ERROR', error: String(error) });
    }
  }

  if (type === 'TRANSCRIBE' && audio) {
    try {
      const transcriber = await WhisperPipeline.getInstance();
      
      const result = await transcriber(audio, {
        task: 'transcribe',
      });
      
      self.postMessage({ type: 'RESULT', text: (result as any).text });
    } catch (error) {
      console.error("Whisper Transcribe Error:", error);
      self.postMessage({ type: 'ERROR', error: String(error) });
    }
  }
});
