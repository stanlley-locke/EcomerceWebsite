import { useState, useEffect } from 'react';
import { Plus, Trash2, Power, PowerOff, Package, PackagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
  subcategories: string[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryManagementProps {
  accessToken: string;
}

export function CategoryManagement({ accessToken }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subcategories: '',
  });

  useEffect(() => {
    initializeCategories();
  }, []);

  const initializeCategories = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/init-categories`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/init-sample-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      // Load categories after initialization
      await loadCategories();
    } catch (error) {
      console.error('Error initializing categories:', error);
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        console.error('Failed to load categories:', await response.text());
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = async (id: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories/${id}/toggle`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const { category } = await response.json();
        setCategories(categories.map(c => c.id === id ? category : c));
      } else {
        console.error('Failed to toggle category:', await response.text());
        alert('Failed to toggle category');
      }
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Error toggling category');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== id));
        toast.success('Category deleted successfully');
      } else {
        console.error('Failed to delete category:', await response.text());
        toast.error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error deleting category');
    }
  };

  const addSampleProducts = async (categoryName: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories/${categoryName}/add-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const { count } = await response.json();
        toast.success(`Successfully added ${count} sample products to ${categoryName}!`);
      } else {
        console.error('Failed to add products:', await response.text());
        toast.error('Failed to add sample products');
      }
    } catch (error) {
      console.error('Error adding sample products:', error);
      toast.error('Error adding sample products');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const subcategories = formData.subcategories
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/categories`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            subcategories,
            active: false,
          }),
        }
      );

      if (response.ok) {
        const { category } = await response.json();
        setCategories([...categories, category]);
        setShowForm(false);
        setFormData({ name: '', description: '', subcategories: '' });
      } else {
        console.error('Failed to create category:', await response.text());
        alert('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category');
    }
  };

  const activeCategories = categories.filter(c => c.active).length;
  const inactiveCategories = categories.filter(c => !c.active).length;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      {categories.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
          <CardContent className="py-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Quick Start:</strong> Click "Add Products" button on each category to add sample products. Products from active categories will appear on the storefront.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-blue-900 dark:text-blue-100">{categories.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All categories</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-900 dark:text-green-100">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-900 dark:text-green-100">{activeCategories}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Visible to customers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-900 dark:text-gray-100">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-gray-900 dark:text-gray-100">{inactiveCategories}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Hidden from customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Store Categories</CardTitle>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No categories yet. Add your first category!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4>{category.name}</h4>
                        {category.active ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <Power className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <PowerOff className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {category.description}
                      </p>
                      {category.subcategories && category.subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {category.subcategories.slice(0, 8).map((sub, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {sub}
                            </Badge>
                          ))}
                          {category.subcategories.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{category.subcategories.length - 8} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSampleProducts(category.name)}
                        className="bg-green-50 hover:bg-green-100 dark:bg-green-950/50 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                      >
                        <PackagePlus className="h-4 w-4 mr-2" />
                        Add Products
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`toggle-${category.id}`} className="text-xs">
                          {category.active ? 'Deactivate' : 'Activate'}
                        </Label>
                        <Switch
                          id={`toggle-${category.id}`}
                          checked={category.active}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteCategory(category.id)}
                        disabled={category.active}
                        title={category.active ? 'Deactivate category before deleting' : 'Delete category'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Accessories, Bags, Jewelry"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description *</Label>
              <Textarea
                id="category-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this category"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-subcategories">
                Subcategories <span className="text-xs text-muted-foreground">(optional, comma-separated)</span>
              </Label>
              <Textarea
                id="category-subcategories"
                value={formData.subcategories}
                onChange={(e) => setFormData({ ...formData, subcategories: e.target.value })}
                placeholder="e.g., Handbags, Backpacks, Wallets, Clutches"
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              * New categories are created as inactive. Activate them to make them visible to customers.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', description: '', subcategories: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
