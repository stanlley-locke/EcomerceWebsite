import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLocation: {
    name: string;
    region: string;
    cost: number;
  };
  cart: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedSize: number;
    selectedColor: string;
  }>;
  subtotal: number;
  deliveryCost: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface OrderTrackingProps {
  accessToken: string;
}

export function OrderTracking({ accessToken }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/orders`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        console.error('Failed to load orders:', await response.text());
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/orders/${orderId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        const { order } = await response.json();
        setOrders(orders.map(o => o.id === orderId ? order : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(order);
        }
      } else {
        console.error('Failed to update order status:', await response.text());
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><RefreshCw className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'shipped':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"><Package className="h-3 w-3 mr-1" />Shipped</Badge>;
      case 'delivered':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-blue-900 dark:text-blue-100">{stats.total}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-900 dark:text-yellow-100">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-yellow-900 dark:text-yellow-100">{stats.pending}</div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-900 dark:text-purple-100">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-purple-900 dark:text-purple-100">{stats.processing + stats.shipped}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Processing & shipped</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-900 dark:text-green-100">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-900 dark:text-green-100">KES {stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">From {stats.delivered} delivered orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.deliveryLocation.name}, {order.deliveryLocation.region}
                      </TableCell>
                      <TableCell>{order.cart.length}</TableCell>
                      <TableCell>KES {order.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
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

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="mb-3">Customer Information</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p>{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p>{selectedOrder.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p>{selectedOrder.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Order Date</p>
                      <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <h3 className="mb-3">Delivery Information</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p>{selectedOrder.deliveryLocation.name}, {selectedOrder.deliveryLocation.region}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                    <p>{selectedOrder.deliveryAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Cost</p>
                    <p>{selectedOrder.deliveryCost === 0 ? 'FREE' : `KES ${selectedOrder.deliveryCost.toFixed(2)}`}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="mb-3">Order Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.cart.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.selectedSize}</TableCell>
                          <TableCell>{item.selectedColor}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>KES {item.price.toFixed(2)}</TableCell>
                          <TableCell>KES {(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="mb-3">Order Summary</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>KES {selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{selectedOrder.deliveryCost === 0 ? 'FREE' : `KES ${selectedOrder.deliveryCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (8%)</span>
                    <span>KES {selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span>Total</span>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      KES {selectedOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Update Status */}
              <div>
                <h3 className="mb-3">Update Order Status</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
