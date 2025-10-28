import { useState } from 'react';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, size: number, color: string) => void;
  onToggleWishlist: (product: Product) => void;
  isInWishlist: boolean;
  onQuickView?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onToggleWishlist, isInWishlist, onQuickView }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0]?.toString() || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0] || '');
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = () => {
    if (selectedSize && selectedColor) {
      onAddToCart(product, parseInt(selectedSize), selectedColor);
    }
  };

  return (
    <Card 
      className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <ImageWithFallback
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.featured && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 border-0">
            Featured
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => onToggleWishlist(product)}
        >
          <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        {onQuickView && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => onQuickView(product)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Quick View
          </Button>
        )}
      </div>
      
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {product.category}
          </p>
          <h3 className="text-lg line-clamp-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {product.description}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            KES {product.price.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </p>
        </div>
        
        <div className="space-y-2">
          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {product.sizes.map(size => (
                <SelectItem key={size} value={size.toString()}>
                  US {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedColor} onValueChange={setSelectedColor}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {product.colors.map(color => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          onClick={handleAddToCart}
          disabled={!selectedSize || !selectedColor || product.stock === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
