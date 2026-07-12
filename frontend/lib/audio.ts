import { fetchTTS } from "./api";

let currentAudio: HTMLAudioElement | null = null;

/** Metni seslendirir ve hemen oynatır — tek tık, medya barı yok. */
export async function speak(text: string, slow = false): Promise<void> {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const blob = await fetchTTS(text, slow);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}
