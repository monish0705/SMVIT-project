import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  User, 
  Terminal, 
  Sparkles, 
  ArrowRight,
  Database,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { CopilotMessage } from '../types';

export const OperationsCopilot: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am the CivicPulse Operations Copilot. I execute controlled, database-backed tools to answer queries regarding high-risk incidents, priority rationale, duplicate relationships, and repair verification queues across Bengaluru. How can I assist your team today?",
      timestamp: new Date().toLocaleTimeString(),
      suggested_actions: [
        "Which five incidents need inspection first?",
        "Why is INF-1001 ranked higher than INF-1002?",
        "Show incidents awaiting repair verification",
        "Find duplicate candidates near Bellandur"
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryToSend?: string) => {
    const q = queryToSend || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await api.queryCopilot(q);
      const assistantMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString(),
        tools_executed: response.tools_executed,
        referenced_incidents: response.referenced_incidents,
        suggested_actions: response.suggested_actions
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Query failed: ${err.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">CivicPulse AI Operations Copilot</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                Tool-Calling Runtime
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic DB retrieval & structured synthesis. Does not alter database records autonomously.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-y-auto space-y-4 min-h-0">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`space-y-3 max-w-2xl ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Database Tools Log Box (if tools were called) */}
                {m.tools_executed && m.tools_executed.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 font-mono text-[11px] text-slate-400">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-brand-400" />
                      <span>Database Tools Executed:</span>
                    </span>
                    {m.tools_executed.map((t, idx) => (
                      <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-300">
                        <span className="text-purple-300 font-semibold">{t.tool_name}()</span>: {t.output_summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referenced Incidents Quick Links */}
              {m.referenced_incidents && m.referenced_incidents.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold self-center">
                    Citations:
                  </span>
                  {m.referenced_incidents.map((num) => (
                    <button
                      key={num}
                      onClick={() => navigate(`/incidents/${num}`)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-300 font-mono text-xs border border-slate-700 flex items-center gap-1 transition"
                    >
                      <span>{num}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* Suggested Follow-up Actions */}
              {m.suggested_actions && m.suggested_actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.suggested_actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action)}
                      className="text-[11px] px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl rounded-tl-none border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Querying database records & evaluating risk factors...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask Copilot (e.g. 'Which five incidents need inspection first?')..."
          className="flex-1 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || loading}
          className="p-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

