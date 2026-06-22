const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'catalogo.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al abrir base de datos:', err);
    } else {
        console.log('Conectado a catalogo.db');
    }
});

module.exports = async (req, res) => {
    // CORS COMPLETO para Android
    const origin = req.headers.origin || '*';
    
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET' && !req.query.id) {
            db.all('SELECT * FROM productos ORDER BY id ASC', (err, rows) => {
                if (err) {
                    console.error('Error en SELECT:', err);
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.json(rows);
            });
            return;
        }

        if (req.method === 'GET' && req.query.id) {
            db.get('SELECT * FROM productos WHERE id = ?', [parseInt(req.query.id)], (err, row) => {
                if (err) {
                    console.error('Error en SELECT by ID:', err);
                    res.status(500).json({ error: err.message });
                    return;
                }
                if (!row) {
                    res.status(404).json({ error: 'Producto no encontrado' });
                    return;
                }
                res.json(row);
            });
            return;
        }

        if (req.method === 'POST') {
            const { id, nombre, categoria, precio, imagen, es_oferta, disponible } = req.body;

            if (!id || !nombre || !categoria || !precio) {
                res.status(400).json({ error: 'ID, nombre, categoría y precio son requeridos' });
                return;
            }

            db.get('SELECT id FROM productos WHERE id = ?', [parseInt(id)], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                if (row) {
                    res.status(409).json({ error: `El ID ${id} ya está en uso` });
                    return;
                }

                db.run(
                    'INSERT INTO productos (id, nombre, categoria, precio, imagen, es_oferta, disponible) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [parseInt(id), nombre.trim(), categoria.trim(), parseFloat(precio), imagen || '', es_oferta ? 1 : 0, disponible !== false ? 1 : 0],
                    function(err) {
                        if (err) {
                            console.error('Error en INSERT:', err);
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({ id: this.lastID, message: 'Producto creado' });
                    }
                );
            });
            return;
        }

        if (req.method === 'PUT' && req.query.id) {
            const id = parseInt(req.query.id);
            const { nombre, categoria, precio, imagen, es_oferta, disponible } = req.body;

            if (!nombre || !categoria || !precio) {
                res.status(400).json({ error: 'Nombre, categoría y precio son requeridos' });
                return;
            }

            db.run(
                'UPDATE productos SET nombre = ?, categoria = ?, precio = ?, imagen = ?, es_oferta = ?, disponible = ? WHERE id = ?',
                [nombre.trim(), categoria.trim(), parseFloat(precio), imagen || '', es_oferta ? 1 : 0, disponible !== false ? 1 : 0, id],
                function(err) {
                    if (err) {
                        console.error('Error en UPDATE:', err);
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'Producto no encontrado' });
                        return;
                    }
                    res.json({ message: 'Producto actualizado' });
                }
            );
            return;
        }

        if (req.method === 'DELETE' && req.query.id) {
            const id = parseInt(req.query.id);

            db.run('DELETE FROM productos WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Error en DELETE:', err);
                    res.status(500).json({ error: err.message });
                    return;
                }
                if (this.changes === 0) {
                    res.status(404).json({ error: 'Producto no encontrado' });
                    return;
                }
                res.json({ message: 'Producto eliminado' });
            });
            return;
        }

        res.status(405).json({ error: 'Método no soportado' });

    } catch (error) {
        console.error('Error en API:', error);
        res.status(500).json({ 
            error: error.message || 'Error interno del servidor'
        });
    }
};