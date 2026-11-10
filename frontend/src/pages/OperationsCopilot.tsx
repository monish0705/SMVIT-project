import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareText, Send, User, Terminal, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { CopilotMessage } from '../types';

const renderFormattedText = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={idx} className="font-semibold text-[#172B3A]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );

export const OperationsCopilot: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello. Ask me to retrieve unresolved critical incidents, compare two incident priority rankings, list duplicate candidates, or inspect repair claims awaiting review.',
      timestamp: new Date().toLocaleTimeString(),
      suggested_actions: [
        'Which five incidents need inspection first?',
        'Why is INF-1001 ranked higher than INF-1002?',
        'Show incidents awaiting repair verification',
        'Find duplicate candidates near Bellandur'
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto space-y-4">
      <div className="bg-white p-4 rounded-xl border border-[#DDE4EC] flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-[#172B3A] text-white flex items-center justify-center flex-shrink-0">
          <MessageSquareText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[#263746]">Operations Query Assistant</h1>
          <p className="text-xs text-[#5A6B7C]">
            Read-only database tool retrieval explaining priority scores, duplicates, and pending repair audits.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-[#DDE4EC] p-4 overflow-y-auto space-y-4 min-h-0 shadow-sm">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-[#167C80]/10 border border-[#167C80]/20 flex items-center justify-center text-[#167C80] flex-shrink-0 mt-1">
                <MessageSquareText className="w-4 h-4" />
              </div>
            )}

            <div className="space-y-2.5 max-w-2xl">
              <div className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#167C80] text-white'
                  : 'bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746]'
              }`}>
                <div className="whitespace-pre-wrap">
                  {m.sender === 'user' ? m.text : renderFormattedText(m.text)}
                </div>

                {m.tools_executed && m.tools_executed.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#DDE4EC] space-y-1.5 font-mono text-[11px] text-[#5A6B7C]">
                    <span className="text-[10px] uppercase font-bold flex items-center gap-1 text-[#263746]">
                      <Terminal className="w-3 h-3 text-[#167C80]" />
                      <span>Executed Queries:</span>
                    </span>
                    {m.tools_executed.map((t, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-[#DDE4EC] text-[#263746]">
                        <span className="text-[#3979B7] font-semibold">{t.tool_name}()</span>: {t.output_summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.referenced_incidents && m.referenced_incidents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {m.referenced_incidents.map((num) => (
                    <button
                      key={num}
                      onClick={() => navigate(`/incidents/${num}`)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-[#F6F8FA] text-[#167C80] font-mono text-xs border border-[#DDE4EC] flex items-center gap-1"
                    >
                      <span>{num}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              {m.suggested_actions && m.suggested_actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.suggested_actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action)}
                      className="text-[11px] px-3 py-1 rounded-full bg-white hover:bg-[#F6F8FA] text-[#263746] border border-[#DDE4EC] transition"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-[#172B3A] text-white flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="bg-[#F6F8FA] p-3.5 rounded-xl border border-[#DDE4EC] text-xs text-[#5A6B7C] flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[#167C80] border-t-transparent rounded-full animate-spin" />
              <span>Querying database records...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-3 rounded-xl border border-[#DDE4EC] flex items-center gap-2 shadow-sm">
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about urgent defects, ranking explanations, duplicates, or repair audits..."
          className="flex-1 bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#167C80]"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || loading}
          aria-label="Send query"
          className="p-2.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white disabled:opacity-50 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
