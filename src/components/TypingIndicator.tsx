interface TypingIndicatorProps {
  className?: string;
}

export default function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  return (
    <span
      className={`typing-indicator typing-indicator--leading ${className}`.trim()}
      role="status"
      aria-label="BLACK AI is typing"
    >
      <span className="typing-indicator__dot typing-indicator__dot--green" />
      <span className="typing-indicator__dot typing-indicator__dot--white" />
      <span className="typing-indicator__dot typing-indicator__dot--green" />
    </span>
  );
}
