import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ProductForm } from './ProductForm';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
  subcategories: string[];
}

interface ProductManagementProps {
  accessToken: string;
}

export function ProductManagement({ accessToken }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      // Initialize categories and sample data
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/init-categories`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/init-sample-data`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      // Load the data
      await loadProducts();
      await loadCategories();
    } catch (error) {
      console.error('Error initializing data:', error);
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/products`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        console.error('Failed to load products:', await response.text());
      }
    } catch (error) {
      console.error('Error loading products:', error);
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
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/products/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setProducts(products.filter((p) => p.id !== id));
      } else {
        const error = await response.text();
        console.error('Failed to delete product:', error);
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const handleSave = async (productData: Partial<Product>) => {
    try {
      if (editingProduct) {
        // Update existing product
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/products/${editingProduct.id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
          }
        );

        if (response.ok) {
          const { product } = await response.json();
          setProducts(products.map((p) => (p.id === product.id ? product : p)));
        } else {
          const error = await response.text();
          console.error('Failed to update product:', error);
          alert('Failed to update product');
          return;
        }
      } else {
        // Create new product
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/products`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
          }
        );

        if (response.ok) {
          const { product } = await response.json();
          setProducts([...products, product]);
        } else {
          const error = await response.text();
          console.error('Failed to create product:', error);
          alert('Failed to create product');
          return;
        }
      }

      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  // Get all subcategories from active categories
  const allSubcategories = categories.flatMap((c) => c.subcategories || [c.name]);
  
  // Filter products
  const filteredProducts = selectedCategory === 'all'
    ? products.filter((p) => allSubcategories.includes(p.category))
    : products.filter((p) => p.category === selectedCategory);

  // Get product count per category
  const categoryStats = allSubcategories.map((cat) => ({
    name: cat,
    count: products.filter((p) => p.category === cat).length,
  }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-blue-900 dark:text-blue-100">
              {filteredProducts.length}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {selectedCategory === 'all' ? 'All categories' : selectedCategory}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-900 dark:text-green-100">
              Total Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-900 dark:text-green-100">
              {filteredProducts.reduce((sum, p) => sum + p.stock, 0)}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Units available</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-900 dark:text-purple-100">
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-purple-900 dark:text-purple-100">
              KES {filteredProducts.reduce((sum, p) => sum + p.price * p.stock, 0).toFixed(2)}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Total value</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Management */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <CardTitle>Products by Category</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allSubcategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({categoryStats.find((s) => s.name === cat)?.count || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleAddNew}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">
                No products in this category. Add your first product!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                          <ImageWithFallback
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{product.name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {product.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>KES {product.price.toFixed(2)}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        {product.featured && <Badge variant="secondary">Featured</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
