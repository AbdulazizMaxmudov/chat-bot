import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const MessageBubble = ({ text, role }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const parseText = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => (
      <React.Fragment key={lineIdx}>
        {parseLine(line, role)}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const parseLine = (line, role) => {
    const parts = line.split(/(\*\*[\s\S]*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className={role === 'user' ? 'font-bold' : 'font-semibold text-gray-900'}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (role !== 'user') return renderWithNumberHighlights(part, idx);
      return <span key={idx}>{part}</span>;
    });
  };

  const renderWithNumberHighlights = (text, outerIdx) => {
    const segments = [];
    const regex = /(\d+\.\s)|(\b\d{3,}\b)/g;
    let last = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) segments.push(<span key={`t${outerIdx}-${last}`}>{text.slice(last, match.index)}</span>);
      segments.push(<span key={`n${outerIdx}-${match.index}`} className="text-purple-500 font-mono font-medium">{match[0]}</span>);
      last = match.index + match[0].length;
    }
    if (last < text.length) segments.push(<span key={`t${outerIdx}-end`}>{text.slice(last)}</span>);
    return <React.Fragment key={outerIdx}>{segments}</React.Fragment>;
  };

  return (
    <div className={`relative group max-w-[85%] sm:max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
      role === 'user'
        ? 'bg-gray-900 dark:bg-gray-700 text-white rounded-tr-sm'
        : 'bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm dark:shadow-none'
    } ${role !== 'user' ? 'pr-9' : ''}`}>
      {role !== 'user' && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1 rounded-md text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          title="Nusxalash sdfvfsdv"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
        </button>
      )}
      {parseText(text)}
    </div>
  );
};

export default MessageBubble;
