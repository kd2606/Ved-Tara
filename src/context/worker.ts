import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Hook up the WebWorkerMLCEngineHandler
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
