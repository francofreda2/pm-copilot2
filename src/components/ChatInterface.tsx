import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, User, Bot } from 'lucide-react';
import { ChatMessage, ProjectData } from '../types';
import { PMChatService } from '../services/geminiService';

interface Props {
  initialContext: ProjectData;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function ChatInterface({ initialContext, messages, setMessages }: Props) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatServiceRef = useRef<PMChatService | null>(null);

  useEffect(() => {
    chatServiceRef.current = null;

    if (messages.length > 0) {
      chatServiceRef.current = new PMChatService(messages);
      return;
    }

    const initChat = async () => {
      try {
        chatServiceRef.current = new PMChatService();
        setIsLoading(true);

        const initialPrompt = `Aquí están los datos iniciales de mi proyecto:
- Nombre: ${initialContext.name}
- Objetivo Principal: ${initialContext.businessObjective}
- Tipo de Proyecto: ${initialContext.projectType}
- Descripción: ${initialContext.description}

Por favor, preséntate y comienza directamente con el Paso 1 de la FASE 1 (Acta de Constitución).`;

        const userMsg: ChatMessage = {
          id: 'init-user',
          role: 'user',
          content: initialPrompt
        };
        setMessages([userMsg]);

        const responseText = await chatServiceRef.current.sendMessage(initialPrompt);

        setMessages(prev => [...prev, {
          id: 'init-model',
          role: 'model',
          content: responseText
        }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al inicializar el chat.");
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, [initialContext.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatServiceRef.current) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const responseText = await chatServiceRef.current.sendMessage(userMessage.content);
      const modelMessage: ChatMessage = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        role: 'model',
        content: responseText
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el mensaje.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0 && !isLoading && !error && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', fontSize: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <Bot size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>Iniciando sesión con PM Copilot...</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in" style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div className={msg.role === 'user' ? 'chat-avatar chat-avatar-user' : 'chat-avatar chat-avatar-bot'}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}>
              {msg.role === 'user' ? (
                <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 14, lineHeight: 1.6 }}>{msg.content}</p>
              ) : (
                <div className="prose prose-zinc max-w-none" style={{ fontSize: 14, lineHeight: 1.7 }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isSvg = match && match[1] === 'svg';

                        if (!inline && isSvg) {
                          return (
                            <div
                              style={{ margin: '16px 0', padding: 16, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'auto', display: 'flex', justifyContent: 'center' }}
                              dangerouslySetInnerHTML={{ __html: String(children).replace(/\n$/, '') }}
                            />
                          );
                        }

                        return !inline ? (
                          <pre style={{ background: 'var(--neutral-900)', color: '#e2e8f0', padding: 16, borderRadius: 'var(--radius-md)', overflow: 'auto', fontSize: 12, margin: '12px 0', fontFamily: "'JetBrains Mono', monospace" }}>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code style={{ background: 'var(--neutral-100)', color: 'var(--neutral-800)', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} {...props}>
                            {children}
                          </code>
                        );
                      },
                      table({children}) {
                        return <div style={{ overflow: 'auto', margin: '16px 0' }}><table className="table" style={{ minWidth: 400 }}>{children}</table></div>;
                      },
                      th({children}) {
                        return <th style={{ padding: '10px 14px', background: 'var(--neutral-50)', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid var(--border-light)' }}>{children}</th>;
                      },
                      td({children}) {
                        return <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--neutral-700)', borderBottom: '1px solid var(--border-subtle)' }}>{children}</td>;
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && (
          <div className="animate-fade-in" style={{ display: 'flex', gap: 12 }}>
            <div className="chat-avatar chat-avatar-bot">
              <Bot size={18} />
            </div>
            <div className="chat-bubble-model" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--primary-500)' }} />
              <span style={{ color: 'var(--neutral-500)', fontSize: 13 }}>PM Copilot está escribiendo...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-box animate-fade-in" style={{ marginLeft: 50 }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Escribe tu mensaje aquí... (Enter para enviar)"
            className="chat-input"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="chat-send-btn"
          >
            <Send size={16} />
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>Shift + Enter para salto de línea</span>
        </div>
      </div>
    </div>
  );
}
