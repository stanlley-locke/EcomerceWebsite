import { useState } from 'react';
import { X, ShoppingCart, Heart, Package } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: number[];
  colors: string[];
  imageUrl: string;
  stock: number;
  featured: boolean;
}

interface QuickViewProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size: number, color: string) => void;
  onToggleWishlist: (product: Product) => void;
  isInWishlist: boolean;
}

export function QuickView({
  product,
  open,
  onClose,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
}: QuickViewProps) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  if (!product) return null;

  // Reset selections when product changes
  const handleOpen = (isOpen: boolean) => {
    if (isOpen && product) {
      setSelectedSize(product.sizes[0]?.toString() || '');
      setSelectedColor(product.colors[0] || '');
    } else {
      onClose();
    }
  };

  const handleAddToCart = () => {
    if (selectedSize && selectedColor) {
      onAddToCart(product, parseInt(selectedSize), selectedColor);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative aspect-square md:aspect-auto bg-muted">
            <ImageWithFallback
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.featured && (
              <Badge className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 border-0">
                Featured
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={() => onToggleWishlist(product)}
            >
              <Heart
                className={`h-5 w-5 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`}
              />
            </Button>
          </div>

          {/* Details Section */}
          <div className="p-8 flex flex-col">
            <div className="flex-1">
              <div className="mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {product.category}
                </p>
                <h2 className="text-3xl mb-3">{product.name}</h2>
                <p className="text-muted-foreground mb-4">{product.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <p className="text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    KES {product.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm mb-2 block">Select Size</label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose size" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.sizes.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          US {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm mb-2 block">Select Color</label>
                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose color" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.colors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12"
                onClick={handleAddToCart}
                disabled={!selectedSize || !selectedColor || product.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" className="w-full h-12" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
