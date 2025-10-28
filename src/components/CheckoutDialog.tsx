import { useState, useEffect } from 'react';
import { CreditCard, MapPin, Phone, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedSize: number;
  selectedColor: string;
}

interface DeliveryLocation {
  id: string;
  name: string;
  cost: number;
  region: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onOrderComplete: () => void;
}

export function CheckoutDialog({ open, onClose, cart, onOrderComplete }: CheckoutDialogProps) {
  const [step, setStep] = useState<'delivery' | 'payment' | 'processing' | 'success'>('delivery');
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [loading, setLoading] = useState(false);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // M-Pesa details
  const [mpesaPhone, setMpesaPhone] = useState('');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    if (open) {
      loadLocations();
      setStep('delivery');
    }
  }, [open]);

  const loadLocations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/delivery-locations`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error loading delivery locations:', error);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = selectedLocation?.cost || 0;
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryCost + tax;

  const handleProceedToPayment = () => {
    if (!selectedLocation || !customerName || !customerEmail || !customerPhone || !deliveryAddress) {
      alert('Please fill in all delivery details');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      alert('Please enter your M-Pesa phone number');
      return;
    }

    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvc || !cardName)) {
      alert('Please fill in all card details');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Create order
      const orderResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName,
            customerEmail,
            customerPhone,
            deliveryAddress,
            deliveryLocation: selectedLocation,
            cart,
            subtotal,
            deliveryCost,
            tax,
            total,
          }),
        }
      );

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const { order } = await orderResponse.json();

      // Initiate payment
      let paymentResponse;
      if (paymentMethod === 'mpesa') {
        paymentResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/payment/mpesa`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: mpesaPhone,
              amount: total,
              orderId: order.id,
            }),
          }
        );
      } else {
        paymentResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/payment/card`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cardDetails: {
                number: cardNumber,
                expiry: cardExpiry,
                cvc: cardCvc,
                name: cardName,
              },
              amount: total,
              orderId: order.id,
            }),
          }
        );
      }

      if (!paymentResponse.ok) {
        throw new Error('Failed to process payment');
      }

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStep('success');
      setTimeout(() => {
        onOrderComplete();
        onClose();
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('delivery');
    setSelectedLocation(null);
    setPaymentMethod('mpesa');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setMpesaPhone('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCardName('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'delivery' && <MapPin className="h-5 w-5" />}
            {step === 'payment' && <CreditCard className="h-5 w-5" />}
            {step === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {step === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            <span>
              {step === 'delivery' && 'Delivery Information'}
              {step === 'payment' && 'Payment Details'}
              {step === 'processing' && 'Processing Payment'}
              {step === 'success' && 'Order Confirmed!'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 'delivery' && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="mb-2">Order Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({cart.length} items)</span>
                  <span>KES {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{deliveryCost === 0 ? 'FREE' : `KES ${deliveryCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span>KES {tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    KES {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-4">
              <h3>Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Stanley Locke"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="stanlleylocke@gmail.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                />
              </div>
            </div>

            {/* Delivery Location */}
            <div className="space-y-4">
              <h3>Delivery Location</h3>
              <div className="space-y-2">
                <Label htmlFor="location">Select Location *</Label>
                <Select
                  value={selectedLocation?.id}
                  onValueChange={(value) => {
                    const location = locations.find(l => l.id === value);
                    setSelectedLocation(location || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your delivery location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}, {location.region} {location.cost === 0 ? '(Free Delivery)' : `- KES ${location.cost}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Detailed Address *</Label>
                <Input
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Building, floor, apartment number, landmarks"
                />
              </div>
              {selectedLocation && selectedLocation.cost === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Free delivery available for this location!</span>
                </div>
              )}
            </div>

            <Button 
              onClick={handleProceedToPayment}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Proceed to Payment
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            {/* Order Total */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
              <p className="text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                KES {total.toFixed(2)}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h3>Select Payment Method</h3>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'mpesa' | 'card')}>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="mpesa" id="mpesa" />
                  <Label htmlFor="mpesa" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-green-600" />
                      <div>
                        <p>M-Pesa</p>
                        <p className="text-xs text-muted-foreground">Pay via M-Pesa mobile money</p>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <p>Credit/Debit Card</p>
                        <p className="text-xs text-muted-foreground">Pay securely with your card</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* M-Pesa Form */}
            {paymentMethod === 'mpesa' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="mpesa-phone">M-Pesa Phone Number *</Label>
                  <Input
                    id="mpesa-phone"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="254712345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the M-Pesa registered phone number. You will receive an STK push to complete payment.
                  </p>
                </div>
              </div>
            )}

            {/* Card Form */}
            {paymentMethod === 'card' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number *</Label>
                  <Input
                    id="card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-name">Cardholder Name *</Label>
                  <Input
                    id="card-name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-expiry">Expiry Date *</Label>
                    <Input
                      id="card-expiry"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-cvc">CVC *</Label>
                    <Input
                      id="card-cvc"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setStep('delivery')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? 'Processing...' : `Pay KES ${total.toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-blue-600" />
            <div>
              <h3 className="mb-2">Processing Your Payment</h3>
              <p className="text-sm text-muted-foreground">
                {paymentMethod === 'mpesa' 
                  ? 'Please check your phone and enter your M-Pesa PIN to complete the payment.'
                  : 'Processing your card payment securely...'}
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="mb-2">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Your order has been confirmed. We'll send a confirmation email to {customerEmail}.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
