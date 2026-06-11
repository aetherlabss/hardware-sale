import { useState, useRef, useEffect } from 'react';
import { ArrowUp, X, Loader2, Terminal, Hexagon, Eraser } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { askAI } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePCBuilder } from '../hooks/usePCBuilder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Conversation survives page navigations and reloads within the tab session.
const CHAT_STORAGE_KEY = 'amani_chat_history_v1';
function loadHistory(): Message[] {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch { return []; }
}

export function AmaniChat() {
  const { allComponents } = usePCBuilder();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const initialHistory = loadHistory();
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [initialMessageTyped, setInitialMessageTyped] = useState(initialHistory.length > 0);
  // Monotonic id so a response from a request the user has since cleared/replaced
  // is dropped instead of being appended out of order.
  const reqId = useRef(0);

  useEffect(() => {
    try { sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch { /* private mode */ }
  }, [messages]);

  const clearConversation = () => {
    reqId.current++;
    setMessages([]);
    setInitialMessageTyped(false);
    try { sessionStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isOpen && !initialMessageTyped && messages.length === 0) {
      let currentText = '';
      const fullText = 'Olá! Sou a Amani, a tua assistente de hardware. Como posso ajudar?';
      let currentIndex = 0;
      
      setMessages([{ role: 'assistant', content: '' }]);
      
      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          currentText += fullText[currentIndex];
          setMessages([{ role: 'assistant', content: currentText }]);
          currentIndex++;
        } else {
          clearInterval(interval);
          setInitialMessageTyped(true);
        }
      }, 30);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, initialMessageTyped, messages.length]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const navigate = useNavigate();

  const SUGGESTIONS = [
    'Ajuda-me a montar um PC gaming',
    'Quais as promoções de hoje?',
    'Preciso de uma GPU boa e barata',
    'Ver a montra de produtos',
  ];

  const handleSend = async (textOverride?: string) => {
    const userMessage = (textOverride ?? input).trim();
    if (!userMessage || isLoading) return;

    const myId = ++reqId.current;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Assemble conversation history for context
      const contents = messages.map(m => `${m.role === 'user' ? 'Cliente' : 'Amani'}: ${m.content}`).join("\n");
      const pageContext = `O usuário está atualmente na página com rota: ${location.pathname}. Adapte suas sugestões focando no contexto dessa página se necessário.`;
      const currentPrompt = pageContext + "\n" + contents + "\nCliente: " + userMessage;

      const systemInstruction = `Você é Amani, a assistente de hardware da Hardware Sale (Moçambique). Responde de forma concisa, clara e directa, sem formatação desnecessária. Foca em specs, preços e combinações de produtos.
Tens a ferramenta 'navigate_to_page' se o cliente pedir para ir ao carrinho ou à montra.
MUITO IMPORTANTE: Se o cliente quiser ajuda a montar um PC ou pedir uma recomendação de build, faz primeiro perguntas estratégicas (orçamento, uso principal, resolução de monitor). Quando tiveres essas informações, usa OBRIGATORIAMENTE a tool 'build_custom_pc' passando os IDs dos componentes.
Lista de componentes em stock (usa apenas estes IDs na tool build_custom_pc):
${allComponents.map(c => `${c.id}: ${c.name} (${c.type}) - ${c.priceMT} MT`).join(", ")}`;

      const tools = [{
        functionDeclarations: [
          {
            name: "navigate_to_page",
            description: "Navega o usuário para uma página específica do site. Use isso quando o usuário disser que quer ver produtos, ir para a loja, ou ir para o checkout.",
            parameters: {
              type: "OBJECT",
              properties: {
                page: { type: "STRING", description: "A rota para navegar. Valores válidos: '/products', '/checkout'." }
              },
              required: ["page"]
            }
          },
          {
            name: "build_custom_pc",
            description: "Cria e redireciona o utilizador para o Builder com os componentes pre-selecionados. Use APÓS entender o orçamento e objetivo do cliente.",
            parameters: {
              type: "OBJECT",
              properties: {
                componentIds: { type: "ARRAY", items: { type: "STRING" }, description: "Array de IDs dos componentes." },
                reasoning: { type: "STRING", description: "Uma frase curta explicando porque escolheu esta combinação." }
              },
              required: ["componentIds", "reasoning"]
            }
          }
        ]
      }];

      const response = await askAI({
        prompt: currentPrompt,
        systemInstruction,
        temperature: 0.7,
        tools,
        silent: true, // we log manually below with the correct payload
      });

      if (reqId.current !== myId) return; // conversation was cleared/replaced mid-flight

      const calls = response.functionCalls;
      if (calls && calls.length > 0) {
         const call = calls[0];
         if (call.name === 'navigate_to_page') {
            const page = call.args.page;
            navigate(page);
            setMessages(prev => [...prev, { role: 'assistant', content: `A redirecionar para ${page}...` }]);
         } else if (call.name === 'build_custom_pc') {
            const ids: string[] = call.args.componentIds || [];
            const reasoning: string = call.args.reasoning || '';
            navigate(`/builder?preset=${ids.join(',')}`);
            setMessages(prev => [...prev, { role: 'assistant', content: `Build configurada: ${reasoning}. A redirecionar para o Smart Builder...` }]);
         }
      } else {
         const text = response.text || "Serviço indisponível. Tenta novamente.";
         setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      }
    } catch (error: any) {
      console.error("AmaniChat Error:", error instanceof Error ? error.message : "Unknown error");
      if (reqId.current !== myId) return;
      setMessages(prev => [...prev, { role: 'assistant', content: "Serviço indisponível no momento. Tenta novamente em segundos." }]);
    } finally {
      if (reqId.current === myId) setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="liquid-glass liquid-glass-interactive h-14 px-6 rounded-[2rem] flex items-center gap-3 text-gray-300 hover:text-white group"
          >
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neon opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-neon"></span>
            </div>
            <span className="font-bold text-sm tracking-wide">Hardware Sale Assist</span>
            <Hexagon className="w-4 h-4 text-brand-neon opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="liquid-glass fixed bottom-24 md:bottom-6 right-4 md:right-6 w-[calc(100vw-2rem)] sm:w-[440px] rounded-[2.5rem] flex flex-col overflow-hidden z-50 max-h-[72vh] md:max-h-none animate-in fade-in zoom-in-95 duration-500">
          {/* AI Assist Header */}
          <div className="p-6 pb-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.05] to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                <Hexagon className="w-6 h-6 text-brand-neon" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg tracking-tight leading-tight">Amani</h3>
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online · Assistente Hardware Sale
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.some(m => m.role === 'user') && (
                <button onClick={clearConversation} aria-label="Limpar conversa" title="Limpar conversa"
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-brand-magenta transition-all rounded-full hover:bg-white/10 border border-transparent hover:border-white/10">
                  <Eraser size={17} strokeWidth={2} />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} aria-label="Fechar" className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/10 border border-transparent hover:border-white/10">
                <X size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
          
          {/* Chat Flow */}
          <div className="flex-1 h-[340px] md:h-[450px] overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar bg-transparent">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-[0.8rem] bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                     <Hexagon className="w-4 h-4 text-brand-neon" strokeWidth={2} />
                  </div>
                )}
                <div className={`max-w-[82%] px-6 py-4 text-[13px] leading-relaxed font-medium ${
                  msg.role === 'user' 
                    ? 'bg-white text-black rounded-[1.8rem] rounded-tr-sm shadow-[0_10px_30px_rgba(255,255,255,0.1)]' 
                    : 'bg-white/5 border border-white/10 text-gray-300 rounded-[1.8rem] rounded-tl-sm shadow-inner prose prose-invert prose-sm max-w-none'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center">
                 <div className="w-8 h-8 rounded-[0.8rem] bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center shrink-0 mr-3 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                     <Hexagon className="w-4 h-4 text-brand-neon" strokeWidth={2} />
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-[1.5rem] rounded-tl-sm px-5 py-4 flex items-center gap-2 h-12 shadow-inner">
                   <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                   <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                   <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-150"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-reply suggestion chips (only before the user has engaged) */}
          {!isLoading && messages.filter(m => m.role === 'user').length === 0 && initialMessageTyped && (
            <div className="px-5 pb-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-[11px] font-medium text-gray-300 bg-white/5 hover:bg-brand-neon/10 hover:text-brand-neon border border-white/10 hover:border-brand-neon/30 rounded-full px-3 py-1.5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Command Palette Input */}
          <div className="p-5 pt-2 bg-transparent">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-1.5 transition-all focus-within:border-brand-neon/50 focus-within:bg-black/60 shadow-inner group">
              <div className="pl-4 pr-2 text-gray-500">
                 <Terminal size={16} strokeWidth={2} className="group-focus-within:text-brand-neon transition-colors" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Faz a tua pergunta..."
                className="flex-1 bg-transparent border-0 text-white placeholder:text-gray-500 h-12 px-2 focus:outline-none focus:ring-0 text-sm font-medium"
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()} 
                className="w-10 h-10 rounded-full bg-brand-neon text-black hover:bg-brand-magenta transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-gray-500 flex items-center justify-center shrink-0 mr-1 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:shadow-none"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={3} />}
              </button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">Amani AI · Vertex</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
