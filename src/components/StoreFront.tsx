import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Search,
  Filter,
  Sparkles,
  Heart,
  SlidersHorizontal,
} from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ShoppingCartPanel } from "./ShoppingCartPanel";
import { WishlistPanel } from "./WishlistPanel";
import { QuickView } from "./QuickView";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { Slider } from "./ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info";

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

interface CartItem extends Product {
  quantity: number;
  selectedSize: number;
  selectedColor: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
  subcategories: string[];
}

interface StoreFrontProps {
  onAdminAccess: () => void;
}

export function StoreFront({ onAdminAccess }: StoreFrontProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<
    Product[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [adminClickCount, setAdminClickCount] = useState(0);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, categoryFilter, sortBy, priceRange]);

  // Secret admin access by clicking logo 5 times
  useEffect(() => {
    if (adminClickCount >= 5) {
      onAdminAccess();
      setAdminClickCount(0);
    }
  }, [adminClickCount, onAdminAccess]);

  const loadProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/products`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const allProducts = data.products || [];
        setProducts(allProducts);
        
        // Calculate max price for slider
        if (allProducts.length > 0) {
          const max = Math.max(...allProducts.map((p: Product) => p.price));
          setMaxPrice(Math.ceil(max / 1000) * 1000); // Round up to nearest 1000
          setPriceRange([0, Math.ceil(max / 1000) * 1000]);
        }
      } else {
        console.error(
          "Failed to load products:",
          await response.text(),
        );
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories/active`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by active categories only
    const activeSubcategories = categories.flatMap(c => c.subcategories || [c.name]);
    filtered = filtered.filter(p => activeSubcategories.includes(p.category));

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          p.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          p.category
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (p) => p.category === categoryFilter,
      );
    }

    // Price range filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1],
    );

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "featured":
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
        });
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const addToCart = (
    product: Product,
    size: number,
    color: string,
  ) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) =>
          item.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color,
      );

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prevCart,
        {
          ...product,
          quantity: 1,
          selectedSize: size,
          selectedColor: color,
        },
      ];
    });
  };

  const removeFromCart = (
    productId: string,
    size: number,
    color: string,
  ) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(
            item.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
          ),
      ),
    );
  };

  const updateCartQuantity = (
    productId: string,
    size: number,
    color: string,
    quantity: number,
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId &&
        item.selectedSize === size &&
        item.selectedColor === color
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((p) => p.id === productId);
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

  const availableSubcategories = [
    "all",
    ...Array.from(new Set(
      categories
        .filter(c => c.active)
        .flatMap(c => c.subcategories || [c.name])
    ))
  ];
  
  const cartItemsCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const featuredProducts = filteredProducts.filter(
    (p) => p.featured,
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div
              className="flex items-center space-x-3 cursor-pointer select-none"
              onClick={() =>
                setAdminClickCount((prev) => prev + 1)
              }
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SoleStyle
                </h1>
                <p className="text-xs text-muted-foreground">
                  Your Premium Store
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setWishlistOpen(true)}
              >
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-pink-600 to-red-600">
                    {wishlist.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-blue-600 to-purple-600">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              New Collection 2025
            </Badge>
            <h2 className="text-5xl md:text-6xl bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-gray-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
              Discover Excellence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore our curated collection of premium products
              crafted for style, quality, and performance.
              Elevate your lifestyle today.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-48 h-12">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {availableSubcategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all"
                      ? "All Categories"
                      : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-12">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-12 w-12">
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search results
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm">Price Range</label>
                      <span className="text-sm text-muted-foreground">
                        KES {priceRange[0]} - KES {priceRange[1]}
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={maxPrice}
                      step={100}
                      value={priceRange}
                      onValueChange={setPriceRange}
                      className="w-full"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 &&
          categoryFilter === "all" &&
          !searchQuery && (
            <div className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h3 className="text-2xl">
                  Featured Collection
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onToggleWishlist={toggleWishlist}
                    isInWishlist={isInWishlist(product.id)}
                    onQuickView={handleQuickView}
                  />
                ))}
              </div>
            </div>
          )}

        {/* All Products */}
        <div className="mb-8">
          <h3 className="text-2xl mb-6">
            {searchQuery || categoryFilter !== "all"
              ? "Search Results"
              : "All Products"}
          </h3>
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="text-muted-foreground mt-4">
                Loading products...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">
                No products found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                  isInWishlist={isInWishlist(product.id)}
                  onQuickView={handleQuickView}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 SoleStyle. Premium products for the modern
              lifestyle.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Free delivery in Nairobi & Machakos
            </p>
          </div>
        </div>
      </footer>

      {/* Shopping Cart Panel */}
      <ShoppingCartPanel
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemove={removeFromCart}
        onClearCart={clearCart}
      />

      {/* Wishlist Panel */}
      <WishlistPanel
        wishlist={wishlist}
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        onRemove={toggleWishlist}
        onAddToCart={addToCart}
      />

      {/* Quick View */}
      <QuickView
        product={quickViewProduct}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        onAddToCart={addToCart}
        onToggleWishlist={toggleWishlist}
        isInWishlist={quickViewProduct ? isInWishlist(quickViewProduct.id) : false}
      />
    </div>
  );
}
