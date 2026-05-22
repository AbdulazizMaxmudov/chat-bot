
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
    /**
     * Parse text into styled spans:
     * - **bold** → neon-blue glow (AI) / extra-bold (user)
     * - Numbers at start of line (list items: "1. ", "2. ") → highlighted
     * - Inline numbers → subtle accent color
     * Renders newlines as <br/> for proper paragraph spacing
     */
    const parseText = (content) => {
        if (!content) return null;

        const lines = content.split('\n');

        return lines.map((line, lineIdx) => {
            // Parse each line for bold and number markers
            const segments = parseLine(line, role);
            return (
                <React.Fragment key={lineIdx}>
                    {segments}
                    {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
            );
        });
    };

    const parseLine = (line, role) => {
        // Split by **bold** patterns
        const parts = line.split(/(\*\*[\s\S]*?\*\*)/g);

        return parts.map((part, idx) => {
            // Bold text
            if (part.startsWith('**') && part.endsWith('**')) {
                const inner = part.slice(2, -2);
                const boldClass = role === 'user'
                    ? 'font-black'
                    : 'text-neon-blue font-semibold drop-shadow-glow-sm';
                return <strong key={idx} className={boldClass}>{inner}</strong>;
            }

            // For AI messages: highlight list-item numbers "1. " and inline numbers
            if (role !== 'user') {
                return renderWithNumberHighlights(part, idx);
            }

            return <span key={idx}>{part}</span>;
        });
    };

    const renderWithNumberHighlights = (text, outerIdx) => {
        // Match: "1. ", "12. " at start, or standalone numbers like "541"
        const segments = [];
        // Pattern: digits followed by period+space (list numbering) OR standalone number words
        const regex = /(\d+\.\s)|(\b\d{3,}\b)/g;
        let last = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > last) {
                segments.push(<span key={`t${outerIdx}-${last}`}>{text.slice(last, match.index)}</span>);
            }
            segments.push(
                <span
                    key={`n${outerIdx}-${match.index}`}
                    className="text-sky-300 font-mono font-semibold"
                >
                    {match[0]}
                </span>
            );
            last = match.index + match[0].length;
        }
        if (last < text.length) {
            segments.push(<span key={`t${outerIdx}-end`}>{text.slice(last)}</span>);
        }

        return <React.Fragment key={outerIdx}>{segments}</React.Fragment>;
    };

    return (
        <div className={`relative group max-w-[85%] sm:max-w-[70%] p-2.5 sm:p-3 px-3.5 sm:px-4 ${role !== 'user' ? 'pr-10 sm:pr-12' : ''} rounded-xl text-[12px] sm:text-[14px] leading-relaxed shadow-lg border whitespace-pre-wrap transition-colors duration-200 ${role === 'user'
            ? 'bg-neon-blue/10 text-white font-sans border border-neon-blue/50 rounded-tr-none'
            : 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.15] border-l-2 border-l-eco-green text-gray-200 rounded-tl-none font-sans shadow-[0_8px_32px_0_rgba(0,243,255,0.05)]'
            }`}>
            {role !== 'user' && (
                <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-500/40 hover:text-gray-300 hover:bg-white/[0.06] icon-hover"
                    title="Copy text"
                >
                    {copied ? <Check size={16} className="text-eco-green" /> : <Copy size={16} />}
                </button>
            )}
            {parseText(text)}
        </div>
    );
};

export default MessageBubble;
