import { useState } from 'react';
import './roombar.css';

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => setCopied(false));
  };
  return [copied, copy];
}

export function RoomBar({ code }: { code: string }) {
  const [codeCopied, copyCode] = useCopy();
  const [linkCopied, copyLink] = useCopy();
  const link = `${window.location.origin}/?room=${code}`;

  return (
    <div className="roombar">
      <div className="roombar__code">
        <span className="eyebrow">Room code</span>
        <span className="roombar__value mono">{code}</span>
      </div>
      <div className="roombar__actions">
        <button className="roombar__btn" onClick={() => copyCode(code)}>
          {codeCopied ? 'Copied' : 'Copy code'}
        </button>
        <button className="roombar__btn" onClick={() => copyLink(link)}>
          {linkCopied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
