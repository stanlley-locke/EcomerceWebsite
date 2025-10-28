import { useState } from 'react';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Separator } from './ui/separator';
import { CheckoutDialog } from './CheckoutDialog';

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedSize: number;
  selectedColor: string;
}

interface ShoppingCartPanelProps {
  cart: CartItem[];
  open: boolean;
  onClose: () => void;
  onUpdateQuantity: (productId: string, size: number, color: string, quantity: number) => void;
  onRemove: (productId: string, size: number, color: string) => void;
  onClearCart: () => void;
}

export function ShoppingCartPanel({
  cart,
  open,
  onClose,
  onUpdateQuantity,
  onRemove,
  onClearCart,
}: ShoppingCartPanelProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Add some amazing shoes to get started!</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
                      className="flex gap-4 p-4 bg-card rounded-lg border transition-all hover:shadow-md"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="truncate">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          Size: US {item.selectedSize} | {item.selectedColor}
                        </p>
                        <p className="text-gray-900 mt-1">KES {item.price.toFixed(2)}</p>

                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              onUpdateQuantity(
                                item.id,
                                item.selectedSize,
                                item.selectedColor,
                                item.quantity - 1
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              onUpdateQuantity(
                                item.id,
                                item.selectedSize,
                                item.selectedColor,
                                item.quantity + 1
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => onRemove(item.id, item.selectedSize, item.selectedColor)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>KES {subtotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Delivery cost and tax will be calculated at checkout
                </p>

                <Button 
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  size="lg"
                  onClick={() => setShowCheckout(true)}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      
      <CheckoutDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        onOrderComplete={() => {
          onClearCart();
          onClose();
        }}
      />
    </>
  );
}
