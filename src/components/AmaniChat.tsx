import { useState, useRef, useEffect } from 'react';
import { ArrowUp, X, Loader2, Terminal, Hexagon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useLocation, useNavigate } from 'react-router-dom';
import { logAetherLabsUsage } from '../lib/aiTracking';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mockComponents } from '../hooks/usePCBuilder';

// Lazy initialization to prevent crash on startup if API key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_VERTEX_API_KEY is not defined.");
    }
    // Specifying vertexai forces the SDK to use the Vertex AI endpoint instead of AI Studio.
    aiClient = new GoogleGenAI({ 
      apiKey,
      vertexai: {
        project: import.meta.env.VITE_VERTEX_PROJECT_ID || 'matrix-hardware',
        location: import.meta.env.VITE_VERTEX_LOCATION || 'us-central1'
      } as any
    });
  }
  return aiClient;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AmaniChat() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialMessageTyped, setInitialMessageTyped] = useState(false);

  useEffect(() => {
    if (isOpen && !initialMessageTyped && messages.length === 0) {
      let currentText = '';
      const fullText = 'Protocolo Amani 3 online. Digite a sua diretiva de hardware ou consulta técnica.';
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = getAiClient();
      // Assemble conversation history for context
      const contents = messages.map(m => m.content).join("\n");
      const pageContext = `O usuário está atualmente na página com rota: ${location.pathname}. Adapte suas sugestões focando no contexto dessa página se necessário.`;
      const currentPrompt = pageContext + "\n" + contents + "\nUser: " + userMessage;
      
      const startTime = performance.now();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: currentPrompt,
        config: {
          systemInstruction: `Você é Amani 3, uma IA corporativa de luxo focada em e-commerce de hardware da Hardware Sale (Moçambique). Estilo Apple/iOS: responde de forma concisa, inteligente, formal mas entusiasmada, direta. Evita formatação desnecessária. Foca-te em specs, preços e sinergias de produtos.
Tens a ferramenta 'navigate_to_page' se o cliente pedir para ir ao carrinho ou montra.
MUITO IMPORTANTE: Se o cliente quiser ajuda a montar um PC ou pedir uma recomendação de build (com base num orçamento ou objetivo), DEVES fazer perguntas estratégicas primeiro (orçamento, uso principal, resolução de monitor). QUANDO tiveres essas informações, usa OBRIGATORIAMENTE a tool 'build_custom_pc' passando um array com os IDs dos componentes para criar a build perfeita para ele.
Lista de componentes em stock (use apenas estes IDs na tool build_custom_pc):
${mockComponents.map(c => `${c.id}: ${c.name} (${c.type}) - ${c.priceMT} MT`).join(", ")}`,
          temperature: 0.7,
          tools: [{
            functionDeclarations: [
              {
                name: "navigate_to_page",
                description: "Navega o usuário para uma página específica do site. Use isso quando o usuário disser que quer ver produtos, ir para a loja, ou ir para o checkout.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    page: {
                      type: "STRING",
                      description: "A rota para navegar. Valores válidos: '/products' (montra, loja, ver placas, monitores), '/checkout' (carrinho, pagar)."
                    }
                  },
                  required: ["page"]
                }
              },
              {
                name: "build_custom_pc",
                description: "Cria e redireciona o utilizador para o Builder com os componentes pre-selecionados perfeitamente. Use isto APÓS entender o orçamento e objetivo do cliente.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    componentIds: {
                      type: "ARRAY",
                      items: { type: "STRING" },
                      description: "Array de IDs dos componentes a selecionar (ex: ['c1', 'm1', 'g1', 'r1', 's1', 'p1', 'ca1', 'co1'])."
                    },
                    reasoning: {
                      type: "STRING",
                      description: "Uma frase curta explicando porque escolheu esta combinação."
                    }
                  },
                  required: ["componentIds", "reasoning"]
                }
              }
            ]
          }] as any
        }
      });
      const endTime = performance.now();
      const totalTokens = response.usageMetadata?.totalTokenCount || Math.ceil((currentPrompt.length + (response.text?.length || 0)) / 4);
      
      if (response.functionCalls && response.functionCalls.length > 0) {
         const call = response.functionCalls[0];
         if (call.name === 'navigate_to_page') {
            const page = (call.args as any).page;
            navigate(page);
            setMessages(prev => [...prev, { role: 'assistant', content: `Protocolo de roteamento ativado. A redirecionar para ${page}...` }]);
            logAetherLabsUsage(endTime - startTime, currentPrompt, "Function Call: navigate_to_page", totalTokens);
         } else if (call.name === 'build_custom_pc') {
            const ids = (call.args as any).componentIds;
            const reasoning = (call.args as any).reasoning;
            navigate(`/builder?preset=${ids.join(',')}`);
            setMessages(prev => [...prev, { role: 'assistant', content: `Matrix Build configurada com sucesso: ${reasoning}. A redirecionar para o Smart Builder...` }]);
            logAetherLabsUsage(endTime - startTime, currentPrompt, `Function Call: build_custom_pc - ${reasoning}`, totalTokens);
         }
      } else {
         const text = response.text || "Falha na sub-rotina neural. Tente novamente.";
         setMessages(prev => [...prev, { role: 'assistant', content: text }]);
         logAetherLabsUsage(endTime - startTime, currentPrompt, text, totalTokens);
      }
    } catch (error: any) {
      console.error("AmaniChat Error:", error instanceof Error ? error.message : "Unknown error");
      setMessages(prev => [...prev, { role: 'assistant', content: "Serviço indisponível no momento. AetherLabs API timeout." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        {!isOpen && (
          <button 
            onClick={() => setIsOpen(true)}
            className="h-14 px-6 rounded-[2rem] bg-[#050508]/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)] hover:bg-[#110e1b] transition-all duration-500 flex items-center gap-3 text-gray-300 hover:text-white group hover:scale-105"
          >
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neon opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-neon"></span>
            </div>
            <span className="font-bold text-sm tracking-wide">AetherLabs Assist</span>
            <Hexagon className="w-4 h-4 text-brand-neon opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed bottom-6 right-6 sm:w-[440px] bg-[#030305]/95 backdrop-blur-[50px] rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-50 border border-white/10 max-h-[85vh] sm:max-h-none animate-in fade-in zoom-in-95 duration-500">
          {/* AetherLabs Header */}
          <div className="p-6 pb-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.05] to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                <Hexagon className="w-6 h-6 text-brand-neon" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg tracking-tight leading-tight">Amani 3</h3>
                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online • Powered by AetherLabs
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/10 border border-transparent hover:border-white/10">
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          
          {/* Chat Flow */}
          <div className="flex-1 h-[450px] overflow-y-auto p-6 space-y-6 custom-scrollbar bg-transparent">
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
                placeholder="Insira a sua diretiva..."
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
              <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">Processamento Neural via Vertex AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
