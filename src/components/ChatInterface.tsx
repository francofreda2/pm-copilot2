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

  // Inicializar el chat y enviar el contexto inicial
  useEffect(() => {
    // Resetear el servicio de chat cuando cambia el proyecto
    chatServiceRef.current = null;

    // Solo inicializar si no hay mensajes previos
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

        // Añadimos el mensaje del usuario al historial visual
        const userMsg: ChatMessage = {
          id: 'init-user',
          role: 'user',
          content: initialPrompt
        };
        setMessages([userMsg]);

        // Enviamos el mensaje a Gemini
        const responseText = await chatServiceRef.current.sendMessage(initialPrompt);
        
        // Añadimos la respuesta del modelo
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
  }, [initialContext.id]); // Solo ejecutar cuando cambia el ID del proyecto

  // Auto-scroll al último mensaje
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
    <div className="flex flex-col h-[calc(100dvh-8rem)] bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && !isLoading && !error && (
          <div className="h-full flex items-center justify-center text-zinc-500">
            Iniciando sesión con PM Copilot...
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Contenido del mensaje */}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3' : 'bg-white text-zinc-800 rounded-2xl rounded-tl-sm border border-zinc-200 px-5 py-4 shadow-sm'}`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="markdown-body prose prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isSvg = match && match[1] === 'svg';
                        
                        // Si es SVG, renderizarlo como HTML
                        if (!inline && isSvg) {
                          return (
                            <div
                              className="my-6 p-4 bg-white border border-zinc-200 rounded-xl overflow-x-auto flex justify-center shadow-inner"
                              dangerouslySetInnerHTML={{ __html: String(children).replace(/\n$/, '') }}
                            />
                          );
                        }
                        
                        // Si es código normal
                        return !inline ? (
                          <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl overflow-x-auto text-sm my-4">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      },
                      table({children}) {
                        return <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-zinc-200 border border-zinc-200 rounded-lg">{children}</table></div>;
                      },
                      th({children}) {
                        return <th className="px-4 py-3 bg-zinc-50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{children}</th>;
                      },
                      td({children}) {
                        return <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 border-t border-zinc-200">{children}</td>;
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
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              <span className="text-zinc-500 text-sm">PM Copilot está escribiendo...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mx-14 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de input */}
      <div className="p-4 bg-white border-t border-zinc-200">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Escribe tu mensaje aquí... (Presiona Enter para enviar)"
            className="flex-1 resize-none rounded-xl border border-zinc-300 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[52px] max-h-32 custom-scrollbar"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-xs text-zinc-400">Shift + Enter para salto de línea</span>
        </div>
      </div>
    </div>
  );
}
