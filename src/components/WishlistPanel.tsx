import { X, Heart, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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

interface WishlistPanelProps {
  wishlist: Product[];
  open: boolean;
  onClose: () => void;
  onRemove: (product: Product) => void;
  onAddToCart: (product: Product, size: number, color: string) => void;
}

export function WishlistPanel({
  wishlist,
  open,
  onClose,
  onRemove,
  onAddToCart,
}: WishlistPanelProps) {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});

  const handleAddToCart = (product: Product) => {
    const size = selectedSizes[product.id] || product.sizes[0]?.toString();
    const color = selectedColors[product.id] || product.colors[0];
    
    if (size && color) {
      onAddToCart(product, parseInt(size), color);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            Wishlist ({wishlist.length})
          </SheetTitle>
        </SheetHeader>

        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Your wishlist is empty
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Add items you love to save them for later
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-4 py-6">
              {wishlist.map((product) => (
                <div
                  key={product.id}
                  className="flex gap-4 border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="line-clamp-1">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.category}
                      </p>
                      <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        KES {product.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={selectedSizes[product.id] || product.sizes[0]?.toString()}
                          onValueChange={(value) =>
                            setSelectedSizes({ ...selectedSizes, [product.id]: value })
                          }
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            {product.sizes.map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                US {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={selectedColors[product.id] || product.colors[0]}
                          onValueChange={(value) =>
                            setSelectedColors({ ...selectedColors, [product.id]: value })
                          }
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Color" />
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

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add to Cart
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => onRemove(product)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
