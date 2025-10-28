import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DeliveryLocation {
  id: string;
  name: string;
  cost: number;
  region: string;
}

interface DeliveryManagementProps {
  accessToken: string;
}

export function DeliveryManagement({ accessToken }: DeliveryManagementProps) {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DeliveryLocation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cost: 0,
    region: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/delivery-locations`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      } else {
        console.error('Failed to load delivery locations:', await response.text());
      }
    } catch (error) {
      console.error('Error loading delivery locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery location?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/delivery-locations/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setLocations(locations.filter(l => l.id !== id));
      } else {
        const error = await response.text();
        console.error('Failed to delete delivery location:', error);
        alert('Failed to delete delivery location');
      }
    } catch (error) {
      console.error('Error deleting delivery location:', error);
      alert('Error deleting delivery location');
    }
  };

  const handleSave = async () => {
    try {
      if (editingLocation) {
        // Update existing location
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/delivery-locations/${editingLocation.id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          }
        );

        if (response.ok) {
          const { location } = await response.json();
          setLocations(locations.map(l => l.id === location.id ? location : l));
        } else {
          const error = await response.text();
          console.error('Failed to update delivery location:', error);
          alert('Failed to update delivery location');
          return;
        }
      } else {
        // Create new location
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2ab37a4d/delivery-locations`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          }
        );

        if (response.ok) {
          const { location } = await response.json();
          setLocations([...locations, location]);
        } else {
          const error = await response.text();
          console.error('Failed to create delivery location:', error);
          alert('Failed to create delivery location');
          return;
        }
      }

      setShowForm(false);
      setEditingLocation(null);
      setFormData({ name: '', cost: 0, region: '' });
    } catch (error) {
      console.error('Error saving delivery location:', error);
      alert('Error saving delivery location');
    }
  };

  const handleEdit = (location: DeliveryLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      cost: location.cost,
      region: location.region,
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setFormData({ name: '', cost: 0, region: '' });
    setShowForm(true);
  };

  const freeDeliveryCount = locations.filter(l => l.cost === 0).length;
  const paidDeliveryCount = locations.filter(l => l.cost > 0).length;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-green-900 dark:text-green-100">Free Delivery Zones</CardTitle>
            <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-900 dark:text-green-100">{freeDeliveryCount}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Locations with free delivery</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-orange-900 dark:text-orange-100">Paid Delivery Zones</CardTitle>
            <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-orange-900 dark:text-orange-100">{paidDeliveryCount}</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Locations with delivery fees</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Delivery Locations</CardTitle>
          <Button 
            onClick={handleAddNew}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading delivery locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No delivery locations yet. Add your first location!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Delivery Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.region}</TableCell>
                      <TableCell>
                        {location.cost === 0 ? 'FREE' : `KES ${location.cost.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {location.cost === 0 ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Free Delivery</Badge>
                        ) : (
                          <Badge variant="secondary">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(location.id)}
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Delivery Location' : 'Add Delivery Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Nairobi CBD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="e.g., Nairobi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Delivery Cost (KES)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0 for free delivery"
              />
              <p className="text-xs text-muted-foreground">Enter 0 for free delivery</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {editingLocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
