import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Send, Smartphone, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartSummary: string;
  totalPriceMT: number;
}

export function CheckoutModal({ isOpen, onClose, cartSummary, totalPriceMT }: CheckoutModalProps) {
  const [method, setMethod] = useState<'mpesa' | 'emola' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Olá Hardware Sale! Gostaria de encomendar:\n\n${cartSummary}\n\nTotal: ${totalPriceMT.toLocaleString()} MT\nMétodo preferido: ${method === 'mpesa' ? 'M-Pesa' : method === 'emola' ? 'e-Mola' : 'A combinar'}`);
    window.open(`https://wa.me/258840000000?text=${text}`, '_blank');
  };

  const isPhoneValid = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length !== 9) return false;
    
    if (method === 'mpesa') {
      return cleanNumber.startsWith('84') || cleanNumber.startsWith('85');
    }
    if (method === 'emola') {
      return cleanNumber.startsWith('86') || cleanNumber.startsWith('87');
    }
    return false;
  };

  const mockPay = () => {
    if (!method || !isPhoneValid()) return;
    setPaymentStatus('processing');
    
    // Simulating USSD Push delay
    setTimeout(() => {
      setPaymentStatus('success');
      setTimeout(() => {
        setPaymentStatus('idle');
        setMethod(null);
        setPhoneNumber('');
        onClose();
      }, 4000);
    }, 5000);
  };

  const closeReset = () => {
    setPaymentStatus('idle');
    setMethod(null);
    setPhoneNumber('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md"
          >
            <Card className="w-full border-primary/30 bg-brand-darker/90 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.15)]">
              {/* Background gradient effect */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              
              <button 
                onClick={closeReset} 
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                disabled={paymentStatus === 'processing'}
              >
                <X size={20} />
              </button>
              
              <CardHeader>
                <CardTitle className="text-xl text-white font-semibold">Finalizar Compra</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {paymentStatus === 'success' ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-10 space-y-4"
                  >
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                      <CheckCircle2 className="w-20 h-20 text-green-400 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Pagamento Confirmado!</h3>
                    <p className="text-gray-400">Um consultor entrará em contacto em breve para coordenar o envio.</p>
                  </motion.div>
                ) : paymentStatus === 'processing' ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-10 space-y-6"
                  >
                    <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-xl font-medium text-white">Aguardando Confirmação</h3>
                      <p className="text-gray-400 text-sm max-w-[250px] mx-auto">
                        Por favor, verifique o seu telemóvel e introduza o PIN do {method === 'mpesa' ? 'M-Pesa' : 'e-Mola'} para confirmar o pagamento.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="bg-brand-dark/50 p-5 rounded-xl border border-gray-800/50 backdrop-blur-sm">
                      <div className="text-sm text-gray-400 mb-1 font-medium">Total a Pagar</div>
                      <div className="text-3xl font-mono text-primary font-bold">{totalPriceMT.toLocaleString()} MT</div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-gray-300">Escolha o Método de Pagamento</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant={method === 'mpesa' ? 'default' : 'outline'} 
                          className={`h-14 relative overflow-hidden transition-all duration-300 ${
                            method === 'mpesa' 
                              ? 'bg-red-600 text-white hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)] border-transparent' 
                              : 'border-red-600/30 text-gray-300 hover:bg-red-600/10 hover:border-red-600/50'
                          }`}
                          onClick={() => { setMethod('mpesa'); setPhoneNumber(''); }}
                        >
                          <Smartphone className="mr-2" size={18} />
                          <span className="font-semibold tracking-wide">M-Pesa</span>
                        </Button>
                        <Button 
                          variant={method === 'emola' ? 'default' : 'outline'} 
                          className={`h-14 relative overflow-hidden transition-all duration-300 ${
                            method === 'emola' 
                              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.4)] border-transparent' 
                              : 'border-orange-500/30 text-gray-300 hover:bg-orange-500/10 hover:border-orange-500/50'
                          }`}
                          onClick={() => { setMethod('emola'); setPhoneNumber(''); }}
                        >
                          <Smartphone className="mr-2" size={18} />
                          <span className="font-semibold tracking-wide">e-Mola</span>
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {method && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 pb-1 space-y-2">
                            <label className="text-xs text-gray-400 ml-1">
                              Número {method === 'mpesa' ? 'M-Pesa (84/85)' : 'e-Mola (86/87)'}
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                              <Input 
                                type="tel"
                                placeholder="Ex: 841234567"
                                value={phoneNumber}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                                maxLength={9}
                                className={`pl-10 h-12 bg-black/50 ${
                                  phoneNumber.length === 9 
                                    ? isPhoneValid() 
                                      ? 'border-green-500/50 focus-visible:ring-green-500' 
                                      : 'border-red-500/50 focus-visible:ring-red-500'
                                    : 'border-gray-800'
                                }`}
                              />
                            </div>
                            {phoneNumber.length > 0 && phoneNumber.length < 9 && (
                              <p className="text-[10px] text-gray-500 ml-1">Introduza 9 dígitos</p>
                            )}
                            {phoneNumber.length === 9 && !isPhoneValid() && (
                              <p className="text-[10px] text-red-400 ml-1">Prefixo inválido para {method === 'mpesa' ? 'M-Pesa' : 'e-Mola'}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-2 flex flex-col gap-3">
                      <Button 
                        className={`w-full h-12 font-semibold text-md transition-all ${
                          isPhoneValid() 
                            ? 'bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                            : 'bg-gray-800 text-gray-500'
                        }`}
                        disabled={!method || !isPhoneValid()} 
                        onClick={mockPay}
                      >
                        Confirmar Pagamento Seguro
                      </Button>
                      
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-800"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-600 text-xs uppercase tracking-wider font-medium">ou</span>
                        <div className="flex-grow border-t border-gray-800"></div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full h-11 border-green-500/20 text-green-400 hover:bg-green-500/10 hover:border-green-500/40 transition-colors" 
                        onClick={handleWhatsApp}
                      >
                        <Send className="mr-2 w-4 h-4" />
                        Tratar via WhatsApp
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
