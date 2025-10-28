import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Initialize storage bucket for product images
const bucketName = 'make-2ab37a4d-product-images';
(async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
  }
})();

// Admin signup
app.post('/make-server-2ab37a4d/admin/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'admin' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating admin user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Error in admin signup route: ${error}`);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// Get all products
app.get('/make-server-2ab37a4d/products', async (c) => {
  try {
    const products = await kv.getByPrefix('product:');
    return c.json({ products });
  } catch (error) {
    console.log(`Error fetching products: ${error}`);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// Get single product
app.get('/make-server-2ab37a4d/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const product = await kv.get(`product:${id}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    return c.json({ product });
  } catch (error) {
    console.log(`Error fetching product: ${error}`);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

// Create product (protected)
app.post('/make-server-2ab37a4d/products', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while creating product: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const product = await c.req.json();
    const id = crypto.randomUUID();
    const newProduct = {
      ...product,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`product:${id}`, newProduct);
    return c.json({ product: newProduct });
  } catch (error) {
    console.log(`Error creating product: ${error}`);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// Update product (protected)
app.put('/make-server-2ab37a4d/products/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while updating product: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = await kv.get(`product:${id}`);
    
    if (!existing) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const updatedProduct = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`product:${id}`, updatedProduct);
    return c.json({ product: updatedProduct });
  } catch (error) {
    console.log(`Error updating product: ${error}`);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// Delete product (protected)
app.delete('/make-server-2ab37a4d/products/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while deleting product: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    await kv.del(`product:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting product: ${error}`);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// Upload product image (protected)
app.post('/make-server-2ab37a4d/upload-image', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while uploading image: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const fileBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.log(`Error uploading image to storage: ${error.message}`);
      return c.json({ error: 'Failed to upload image' }, 500);
    }

    // Get signed URL for the uploaded image (valid for 10 years)
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 315360000); // 10 years in seconds

    return c.json({ imageUrl: signedUrlData?.signedUrl || '' });
  } catch (error) {
    console.log(`Error in upload image route: ${error}`);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

// Initialize sample data if no products exist
app.post('/make-server-2ab37a4d/init-sample-data', async (c) => {
  try {
    const products = await kv.getByPrefix('product:');
    
    if (products.length === 0) {
      const sampleProducts = [
        // Footwear Products
        {
          id: crypto.randomUUID(),
          name: 'Urban Runner Pro',
          description: 'Premium running shoes with advanced cushioning technology for maximum comfort and performance.',
          price: 8500,
          category: 'Athletic Shoes',
          sizes: [7, 8, 9, 10, 11, 12],
          colors: ['Black', 'White', 'Blue'],
          imageUrl: 'https://images.unsplash.com/photo-1664673605025-413c63a88ad6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydW5uaW5nJTIwc2hvZXMlMjBhdGhsZXRpY3xlbnwxfHx8fDE3NTk3NTM4ODd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 50,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Classic Canvas Sneakers',
          description: 'Timeless casual sneakers perfect for everyday wear. Comfortable and stylish.',
          price: 4500,
          category: 'Canvas Sneakers',
          sizes: [6, 7, 8, 9, 10, 11, 12, 13],
          colors: ['White', 'Navy', 'Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1759542890353-35f5568c1c90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMGNhc3VhbHxlbnwxfHx8fDE3NTk3Nzc1ODh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 75,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Heritage Leather Boots',
          description: 'Rugged leather boots built to last. Perfect for any weather and terrain.',
          price: 12500,
          category: 'Casual Boots',
          sizes: [7, 8, 9, 10, 11, 12],
          colors: ['Brown', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1599012307605-23a0ebe4d321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib290cyUyMGxlYXRoZXJ8ZW58MXx8fHwxNzU5Nzc3NTg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 30,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Executive Oxford Shoes',
          description: 'Sophisticated dress shoes for the modern professional. Handcrafted quality.',
          price: 9800,
          category: 'Oxfords',
          sizes: [7, 8, 9, 10, 11, 12],
          colors: ['Black', 'Brown'],
          imageUrl: 'https://images.unsplash.com/photo-1552422554-0d5af0c79fc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmVzcyUyMHNob2VzJTIwZm9ybWFsfGVufDF8fHx8MTc1OTc3NzU4OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 40,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Elegant Stiletto Heels',
          description: 'Classic high heels that add sophistication to any outfit. Perfect for special occasions.',
          price: 7500,
          category: 'Stilettos',
          sizes: [5, 6, 7, 8, 9, 10],
          colors: ['Black', 'Red', 'Nude'],
          imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWVscyUyMHdvbWVufGVufDF8fHx8MTc1OTc3NzU4OHww&ixlib=rb-4.1.0&q=80&w=1080',
          stock: 35,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Comfortable Ballet Flats',
          description: 'Versatile and comfortable flats for all-day wear. Perfect for the office or casual outings.',
          price: 3500,
          category: 'Ballet Flats',
          sizes: [5, 6, 7, 8, 9, 10],
          colors: ['Black', 'Beige', 'Pink'],
          imageUrl: 'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxsZXQlMjBmbGF0c3xlbnwxfHx8fDE3NTk3Nzc1ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
          stock: 60,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Summer Wedge Sandals',
          description: 'Stylish wedge sandals that provide height and comfort. Perfect for warm weather.',
          price: 5200,
          category: 'Wedge Sandals',
          sizes: [5, 6, 7, 8, 9, 10],
          colors: ['Tan', 'White', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRnZSUyMHNhbmRhbHN8ZW58MXx8fHwxNzU5Nzc3NTg4fDA&ixlib=rb-4.1.0&q=80&w=1080',
          stock: 45,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Trendy Ankle Boots',
          description: 'Fashion-forward ankle boots that pair well with any outfit. Year-round style essential.',
          price: 8800,
          category: 'Ankle Boots',
          sizes: [5, 6, 7, 8, 9, 10],
          colors: ['Black', 'Brown', 'Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmtsZSUyMGJvb3RzfGVufDF8fHx8MTc1OTc3NzU4OHww&ixlib=rb-4.1.0&q=80&w=1080',
          stock: 38,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        
        // Clothes Products
        {
          id: crypto.randomUUID(),
          name: 'Premium Cotton T-Shirt',
          description: 'Soft, breathable cotton t-shirt perfect for everyday wear. Available in multiple colors.',
          price: 1200,
          category: 'T-Shirts',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['White', 'Black', 'Navy', 'Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1696086152504-4843b2106ab4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0LXNoaXJ0JTIwY2xvdGhpbmd8ZW58MXx8fHwxNzU5NzcwOTc4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 100,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Classic Formal Shirt',
          description: 'Elegant formal shirt for professional settings. Wrinkle-resistant fabric.',
          price: 2500,
          category: 'Shirts',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['White', 'Blue', 'Pink'],
          imageUrl: 'https://images.unsplash.com/photo-1648839441609-317150d56096?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGlydCUyMGZvcm1hbHxlbnwxfHx8fDE3NTk4NjI0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 80,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Slim Fit Jeans',
          description: 'Modern slim fit jeans with stretch for comfort. Versatile and durable.',
          price: 3200,
          category: 'Jeans',
          sizes: [28, 30, 32, 34, 36, 38],
          colors: ['Dark Blue', 'Light Blue', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqZWFucyUyMHBhbnRzfGVufDF8fHx8MTc1OTg2MjQ5MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 65,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Elegant Summer Dress',
          description: 'Beautiful flowing dress perfect for summer occasions. Lightweight and comfortable.',
          price: 4200,
          category: 'Dresses',
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Floral', 'Red', 'Navy', 'White'],
          imageUrl: 'https://images.unsplash.com/photo-1635447272615-a414b7ea1df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmVzcyUyMGZhc2hpb258ZW58MXx8fHwxNzU5NzUyOTkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 45,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Stylish Winter Jacket',
          description: 'Warm and fashionable jacket for cold weather. Water-resistant outer layer.',
          price: 6500,
          category: 'Jackets',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['Black', 'Navy', 'Khaki'],
          imageUrl: 'https://images.unsplash.com/photo-1542318418-572cbf7eb3be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYWNrZXQlMjBjb2F0fGVufDF8fHx8MTc1OTc1Mjk5Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 35,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },

        // Essentials Products
        {
          id: crypto.randomUUID(),
          name: 'Premium Toiletry Set',
          description: 'Complete toiletry set including shampoo, conditioner, and body wash. Travel-friendly sizes.',
          price: 1800,
          category: 'Toiletries',
          sizes: ['Standard'],
          colors: ['Multi'],
          imageUrl: 'https://images.unsplash.com/photo-1731336478619-aaeb3ce74f25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b2lsZXRyaWVzJTIwYmF0aHJvb218ZW58MXx8fHwxNzU5ODYyNDkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 90,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Natural Skincare Kit',
          description: 'Organic skincare products for daily use. Suitable for all skin types.',
          price: 3500,
          category: 'Personal Care',
          sizes: ['Standard'],
          colors: ['Natural'],
          imageUrl: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMGNhcmUlMjBwcm9kdWN0c3xlbnwxfHx8fDE3NTk3NjMzNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 70,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Multi-Purpose Cleaning Kit',
          description: 'Complete household cleaning supplies. Eco-friendly and effective.',
          price: 2200,
          category: 'Household Items',
          sizes: ['Standard'],
          colors: ['Multi'],
          imageUrl: 'https://images.unsplash.com/photo-1758523670739-0d26a3ee976d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZWhvbGQlMjBjbGVhbmluZ3xlbnwxfHx8fDE3NTk4NjI0OTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 55,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Premium Stationery Set',
          description: 'High-quality notebook, pens, and accessories for professionals and students.',
          price: 1500,
          category: 'Stationery',
          sizes: ['Standard'],
          colors: ['Assorted'],
          imageUrl: 'https://images.unsplash.com/photo-1550622824-47663976f800?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGF0aW9uZXJ5JTIwbm90ZWJvb2slMjBwZW58ZW58MXx8fHwxNzU5ODYyNDk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 120,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },

        // Appliances Products
        {
          id: crypto.randomUUID(),
          name: 'High-Speed Blender Pro',
          description: 'Powerful 1000W blender for smoothies, soups, and more. Multiple speed settings.',
          price: 8500,
          category: 'Kitchen Appliances',
          sizes: ['Standard'],
          colors: ['Black', 'Silver'],
          imageUrl: 'https://images.unsplash.com/photo-1585237672814-8f85a8118bf6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwYXBwbGlhbmNlcyUyMGJsZW5kZXJ8ZW58MXx8fHwxNzU5NzUzNDY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 25,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Digital Microwave Oven',
          description: '25L capacity microwave with smart cooking presets. Energy efficient.',
          price: 12500,
          category: 'Kitchen Appliances',
          sizes: ['Standard'],
          colors: ['White', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaWNyb3dhdmUlMjBvdmVufGVufDF8fHx8MTc1OTg0MzAzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 18,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Steam Iron Deluxe',
          description: 'Professional steam iron with auto-shutoff and anti-drip technology.',
          price: 4200,
          category: 'Small Appliances',
          sizes: ['Standard'],
          colors: ['Blue', 'Purple'],
          imageUrl: 'https://images.unsplash.com/photo-1669820510004-9a3c83c14645?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpcm9uJTIwYXBwbGlhbmNlfGVufDF8fHx8MTc1OTg2MjQ5NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 40,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },

        // Electronics Products
        {
          id: crypto.randomUUID(),
          name: 'Smartphone XR Plus',
          description: '6.5" display, 128GB storage, quad camera system. Latest Android OS.',
          price: 35000,
          category: 'Phones',
          sizes: ['Standard'],
          colors: ['Black', 'Blue', 'White'],
          imageUrl: 'https://images.unsplash.com/photo-1636308093602-b1f355e8720d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlfGVufDF8fHx8MTc1OTc1Mjc5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 30,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Ultrabook Pro 15',
          description: '15.6" Full HD, Intel i7, 16GB RAM, 512GB SSD. Perfect for work and creativity.',
          price: 85000,
          category: 'Laptops',
          sizes: ['Standard'],
          colors: ['Silver', 'Space Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlcnxlbnwxfHx8fDE3NTk4NDQ4NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 15,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Tablet Max 10',
          description: '10.1" touchscreen, 64GB storage, long battery life. Perfect for entertainment.',
          price: 25000,
          category: 'Tablets',
          sizes: ['Standard'],
          colors: ['Black', 'Silver'],
          imageUrl: 'https://images.unsplash.com/photo-1672239069328-dd1535c0d78a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZXQlMjBkZXZpY2V8ZW58MXx8fHwxNzU5Nzk4MDczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 22,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Wireless Headphones Pro',
          description: 'Active noise cancellation, 30-hour battery, premium sound quality.',
          price: 8500,
          category: 'Audio Devices',
          sizes: ['Standard'],
          colors: ['Black', 'White', 'Red'],
          imageUrl: 'https://images.unsplash.com/photo-1713618651165-a3cf7f85506c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFkcGhvbmVzJTIwYXVkaW98ZW58MXx8fHwxNzU5ODMwODQzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 50,
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const product of sampleProducts) {
        await kv.set(`product:${product.id}`, product);
      }

      return c.json({ success: true, count: sampleProducts.length });
    }

    // Initialize default delivery locations
    const deliveryLocations = await kv.getByPrefix('delivery:');
    if (deliveryLocations.length === 0) {
      const defaultLocations = [
        { id: crypto.randomUUID(), name: 'Nairobi CBD', cost: 0, region: 'Nairobi' },
        { id: crypto.randomUUID(), name: 'Westlands', cost: 0, region: 'Nairobi' },
        { id: crypto.randomUUID(), name: 'Karen', cost: 0, region: 'Nairobi' },
        { id: crypto.randomUUID(), name: 'Kilimani', cost: 0, region: 'Nairobi' },
        { id: crypto.randomUUID(), name: 'Machakos Town', cost: 0, region: 'Machakos' },
        { id: crypto.randomUUID(), name: 'Athi River', cost: 0, region: 'Machakos' },
        { id: crypto.randomUUID(), name: 'Kisumu', cost: 500, region: 'Kisumu' },
        { id: crypto.randomUUID(), name: 'Mombasa', cost: 600, region: 'Mombasa' },
        { id: crypto.randomUUID(), name: 'Nakuru', cost: 400, region: 'Nakuru' },
        { id: crypto.randomUUID(), name: 'Eldoret', cost: 550, region: 'Eldoret' },
      ];

      for (const location of defaultLocations) {
        await kv.set(`delivery:${location.id}`, location);
      }
    }

    return c.json({ success: true, message: 'Products already exist' });
  } catch (error) {
    console.log(`Error initializing sample data: ${error}`);
    return c.json({ error: 'Failed to initialize data' }, 500);
  }
});

// Get all delivery locations
app.get('/make-server-2ab37a4d/delivery-locations', async (c) => {
  try {
    const locations = await kv.getByPrefix('delivery:');
    return c.json({ locations });
  } catch (error) {
    console.log(`Error fetching delivery locations: ${error}`);
    return c.json({ error: 'Failed to fetch delivery locations' }, 500);
  }
});

// Create delivery location (protected)
app.post('/make-server-2ab37a4d/delivery-locations', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while creating delivery location: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const location = await c.req.json();
    const id = crypto.randomUUID();
    const newLocation = {
      ...location,
      id,
    };

    await kv.set(`delivery:${id}`, newLocation);
    return c.json({ location: newLocation });
  } catch (error) {
    console.log(`Error creating delivery location: ${error}`);
    return c.json({ error: 'Failed to create delivery location' }, 500);
  }
});

// Update delivery location (protected)
app.put('/make-server-2ab37a4d/delivery-locations/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while updating delivery location: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = await kv.get(`delivery:${id}`);
    
    if (!existing) {
      return c.json({ error: 'Delivery location not found' }, 404);
    }

    const updatedLocation = {
      ...existing,
      ...updates,
      id,
    };

    await kv.set(`delivery:${id}`, updatedLocation);
    return c.json({ location: updatedLocation });
  } catch (error) {
    console.log(`Error updating delivery location: ${error}`);
    return c.json({ error: 'Failed to update delivery location' }, 500);
  }
});

// Delete delivery location (protected)
app.delete('/make-server-2ab37a4d/delivery-locations/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while deleting delivery location: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    await kv.del(`delivery:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting delivery location: ${error}`);
    return c.json({ error: 'Failed to delete delivery location' }, 500);
  }
});

// Create order
app.post('/make-server-2ab37a4d/orders', async (c) => {
  try {
    const order = await c.req.json();
    const id = crypto.randomUUID();
    const newOrder = {
      ...order,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`order:${id}`, newOrder);
    return c.json({ order: newOrder });
  } catch (error) {
    console.log(`Error creating order: ${error}`);
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

// Initiate M-Pesa payment
app.post('/make-server-2ab37a4d/payment/mpesa', async (c) => {
  try {
    const { phoneNumber, amount, orderId } = await c.req.json();
    
    // TODO: Integrate with M-Pesa Daraja API
    // For now, simulate payment initiation
    const paymentId = crypto.randomUUID();
    const payment = {
      id: paymentId,
      orderId,
      method: 'mpesa',
      phoneNumber,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`payment:${paymentId}`, payment);
    
    return c.json({ 
      success: true, 
      paymentId,
      message: 'M-Pesa STK push sent. Please enter your PIN on your phone.'
    });
  } catch (error) {
    console.log(`Error initiating M-Pesa payment: ${error}`);
    return c.json({ error: 'Failed to initiate M-Pesa payment' }, 500);
  }
});

// Initiate card payment
app.post('/make-server-2ab37a4d/payment/card', async (c) => {
  try {
    const { cardDetails, amount, orderId } = await c.req.json();
    
    // TODO: Integrate with payment gateway (e.g., Stripe, Flutterwave)
    // For now, simulate payment initiation
    const paymentId = crypto.randomUUID();
    const payment = {
      id: paymentId,
      orderId,
      method: 'card',
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`payment:${paymentId}`, payment);
    
    return c.json({ 
      success: true, 
      paymentId,
      message: 'Card payment processing...'
    });
  } catch (error) {
    console.log(`Error initiating card payment: ${error}`);
    return c.json({ error: 'Failed to initiate card payment' }, 500);
  }
});

// Check payment status
app.get('/make-server-2ab37a4d/payment/:paymentId', async (c) => {
  try {
    const paymentId = c.req.param('paymentId');
    const payment = await kv.get(`payment:${paymentId}`);
    
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }
    
    return c.json({ payment });
  } catch (error) {
    console.log(`Error checking payment status: ${error}`);
    return c.json({ error: 'Failed to check payment status' }, 500);
  }
});

// Get all orders (protected - for admin)
app.get('/make-server-2ab37a4d/orders', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while fetching orders: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orders = await kv.getByPrefix('order:');
    // Sort by creation date, newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ orders });
  } catch (error) {
    console.log(`Error fetching orders: ${error}`);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Update order status (protected - for admin)
app.put('/make-server-2ab37a4d/orders/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while updating order: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = await kv.get(`order:${id}`);
    
    if (!existing) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const updatedOrder = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`order:${id}`, updatedOrder);
    return c.json({ order: updatedOrder });
  } catch (error) {
    console.log(`Error updating order: ${error}`);
    return c.json({ error: 'Failed to update order' }, 500);
  }
});

// Get all categories
app.get('/make-server-2ab37a4d/categories', async (c) => {
  try {
    const categories = await kv.getByPrefix('category:');
    return c.json({ categories });
  } catch (error) {
    console.log(`Error fetching categories: ${error}`);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// Get active categories (for frontend)
app.get('/make-server-2ab37a4d/categories/active', async (c) => {
  try {
    const allCategories = await kv.getByPrefix('category:');
    const activeCategories = allCategories.filter(cat => cat.active);
    return c.json({ categories: activeCategories });
  } catch (error) {
    console.log(`Error fetching active categories: ${error}`);
    return c.json({ error: 'Failed to fetch active categories' }, 500);
  }
});

// Create or update category (protected - for admin)
app.post('/make-server-2ab37a4d/categories', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while creating category: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const category = await c.req.json();
    const id = category.id || crypto.randomUUID();
    const newCategory = {
      ...category,
      id,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`category:${id}`, newCategory);
    return c.json({ category: newCategory });
  } catch (error) {
    console.log(`Error creating category: ${error}`);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// Toggle category status (protected - for admin)
app.put('/make-server-2ab37a4d/categories/:id/toggle', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while toggling category: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const existing = await kv.get(`category:${id}`);
    
    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    const updatedCategory = {
      ...existing,
      active: !existing.active,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`category:${id}`, updatedCategory);
    return c.json({ category: updatedCategory });
  } catch (error) {
    console.log(`Error toggling category: ${error}`);
    return c.json({ error: 'Failed to toggle category' }, 500);
  }
});

// Delete category (protected - for admin)
app.delete('/make-server-2ab37a4d/categories/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while deleting category: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    await kv.del(`category:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting category: ${error}`);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

// Add sample products for a specific category (protected)
app.post('/make-server-2ab37a4d/categories/:categoryName/add-products', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      console.log(`Authorization error while adding products: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const categoryName = c.req.param('categoryName');
    const productsByCategory: { [key: string]: any[] } = {
      'Footwear': [
        {
          name: 'Urban Runner Pro',
          description: 'Premium running shoes with advanced cushioning technology for maximum comfort and performance.',
          price: 8500,
          category: 'Athletic Shoes',
          sizes: [7, 8, 9, 10, 11, 12],
          colors: ['Black', 'White', 'Blue'],
          imageUrl: 'https://images.unsplash.com/photo-1664673605025-413c63a88ad6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydW5uaW5nJTIwc2hvZXMlMjBhdGhsZXRpY3xlbnwxfHx8fDE3NTk3NTM4ODd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 50,
          featured: true,
        },
        {
          name: 'Classic Canvas Sneakers',
          description: 'Timeless casual sneakers perfect for everyday wear. Comfortable and stylish.',
          price: 4500,
          category: 'Canvas Sneakers',
          sizes: [6, 7, 8, 9, 10, 11, 12, 13],
          colors: ['White', 'Navy', 'Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1759542890353-35f5568c1c90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMGNhc3VhbHxlbnwxfHx8fDE3NTk3Nzc1ODh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 75,
          featured: true,
        },
        {
          name: 'Heritage Leather Boots',
          description: 'Rugged leather boots built to last. Perfect for any weather and terrain.',
          price: 12500,
          category: 'Casual Boots',
          sizes: [7, 8, 9, 10, 11, 12],
          colors: ['Brown', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1599012307605-23a0ebe4d321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib290cyUyMGxlYXRoZXJ8ZW58MXx8fHwxNzU5Nzc3NTg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 30,
          featured: false,
        },
        {
          name: 'Executive Oxford Shoes',
          description: 'Sophisticated dress shoes for the modern professional. Handcrafted quality.',
          price: 9800,
          category: 'Oxfords',
          sizes: [7, 8, 9, 10, 11, 12],
          colors: ['Black', 'Brown'],
          imageUrl: 'https://images.unsplash.com/photo-1552422554-0d5af0c79fc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmVzcyUyMHNob2VzJTIwZm9ybWFsfGVufDF8fHx8MTc1OTc3NzU4OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 40,
          featured: true,
        },
        {
          name: 'Elegant Stiletto Heels',
          description: 'Classic high heels that add sophistication to any outfit. Perfect for special occasions.',
          price: 7500,
          category: 'Stilettos',
          sizes: [5, 6, 7, 8, 9, 10],
          colors: ['Black', 'Red', 'Nude'],
          imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWVscyUyMHdvbWVufGVufDF8fHx8MTc1OTc3NzU4OHww&ixlib=rb-4.1.0&q=80&w=1080',
          stock: 35,
          featured: true,
        },
      ],
      'Clothes': [
        {
          name: 'Premium Cotton T-Shirt',
          description: 'Soft, breathable cotton t-shirt perfect for everyday wear. Available in multiple colors.',
          price: 1200,
          category: 'T-Shirts',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['White', 'Black', 'Navy', 'Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1696086152504-4843b2106ab4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0LXNoaXJ0JTIwY2xvdGhpbmd8ZW58MXx8fHwxNzU5NzcwOTc4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 100,
          featured: true,
        },
        {
          name: 'Classic Formal Shirt',
          description: 'Elegant formal shirt for professional settings. Wrinkle-resistant fabric.',
          price: 2500,
          category: 'Shirts',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['White', 'Blue', 'Pink'],
          imageUrl: 'https://images.unsplash.com/photo-1648839441609-317150d56096?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGlydCUyMGZvcm1hbHxlbnwxfHx8fDE3NTk4NjI0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 80,
          featured: false,
        },
        {
          name: 'Slim Fit Jeans',
          description: 'Modern slim fit jeans with stretch for comfort. Versatile and durable.',
          price: 3200,
          category: 'Jeans',
          sizes: [28, 30, 32, 34, 36, 38],
          colors: ['Dark Blue', 'Light Blue', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqZWFucyUyMHBhbnRzfGVufDF8fHx8MTc1OTg2MjQ5MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 65,
          featured: true,
        },
        {
          name: 'Elegant Summer Dress',
          description: 'Beautiful flowing dress perfect for summer occasions. Lightweight and comfortable.',
          price: 4200,
          category: 'Dresses',
          sizes: ['S', 'M', 'L', 'XL'],
          colors: ['Floral', 'Red', 'Navy', 'White'],
          imageUrl: 'https://images.unsplash.com/photo-1635447272615-a414b7ea1df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmVzcyUyMGZhc2hpb258ZW58MXx8fHwxNzU5NzUyOTkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 45,
          featured: true,
        },
        {
          name: 'Stylish Winter Jacket',
          description: 'Warm and fashionable jacket for cold weather. Water-resistant outer layer.',
          price: 6500,
          category: 'Jackets',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['Black', 'Navy', 'Khaki'],
          imageUrl: 'https://images.unsplash.com/photo-1542318418-572cbf7eb3be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYWNrZXQlMjBjb2F0fGVufDF8fHx8MTc1OTc1Mjk5Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 35,
          featured: false,
        },
      ],
      'Essentials': [
        {
          name: 'Premium Toiletry Set',
          description: 'Complete toiletry set including shampoo, conditioner, and body wash. Travel-friendly sizes.',
          price: 1800,
          category: 'Toiletries',
          sizes: ['Standard'],
          colors: ['Multi'],
          imageUrl: 'https://images.unsplash.com/photo-1731336478619-aaeb3ce74f25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b2lsZXRyaWVzJTIwYmF0aHJvb218ZW58MXx8fHwxNzU5ODYyNDkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 90,
          featured: false,
        },
        {
          name: 'Natural Skincare Kit',
          description: 'Organic skincare products for daily use. Suitable for all skin types.',
          price: 3500,
          category: 'Personal Care',
          sizes: ['Standard'],
          colors: ['Natural'],
          imageUrl: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbCUyMGNhcmUlMjBwcm9kdWN0c3xlbnwxfHx8fDE3NTk3NjMzNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 70,
          featured: true,
        },
        {
          name: 'Multi-Purpose Cleaning Kit',
          description: 'Complete household cleaning supplies. Eco-friendly and effective.',
          price: 2200,
          category: 'Household Items',
          sizes: ['Standard'],
          colors: ['Multi'],
          imageUrl: 'https://images.unsplash.com/photo-1758523670739-0d26a3ee976d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZWhvbGQlMjBjbGVhbmluZ3xlbnwxfHx8fDE3NTk4NjI0OTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 55,
          featured: false,
        },
        {
          name: 'Premium Stationery Set',
          description: 'High-quality notebook, pens, and accessories for professionals and students.',
          price: 1500,
          category: 'Stationery',
          sizes: ['Standard'],
          colors: ['Assorted'],
          imageUrl: 'https://images.unsplash.com/photo-1550622824-47663976f800?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGF0aW9uZXJ5JTIwbm90ZWJvb2slMjBwZW58ZW58MXx8fHwxNzU5ODYyNDk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 120,
          featured: false,
        },
      ],
      'Appliances': [
        {
          name: 'High-Speed Blender Pro',
          description: 'Powerful 1000W blender for smoothies, soups, and more. Multiple speed settings.',
          price: 8500,
          category: 'Kitchen Appliances',
          sizes: ['Standard'],
          colors: ['Black', 'Silver'],
          imageUrl: 'https://images.unsplash.com/photo-1585237672814-8f85a8118bf6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwYXBwbGlhbmNlcyUyMGJsZW5kZXJ8ZW58MXx8fHwxNzU5NzUzNDY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 25,
          featured: true,
        },
        {
          name: 'Digital Microwave Oven',
          description: '25L capacity microwave with smart cooking presets. Energy efficient.',
          price: 12500,
          category: 'Kitchen Appliances',
          sizes: ['Standard'],
          colors: ['White', 'Black'],
          imageUrl: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaWNyb3dhdmUlMjBvdmVufGVufDF8fHx8MTc1OTg0MzAzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 18,
          featured: true,
        },
        {
          name: 'Steam Iron Deluxe',
          description: 'Professional steam iron with auto-shutoff and anti-drip technology.',
          price: 4200,
          category: 'Small Appliances',
          sizes: ['Standard'],
          colors: ['Blue', 'Purple'],
          imageUrl: 'https://images.unsplash.com/photo-1669820510004-9a3c83c14645?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpcm9uJTIwYXBwbGlhbmNlfGVufDF8fHx8MTc1OTg2MjQ5NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 40,
          featured: false,
        },
      ],
      'Electronics': [
        {
          name: 'Smartphone XR Plus',
          description: '6.5" display, 128GB storage, quad camera system. Latest Android OS.',
          price: 35000,
          category: 'Phones',
          sizes: ['Standard'],
          colors: ['Black', 'Blue', 'White'],
          imageUrl: 'https://images.unsplash.com/photo-1636308093602-b1f355e8720d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlfGVufDF8fHx8MTc1OTc1Mjc5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 30,
          featured: true,
        },
        {
          name: 'Ultrabook Pro 15',
          description: '15.6" Full HD, Intel i7, 16GB RAM, 512GB SSD. Perfect for work and creativity.',
          price: 85000,
          category: 'Laptops',
          sizes: ['Standard'],
          colors: ['Silver', 'Space Grey'],
          imageUrl: 'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlcnxlbnwxfHx8fDE3NTk4NDQ4NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 15,
          featured: true,
        },
        {
          name: 'Tablet Max 10',
          description: '10.1" touchscreen, 64GB storage, long battery life. Perfect for entertainment.',
          price: 25000,
          category: 'Tablets',
          sizes: ['Standard'],
          colors: ['Black', 'Silver'],
          imageUrl: 'https://images.unsplash.com/photo-1672239069328-dd1535c0d78a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZXQlMjBkZXZpY2V8ZW58MXx8fHwxNzU5Nzk4MDczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 22,
          featured: false,
        },
        {
          name: 'Wireless Headphones Pro',
          description: 'Active noise cancellation, 30-hour battery, premium sound quality.',
          price: 8500,
          category: 'Audio Devices',
          sizes: ['Standard'],
          colors: ['Black', 'White', 'Red'],
          imageUrl: 'https://images.unsplash.com/photo-1713618651165-a3cf7f85506c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFkcGhvbmVzJTIwYXVkaW98ZW58MXx8fHwxNzU5ODMwODQzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          stock: 50,
          featured: true,
        },
      ],
    };

    const categoryProducts = productsByCategory[categoryName];
    if (!categoryProducts) {
      return c.json({ error: 'Invalid category name' }, 400);
    }

    const addedProducts = [];
    for (const productData of categoryProducts) {
      const id = crypto.randomUUID();
      const newProduct = {
        ...productData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`product:${id}`, newProduct);
      addedProducts.push(newProduct);
    }

    return c.json({ 
      success: true, 
      count: addedProducts.length,
      products: addedProducts 
    });
  } catch (error) {
    console.log(`Error adding products for category: ${error}`);
    return c.json({ error: 'Failed to add products' }, 500);
  }
});

// Initialize default categories
app.post('/make-server-2ab37a4d/init-categories', async (c) => {
  try {
    const categories = await kv.getByPrefix('category:');
    
    if (categories.length === 0) {
      const defaultCategories = [
        {
          id: crypto.randomUUID(),
          name: 'Footwear',
          description: 'Shoes, boots, sandals, and all types of footwear',
          active: true,
          subcategories: [
            // Women's categories
            'Ballet Flats', 'Canvas Sneakers', 'Slip-On Flats', 'Loafers', 'Mules', 'Espadrilles',
            'Wellington Boots', 'Flip Flops', 'Pumps', 'Kitten Heels', 'Stilettos', 'Block Heels',
            'Ankle Strap Heels', 'Mary Janes', 'Oxfords', 'Brogues', 'Gladiator Sandals',
            'T-Strap Heels', 'Peep Toe Shoes', 'Slingback Heels', 'Wedge Sandals', 'Chunky Heels',
            'Platform Shoes', 'Ankle Boots', 'Chelsea Boots', 'Combat Boots', 'Knee-High Boots',
            'Over-the-Knee Boots', 'Snow Boots',
            // Men's categories
            'Sneakers', 'Boat Shoes', 'Casual Boots', 'Derby Shoes', 'Monk Strap Shoes',
            'Cap Toe Shoes', 'Wingtip Shoes', 'Chukka Boots', 'Desert Boots', 'Work Boots',
            'Hiking Boots', 'Penny Loafers', 'Tassel Loafers', 'Athletic Shoes'
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Clothes',
          description: 'Clothing for men, women, and children',
          active: true,
          subcategories: ['T-Shirts', 'Shirts', 'Pants', 'Dresses', 'Jackets', 'Sweaters', 'Jeans'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Essentials',
          description: 'Daily essentials and necessities',
          active: true,
          subcategories: ['Toiletries', 'Personal Care', 'Household Items', 'Stationery'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Appliances',
          description: 'Home and kitchen appliances',
          active: true,
          subcategories: ['Kitchen Appliances', 'Home Appliances', 'Small Appliances'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Electronics',
          description: 'Electronic devices and gadgets',
          active: true,
          subcategories: ['Phones', 'Laptops', 'Tablets', 'Accessories', 'Audio Devices'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const category of defaultCategories) {
        await kv.set(`category:${category.id}`, category);
      }

      return c.json({ success: true, count: defaultCategories.length });
    }

    return c.json({ success: true, message: 'Categories already exist' });
  } catch (error) {
    console.log(`Error initializing categories: ${error}`);
    return c.json({ error: 'Failed to initialize categories' }, 500);
  }
});

Deno.serve(app.fetch);
