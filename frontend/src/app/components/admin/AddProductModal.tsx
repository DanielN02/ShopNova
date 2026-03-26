import { useState } from 'react';
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

const CATEGORIES = ['Electronics', 'Fashion', 'Sports', 'Home & Kitchen', 'Beauty', 'Books'];

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddProductModal({ open, onClose, onCreated }: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    featured: false,
    image: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.price || !form.category || !form.stock) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('category', form.category);
      formData.append('stock', form.stock);
      formData.append('featured', String(form.featured));
      if (form.image) {
        formData.append('image', form.image);
      }

      await productService.create(formData);
      toast.success('Product created successfully!');
      setForm({ name: '', description: '', price: '', category: '', stock: '', featured: false, image: '' });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create product:', err);
      toast.error('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Fill in the details to create a new product.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name *</Label>
            <Input
              id="add-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">Description *</Label>
            <Textarea
              id="add-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-price">Price *</Label>
              <Input
                id="add-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-stock">Stock *</Label>
              <Input
                id="add-stock"
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
            <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-image">Image URL</Label>
            <Input
              id="add-image"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="add-featured"
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="add-featured">Featured product</Label>
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
              Create Product
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
