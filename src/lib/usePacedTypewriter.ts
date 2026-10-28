import { useEffect, useRef, useState, type RefObject } from 'react';

interface PacedTypewriterOptions {
  enabled?: boolean;
  isGenerating?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onComplete?: () => void;
}

// Word-by-word typewriter for smooth, readable pacing.
// Reveals one word at a time, with natural pauses at punctuation
// and longer pauses at paragraph breaks.
export function usePacedTypewriter(
  text: string,
  { enabled = true, isGenerating = false, scrollRef, onComplete }: PacedTypewriterOptions = {},
) {
  const [wordIndex, setWordIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const lastTextRef = useRef<string>('');
  const completedRef = useRef<string | null>(null);
  onCompleteRef.current = onComplete;

  // Tokenise the text into words while keeping the whitespace/newlines
  // so paragraph breaks are preserved in the displayed output.
  const tokens = useRef<string[]>([]);
  if (text !== lastTextRef.current) {
    lastTextRef.current = text;
    // Split into tokens: sequences of word characters + attached trailing whitespace/newlines.
    // This keeps paragraph structure intact.
    tokens.current = text.match(/\S+\s*/g) || [];
    completedRef.current = null;
  }

  const totalTokens = tokens.current.length;

  useEffect(() => {
    if (!enabled && !isGenerating) {
      setWordIndex(0);
      return;
    }

    if (!text) {
      setWordIndex(0);
      return;
    }

    // Already complete
    if (wordIndex >= totalTokens) return;

    const currentToken = tokens.current[wordIndex] || '';
    const lastChar = currentToken.trim().slice(-1);
    const trailingWhitespace = currentToken.slice(currentToken.trimEnd().length);

    // Natural pacing: pause longer after sentences and paragraphs.
    let delay = 95; // comfortable reading speed per word
    if (/[.!?]/.test(lastChar)) delay += 500; // end of sentence
    else if (/[,;:]/.test(lastChar)) delay += 220; // mid-sentence pause
    // Longer pause when the token ends a paragraph (contains a newline)
    if (trailingWhitespace.includes('\n')) delay += 450;

    const timer = window.setTimeout(() => {
      setWordIndex((i) => Math.min(i + 1, totalTokens));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [wordIndex, totalTokens, enabled, isGenerating, text]);

  // Auto-scroll the chat container so the newest text stays visible.
  useEffect(() => {
    const element = scrollRef?.current;
    if (!element) return;

    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 220;
    if (isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, [wordIndex, scrollRef]);

  // Fire onComplete once the full text has been revealed.
  useEffect(() => {
    if (!enabled && !isGenerating) return;
    if (!text) return;
    if (wordIndex < totalTokens) return;
    if (completedRef.current === text) return;
    completedRef.current = text;
    onCompleteRef.current?.();
  }, [wordIndex, totalTokens, enabled, isGenerating, text]);

  const displayedText = tokens.current.slice(0, wordIndex).join('');
  const visibleText = !enabled ? text : displayedText;
  const isComplete = wordIndex >= totalTokens;

  return { displayedText: visibleText, isComplete };
}
