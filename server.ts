import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Pool } from 'pg';
import { products, categories, suppliers, reviews } from "./src/data"; // fallback data

// Setup postgres pool
// If DATABASE_URL is not provided, it will stay null and we'll serve mock data
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  console.log("Database connection initialized");
} else {
  console.log("No DATABASE_URL found. Using fallback mock data.");
}

async function setupDatabase() {
  if (!pool) return;
  try {
    console.log("Testing database connection...");
    await pool.query('SELECT 1');
    console.log("Running automatic database updates...");
    
    // Create Categories Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        "nameEn" VARCHAR(255),
        "nameFr" VARCHAR(255),
        "imageUrl" TEXT,
        icon VARCHAR(100)
      )
    `);

    // Create Suppliers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        location VARCHAR(255),
        verified BOOLEAN,
        rating FLOAT
      )
    `);

    // Create Products Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        "nameEn" VARCHAR(255),
        "nameFr" VARCHAR(255),
        "descriptionEn" TEXT,
        "descriptionFr" TEXT,
        "priceFcfa" INTEGER,
        category VARCHAR(255),
        "imageUrl" TEXT,
        "supplierId" VARCHAR(255),
        "isFeatured" BOOLEAN,
        badges TEXT[]
      )
    `);

    // Alter table to add new columns if they do not exist
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[],
      ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "isTrending" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS specifications JSONB
    `);

    // Create Reviews Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        author VARCHAR(255),
        "roleEn" VARCHAR(255),
        "roleFr" VARCHAR(255),
        "contentEn" TEXT,
        "contentFr" TEXT,
        rating FLOAT
      )
    `);

    // Seed data if empty (Categories)
    const catCheck = await pool.query('SELECT count(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      for (const cat of categories) {
        await pool.query(
          'INSERT INTO categories (id, "nameEn", "nameFr", "imageUrl", icon) VALUES ($1, $2, $3, $4, $5)',
          [cat.id, cat.nameEn, cat.nameFr, cat.imageUrl, cat.icon]
        );
      }
    }

    // Seed data if empty (Suppliers)
    const supCheck = await pool.query('SELECT count(*) FROM suppliers');
    if (parseInt(supCheck.rows[0].count) === 0) {
      for (const sup of suppliers) {
        await pool.query(
          'INSERT INTO suppliers (id, name, location, verified, rating) VALUES ($1, $2, $3, $4, $5)',
          [sup.id, sup.name, sup.location, sup.verified, sup.rating]
        );
      }
    }

    // Seed data if empty (Products)
    const prodCheck = await pool.query('SELECT count(*) FROM products');
    if (parseInt(prodCheck.rows[0].count) === 0) {
      for (const prod of products) {
        await pool.query(
          'INSERT INTO products (id, "nameEn", "nameFr", "descriptionEn", "descriptionFr", "priceFcfa", category, "imageUrl", "supplierId", "isFeatured", badges, "imageUrls", "stockQuantity", "isTrending", specifications) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
          [prod.id, prod.nameEn, prod.nameFr, prod.descriptionEn, prod.descriptionFr, prod.priceFcfa, prod.category, prod.imageUrl, prod.supplierId, prod.isFeatured || false, prod.badges || [], prod.imageUrls || [], prod.stockQuantity || 0, prod.isTrending || false, JSON.stringify(prod.specifications || [])]
        );
      }
    }

    // Seed data if empty (Reviews)
    const revCheck = await pool.query('SELECT count(*) FROM reviews');
    if (parseInt(revCheck.rows[0].count) === 0) {
      for (const rev of reviews) {
        await pool.query(
          'INSERT INTO reviews (id, author, "roleEn", "roleFr", "contentEn", "contentFr", rating) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [rev.id, rev.author, rev.roleEn, rev.roleFr, rev.contentEn, rev.contentFr, rev.rating]
        );
      }
    }

    console.log("Database update and setup completed successfully.");
  } catch (err) {
    console.error("Setup DB error during startup (falling back to mock data):", err);
    pool = null;
  }
}

async function startServer() {
  await setupDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API ROUTES
  
  // Products API
  app.get("/api/products", async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM products');
        return res.json(result.rows);
      } catch (err) {
        console.error("Database error fetching products:", err);
        // Fallback to mock data if table doesn't exist yet
        return res.json(products);
      }
    }
    // Return mock data
    res.json(products);
  });

  // Create Product API
  app.post("/api/products", async (req, res) => {
    const prod = req.body;
    const newId = `prod-${Date.now()}`;
    if (pool) {
      try {
        await pool.query(
          'INSERT INTO products (id, "nameEn", "nameFr", "descriptionEn", "descriptionFr", "priceFcfa", category, "imageUrl", "supplierId", "isFeatured", badges, "imageUrls", "stockQuantity", "isTrending", specifications) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
          [newId, prod.nameEn, prod.nameFr, prod.descriptionEn, prod.descriptionFr, prod.priceFcfa, prod.category, prod.imageUrl, prod.supplierId, prod.isFeatured || false, prod.badges || [], prod.imageUrls || [], prod.stockQuantity || 0, prod.isTrending || false, JSON.stringify(prod.specifications || [])]
        );
        return res.status(201).json({ id: newId });
      } catch (err) {
        console.error("Database error creating product:", err);
        return res.status(500).json({ error: "Failed to create product" });
      }
    }
    // Mock
    return res.status(201).json({ id: newId });
  });

  // Update Product API
  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const prod = req.body;
    if (pool) {
      try {
        await pool.query(
          'UPDATE products SET "nameEn"=$1, "nameFr"=$2, "descriptionEn"=$3, "descriptionFr"=$4, "priceFcfa"=$5, category=$6, "imageUrl"=$7, "supplierId"=$8, "isFeatured"=$9, badges=$10, "imageUrls"=$11, "stockQuantity"=$12, "isTrending"=$13, specifications=$14 WHERE id=$15',
          [prod.nameEn, prod.nameFr, prod.descriptionEn, prod.descriptionFr, prod.priceFcfa, prod.category, prod.imageUrl, prod.supplierId, prod.isFeatured || false, prod.badges || [], prod.imageUrls || [], prod.stockQuantity || 0, prod.isTrending || false, JSON.stringify(prod.specifications || []), id]
        );
        return res.json({ success: true });
      } catch (err) {
        console.error("Database error updating product:", err);
        return res.status(500).json({ error: "Failed to update product" });
      }
    }
    return res.json({ success: true });
  });

  // Delete Product API
  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    if (pool) {
      try {
        await pool.query('DELETE FROM products WHERE id=$1', [id]);
        return res.json({ success: true });
      } catch (err) {
        console.error("Database error deleting product:", err);
        return res.status(500).json({ error: "Failed to delete product" });
      }
    }
    return res.json({ success: true });
  });

  // Categories API
  app.get("/api/categories", async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM categories');
        return res.json(result.rows);
      } catch (err) {
        console.error("Database error fetching categories:", err);
        return res.json(categories);
      }
    }
    // Return mock data
    res.json(categories);
  });

  // Providers API
  app.get("/api/suppliers", async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM suppliers');
        return res.json(result.rows);
      } catch (err) {
        return res.json(suppliers);
      }
    }
    res.json(suppliers);
  });
  
  // Reviews API
  app.get("/api/reviews", async (req, res) => {
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM reviews');
        return res.json(result.rows);
      } catch (err) {
        return res.json(reviews);
      }
    }
    res.json(reviews);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
