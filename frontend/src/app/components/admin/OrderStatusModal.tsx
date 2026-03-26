import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { orderService } from '../../services/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Order, OrderStatus } from '../../types';

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface OrderStatusModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function OrderStatusModal({ open, order, onClose, onUpdated }: OrderStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && order) {
      setStatus(order.status);
    }
    if (!isOpen) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !status) return;

    if (status === order.status) {
      toast.info('Status is unchanged');
      return;
    }

    setLoading(true);
    try {
      await orderService.updateStatus(order.id, status);
      toast.success(`Order #${order.id} status updated to ${status}`);
      onUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to update order status:', err);
      toast.error('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            {order ? `Change the status for order #${order.id}` : 'Select a new status'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {order && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p><span className="font-medium text-gray-500">Order:</span> <span className="font-mono font-semibold">#{order.id}</span></p>
              <p><span className="font-medium text-gray-500">Total:</span> <span className="font-semibold">${order.total.toFixed(2)}</span></p>
              <p><span className="font-medium text-gray-500">Current Status:</span> <span className="font-semibold capitalize">{order.status}</span></p>
            </div>
          )}

          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Update Status
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
