"use client";

export function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
      }}
    >
      Copy Token
    </button>
  );
}
