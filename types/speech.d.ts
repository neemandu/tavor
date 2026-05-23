interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
interface ISpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [i: number]: ISpeechRecognitionAlternative;
}
interface ISpeechRecognitionResultList {
  readonly length: number;
  [i: number]: ISpeechRecognitionResult;
}
interface ISpeechRecognitionEvent {
  results: ISpeechRecognitionResultList;
}
interface Window {
  SpeechRecognition: new () => ISpeechRecognition;
  webkitSpeechRecognition: new () => ISpeechRecognition;
}
