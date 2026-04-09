import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { productService } from '../../services/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Product } from '../../types';

interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

interface EditProductModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditProductModal({ open, product, onClose, onUpdated }: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    featured: false,
    image: '',
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (product && categories.length > 0) {
      const categoryId = categories.find(c => c.name === product.category)?.id;
      setForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        category_id: categoryId ? String(categoryId) : '',
        stock: String(product.stock),
        featured: product.featured,
        image: product.image || '',
      });
    }
  }, [product, categories]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await productService.getCategories();
      setCategories(response.data.categories || response.data || []);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!form.name || !form.description || !form.price || !form.category_id || !form.stock) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: parseInt(form.category_id),
        tags: [],
        in_stock: parseInt(form.stock) > 0,
        image_url: form.image || null,
      };

      await productService.update(product.id, payload);
      toast.success('Product updated successfully!');
      onUpdated();
      onClose();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || 'Failed to update product. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update the product details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Textarea
              id="edit-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stock">Stock *</Label>
              <Input
                id="edit-stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={form.category_id} onValueChange={(val) => setForm({ ...form, category_id: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {loadingCategories ? (
                  <div className="p-2 text-sm text-gray-500">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No categories available</div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.icon && <span className="mr-2">{cat.icon}</span>}
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-image">Image URL</Label>
            <Input
              id="edit-image"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="edit-featured"
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="edit-featured">Featured product</Label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Product
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
