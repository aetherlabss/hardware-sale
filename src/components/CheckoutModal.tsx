import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Send, Smartphone, CheckCircle2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartSummary: string;
  totalPriceMT: number;
}

export function CheckoutModal({ isOpen, onClose, cartSummary, totalPriceMT }: CheckoutModalProps) {
  const [method, setMethod] = useState<'mpesa' | 'emola' | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Olá Hardware Sale! Gostaria de encomendar:\n\n${cartSummary}\n\nTotal: ${totalPriceMT.toLocaleString()} MT\nMétodo preferido: ${method === 'mpesa' ? 'M-Pesa' : method === 'emola' ? 'e-Mola' : 'A combinar'}`);
    window.open(`https://wa.me/258840000000?text=${text}`, '_blank');
  };

  const mockPay = () => {
    if (!method) return;
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-primary/40 bg-brand-darker relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        <CardHeader>
          <CardTitle className="text-xl text-white">Finalizar Compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Pagamento Confirmado!</h3>
              <p className="text-gray-400">Um consultor entrará em contacto para o envio.</p>
            </div>
          ) : (
            <>
              <div className="bg-brand-dark p-4 rounded-lg border border-gray-800">
                <div className="text-sm text-gray-400 mb-1">Total a Pagar</div>
                <div className="text-3xl font-mono text-primary">{totalPriceMT.toLocaleString()} MT</div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-300">Métodos de Pagamento (Moçambique)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={method === 'mpesa' ? 'default' : 'outline'} 
                    className={`h-14 ${method === 'mpesa' ? 'bg-red-600 text-white hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.5)] border-transparent' : 'border-red-600/50 hover:bg-red-600/10'}`}
                    onClick={() => setMethod('mpesa')}
                  >
                    <Smartphone className="mr-2" size={18} />
                    M-Pesa
                  </Button>
                  <Button 
                    variant={method === 'emola' ? 'default' : 'outline'} 
                    className={`h-14 ${method === 'emola' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.5)] border-transparent' : 'border-orange-500/50 hover:bg-orange-500/10'}`}
                    onClick={() => setMethod('emola')}
                  >
                    <Smartphone className="mr-2" size={18} />
                    e-Mola
                  </Button>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button className="w-full" disabled={!method} onClick={mockPay}>
                  Confirmar Pagamento Seguro
                </Button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-700"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">ou</span>
                  <div className="flex-grow border-t border-gray-700"></div>
                </div>
                <Button variant="outline" className="w-full border-green-600/50 text-green-400 hover:bg-green-600/20" onClick={handleWhatsApp}>
                  <Send className="mr-2" size={16} />
                  Orçamento via WhatsApp
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
