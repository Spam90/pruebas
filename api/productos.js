const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mflamrkyqjipbbjevfgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGFtcmt5cWppcGJiamV2Zmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDc2NzgsImV4cCI6MjA5NzU4MzY3OH0.ASKpXVxk5nuaoZqGi5P9TuM55Lurju8BZbdK0fPVUB8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            
            // Forzar no caché en Android
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.json(data);
            return;
        }

        if (req.method === 'GET' && req.query.id) {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('id', parseInt(req.query.id))
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ error: 'Producto no encontrado' });
                    return;
                }
                throw error;
            }
            res.json(data);
            return;
        }

        if (req.method === 'POST') {
            const { id, nombre, categoria, precio, imagen, es_oferta, disponible } = req.body;

            if (!id || !nombre || !categoria || !precio) {
                res.status(400).json({ error: 'ID, nombre, categoría y precio son requeridos' });
                return;
            }

            const { data: existing } = await supabase
                .from('productos')
                .select('id')
                .eq('id', parseInt(id))
                .single();

            if (existing) {
                res.status(409).json({ error: `El ID ${id} ya está en uso` });
                return;
            }

            const { data, error } = await supabase
                .from('productos')
                .insert({
                    id: parseInt(id),
                    nombre: nombre.trim(),
                    categoria: categoria.trim(),
                    precio: parseFloat(precio),
                    imagen: imagen || '',
                    es_oferta: es_oferta ? 1 : 0,
                    disponible: disponible !== false ? 1 : 0
                })
                .select();

            if (error) throw error;
            res.json({ id: data[0].id, message: 'Producto creado' });
            return;
        }

        if (req.method === 'PUT' && req.query.id) {
            const id = parseInt(req.query.id);
            const { nombre, categoria, precio, imagen, es_oferta, disponible } = req.body;

            if (!nombre || !categoria || !precio) {
                res.status(400).json({ error: 'Nombre, categoría y precio son requeridos' });
                return;
            }

            const { error } = await supabase
                .from('productos')
                .update({
                    nombre: nombre.trim(),
                    categoria: categoria.trim(),
                    precio: parseFloat(precio),
                    imagen: imagen || '',
                    es_oferta: es_oferta ? 1 : 0,
                    disponible: disponible !== false ? 1 : 0
                })
                .eq('id', id);

            if (error) throw error;
            res.json({ message: 'Producto actualizado' });
            return;
        }

        if (req.method === 'DELETE' && req.query.id) {
            const id = parseInt(req.query.id);

            const { error } = await supabase
                .from('productos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ message: 'Producto eliminado' });
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
