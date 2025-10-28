import { useState, useEffect } from 'react';
import { X, Upload, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
  subcategories: string[];
}

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

interface ProductFormProps {
  product: Product | null;
  onSave: (product: Partial<Product>) => void;
  onCancel: () => void;
  accessToken: string;
}

export function ProductForm({ product, onSave, onCancel, accessToken }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    category: product?.category || '',
    sizes: product?.sizes?.join(', ') || '',
    colors: product?.colors?.join(', ') || '',
    imageUrl: product?.imageUrl || '',
    stock: product?.stock || 0,
    featured: product?.featured || false,
  });

  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryObj, setSelectedCategoryObj] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories/active`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (accessToken: string): Promise<string | null> => {
    if (!selectedFile) return formData.imageUrl;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedFile);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/upload-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formDataUpload,
        }
      );

      if (response.ok) {
        const { imageUrl } = await response.json();
        return imageUrl;
      } else {
        const error = await response.text();
        console.error('Failed to upload image:', error);
        alert('Failed to upload image');
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalImageUrl = formData.imageUrl;

    // If user selected a file, upload it first
    if (uploadMethod === 'file' && selectedFile) {
      const uploadedUrl = await uploadImage(accessToken);
      if (!uploadedUrl) {
        return; // Upload failed
      }
      finalImageUrl = uploadedUrl;
    }

    const sizesArray = formData.sizes
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    const colorsArray = formData.colors
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    onSave({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price.toString()),
      category: formData.category,
      sizes: sizesArray,
      colors: colorsArray,
      imageUrl: finalImageUrl,
      stock: parseInt(formData.stock.toString()),
      featured: formData.featured,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8 border-0 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Urban Runner Pro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe the product features and benefits..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (KES)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  const cat = categories.find(c => 
                    c.subcategories && c.subcategories.includes(value)
                  );
                  setSelectedCategoryObj(cat || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <optgroup key={category.id} label={category.name}>
                      {category.subcategories && category.subcategories.length > 0 ? (
                        category.subcategories.map((sub) => (
                          <SelectItem key={`${category.id}-${sub}`} value={sub}>
                            {sub}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={category.name}>{category.name}</SelectItem>
                      )}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedCategoryObj 
                  ? `Part of ${selectedCategoryObj.name} category`
                  : 'Select from active categories'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sizes">Available Sizes (comma-separated)</Label>
              <Input
                id="sizes"
                value={formData.sizes}
                onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                placeholder="e.g., 7, 8, 9, 10, 11, 12"
                required
              />
              <p className="text-xs text-muted-foreground">Enter US shoe sizes separated by commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colors">Available Colors (comma-separated)</Label>
              <Input
                id="colors"
                value={formData.colors}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                placeholder="e.g., Black, White, Blue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Product Image</Label>
              <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'url' | 'file')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Image URL
                  </TabsTrigger>
                  <TabsTrigger value="file">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-2">
                  <Input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      setPreviewUrl(e.target.value);
                    }}
                    placeholder="https://example.com/image.jpg"
                    required={uploadMethod === 'url'}
                  />
                  <p className="text-xs text-muted-foreground">Enter a valid image URL</p>
                </TabsContent>

                <TabsContent value="file" className="space-y-2">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      required={uploadMethod === 'file'}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">
                        {selectedFile ? selectedFile.name : 'Click to upload an image'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>

              {previewUrl && (
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="mt-2 relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-muted">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
              />
              <Label htmlFor="featured" className="cursor-pointer">
                Mark as Featured Product
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : product ? 'Update Product' : 'Add Product'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
