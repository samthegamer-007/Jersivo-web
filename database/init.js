const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'jersivo.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
      console.error('Error opening database:', err);
        } else {
            console.log('Connected to SQLite database');
              }
              });

              // Create products table
              db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS products (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT NOT NULL,
                                      price REAL NOT NULL,
                                            category TEXT NOT NULL,
                                                  image1 TEXT NOT NULL,
                                                        image2 TEXT,
                                                              description TEXT,
                                                                    featured INTEGER DEFAULT 0,
                                                                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                                                              )
                                                                                `, (err) => {
                                                                                    if (err) {
                                                                                          console.error('Error creating products table:', err);
                                                                                              } else {
                                                                                                    console.log('Products table ready');
                                                                                                        }
                                                                                                          });

                                                                                                            // Insert sample products
                                                                                                              const sampleProducts = [
                                                                                                                  {
                                                                                                                        name: 'Manchester United Home 24/25',
                                                                                                                              price: 2499,
                                                                                                                                    category: 'Club Jerseys',
                                                                                                                                          image1: 'https://via.placeholder.com/400x500/cc0000/ffffff?text=Man+Utd+Home',
                                                                                                                                                image2: 'https://via.placeholder.com/400x500/cc0000/ffffff?text=Man+Utd+Back',
                                                                                                                                                      description: 'Official Manchester United home jersey for the 2024/25 season',
                                                                                                                                                            featured: 1
                                                                                                                                                                },
                                                                                                                                                                    {
                                                                                                                                                                          name: 'Argentina World Cup 2022',
                                                                                                                                                                                price: 2799,
                                                                                                                                                                                      category: 'National Team Jerseys',
                                                                                                                                                                                            image1: 'https://via.placeholder.com/400x500/75aadb/ffffff?text=Argentina+Home',
                                                                                                                                                                                                  image2: null,
                                                                                                                                                                                                        description: 'Iconic Argentina World Cup winning jersey',
                                                                                                                                                                                                              featured: 1
                                                                                                                                                                                                                  },
                                                                                                                                                                                                                      {
                                                                                                                                                                                                                            name: 'AC Milan Retro 1988/89',
                                                                                                                                                                                                                                  price: 3199,
                                                                                                                                                                                                                                        category: 'Retro Jerseys',
                                                                                                                                                                                                                                              image1: 'https://via.placeholder.com/400x500/000000/ff0000?text=AC+Milan+Retro',
                                                                                                                                                                                                                                                    image2: null,
                                                                                                                                                                                                                                                          description: 'Classic AC Milan jersey from the golden era',
                                                                                                                                                                                                                                                                featured: 0
                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                      ];

                                                                                                                                                                                                                                                                        const insertStmt = db.prepare(`
                                                                                                                                                                                                                                                                            INSERT OR IGNORE INTO products (name, price, category, image1, image2, description, featured)
                                                                                                                                                                                                                                                                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                                                                                                                                                                                                                                                                  `);

                                                                                                                                                                                                                                                                                    sampleProducts.forEach(product => {
                                                                                                                                                                                                                                                                                        insertStmt.run(
                                                                                                                                                                                                                                                                                              product.name,
                                                                                                                                                                                                                                                                                                    product.price,
                                                                                                                                                                                                                                                                                                          product.category,
                                                                                                                                                                                                                                                                                                                product.image1,
                                                                                                                                                                                                                                                                                                                      product.image2,
                                                                                                                                                                                                                                                                                                                            product.description,
                                                                                                                                                                                                                                                                                                                                  product.featured
                                                                                                                                                                                                                                                                                                                                      );
                                                                                                                                                                                                                                                                                                                                        });

                                                                                                                                                                                                                                                                                                                                          insertStmt.finalize();
                                                                                                                                                                                                                                                                                                                                            console.log('Sample products inserted');
                                                                                                                                                                                                                                                                                                                                            });

                                                                                                                                                                                                                                                                                                                                            module.exports = db;