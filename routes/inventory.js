const express = require('express');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Middleware para verificar si el usuario está logueado
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Middleware para verificar si el usuario es administrador
function isAdmin(req, res, next) {
  console.log('Verificando si el usuario es admin:', req.session.user);
  if (req.session.user && req.session.user.id_rol === 2) {
      return next();
  }
  res.status(403).send('Acceso denegado: Solo administradores.');
}

// Página de inventario
router.get('/', isAuthenticated, (req, res) => {
    res.render('inventory', { user: req.session.user });
});

/*  // 1. Visualizar y Añadir Productos (Old)
router.get('/products', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM productos', (err, results) => {
      if (err) throw err;
      res.render('addProduct', { productos: results, user: req.session.user });
    });
});
*/

/* OLD // 1. Visualizar y Añadir Productos
router.get('/products', isAuthenticated, (req, res) => {
    // Primero obtenemos los proveedores
    db.query('SELECT * FROM proveedores', (err, proveedores) => {
      if (err) throw err;
  
      // Luego obtenemos las categorías
      db.query('SELECT * FROM categorias', (err, categorias) => {
        if (err) throw err;
  
        // Luego obtenemos las localizaciones
        db.query('SELECT * FROM localizaciones', (err, localizaciones) => {
          if (err) throw err;
  
          // Finalmente obtenemos los productos
          db.query('SELECT * FROM productos', (err, productos) => {
            if (err) throw err;
  
            // Renderizamos la vista y pasamos los datos de productos, proveedores, categorías, localizaciones y usuario
            res.render('addProduct', { productos, proveedores, categorias, localizaciones, user: req.session.user });
          });
        });
      });
    });
  });

  */

  // 1. Visualizar y Añadir Productos
router.get('/products', isAuthenticated, (req, res) => {
  // Consulta para obtener los productos junto con sus nombres de proveedor, categoría y localización
  const query = `
    SELECT p.*, 
           prov.nombre_proveedor, 
           cat.nombre_categoria, 
           loc.nombre_localizacion
    FROM productos p
    -- Unir tabla de proveedores a través de la tabla intermedia producto_proveedor
    JOIN producto_proveedor pp ON p.id_producto = pp.id_producto
    JOIN proveedores prov ON pp.id_proveedor = prov.id_proveedor
    -- Unir tabla de categorías a través de la tabla intermedia producto_categoria
    JOIN producto_categoria pc ON p.id_producto = pc.id_producto
    JOIN categorias cat ON pc.id_categoria = cat.id_categoria
    -- Unir tabla de localizaciones directamente
    JOIN localizaciones loc ON p.id_localizacion = loc.id_localizacion;
  `;

  // Primero obtenemos los proveedores
  db.query('SELECT * FROM proveedores', (err, proveedores) => {
    if (err) throw err;

    // Luego obtenemos las categorías
    db.query('SELECT * FROM categorias', (err, categorias) => {
      if (err) throw err;

      // Luego obtenemos las localizaciones
      db.query('SELECT * FROM localizaciones', (err, localizaciones) => {
        if (err) throw err;

        // Finalmente obtenemos los productos con la consulta JOIN
        db.query(query, (err, productos) => {
          if (err) throw err;

          // Renderizamos la vista y pasamos los datos de productos, proveedores, categorías, localizaciones y usuario
          res.render('addProduct', { productos, proveedores, categorias, localizaciones, user: req.session.user });
        });
      });
    });
  });
});
  
  
/*

// Old 
  router.post('/products/add', (req, res) => {
    const { nombre, marca, precio, costo, medida, stock, stock_minimo, observaciones } = req.body;
    db.query('INSERT INTO productos (nombre_producto, marca, precio, costo, medida, stock, stock_minimo, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [nombre, marca, precio, costo, medida, stock, stock_minimo, observaciones], 
    (err, result) => {
      if (err) throw err;
      res.redirect('/inventory/products');
    });
  });
*/

router.post('/products/add', (req, res) => {
    const { nombre, marca, precio, costo, medida, stock, stock_minimo, proveedor, categoria, localizacion, observaciones } = req.body;
  
    // Insertar el producto en la tabla 'productos'
    db.query('INSERT INTO productos (nombre_producto, marca, precio, costo, medida, stock, stock_minimo, id_localizacion, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    [nombre, marca, precio, costo, medida, stock, stock_minimo, localizacion, observaciones], 
    (err, result) => {
      if (err) throw err;
  
      const productoId = result.insertId; // Obtener el ID del producto recién insertado
  
      // Insertar en la tabla intermedia 'producto_proveedor'
      db.query('INSERT INTO producto_proveedor (id_producto, id_proveedor) VALUES (?, ?)', [productoId, proveedor], (err, result) => {
        if (err) throw err;
  
        // Insertar en la tabla intermedia 'producto_categoria'
        db.query('INSERT INTO producto_categoria (id_producto, id_categoria) VALUES (?, ?)', [productoId, categoria], (err, result) => {
          if (err) throw err;
  
          // Redirigir a la página de productos después de añadir el producto
          res.redirect('/inventory/products');
        });
      });
    });
  });

  // Eliminar producto
router.post('/products/delete/:id', (req, res) => {
  const productId = req.params.id;

  console.log(`Intentando eliminar el producto con ID: ${productId}`);

  // Verificar si el producto está relacionado con otras entidades en tablas intermedias
  const deleteFromProductCategory = 'DELETE FROM producto_categoria WHERE id_producto = ?';
  const deleteFromProductSupplier = 'DELETE FROM producto_proveedor WHERE id_producto = ?';
  const deleteProduct = 'DELETE FROM productos WHERE id_producto = ?';

  // Eliminar primero de las tablas intermedias
  db.query(deleteFromProductCategory, [productId], (err, result) => {
    if (err) {
      console.error('Error eliminando producto de producto_categoria:', err);
      req.flash('error', 'Error al eliminar la relación con la categoría.');
      return res.redirect('/inventory/products');
    }

    db.query(deleteFromProductSupplier, [productId], (err, result) => {
      if (err) {
        console.error('Error eliminando producto de producto_proveedor:', err);
        req.flash('error', 'Error al eliminar la relación con el proveedor.');
        return res.redirect('/inventory/products');
      }

      // Si ya no hay relaciones, eliminar el producto de la tabla principal
      db.query(deleteProduct, [productId], (err, result) => {
        if (err) {
          console.error('Error eliminando el producto:', err);
          req.flash('error', 'Error al eliminar el producto.');
          return res.redirect('/inventory/products');
        }

        req.flash('success', 'Producto eliminado.');
        res.redirect('/inventory/products');
      });
    });
  });
});
  
  
  // 2. Visualizar y Añadir Categorías
  router.get('/categories', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM categorias', (err, results) => {
      if (err) throw err;
      res.render('addCategory', { categorias: results, user: req.session.user });
    });
  });
  
  router.post('/categories/add', (req, res) => {
    const { nombre } = req.body;
    db.query('INSERT INTO categorias (nombre_categoria) VALUES (?)', [nombre], (err, result) => {
      if (err) throw err;
      res.redirect('/inventory/categories');
    });
  });

// Eliminar categoría
router.post('/categories/delete/:id', (req, res) => {
  const categoryId = req.params.id;

  console.log(`Intentando eliminar la categoría con ID: ${categoryId}`);

  // Primero, verificar si la categoría está relacionada con algún producto
  db.query('SELECT COUNT(*) AS count FROM producto_categoria WHERE id_categoria = ?', [categoryId], (err, result) => {
      if (err) throw err;

      console.log('Resultado de la consulta:', result);
      const relatedProductsCount = result[0].count;
      console.log(`Número de productos relacionados: ${relatedProductsCount}`);

      if (relatedProductsCount > 0) {
          // Si hay productos relacionados, mostrar mensaje de error
          req.flash('error', 'La categoría no se puede eliminar porque está relacionada con productos existentes.');
          res.redirect('/inventory/categories');
      } else {
          // Si no hay productos relacionados, proceder con la eliminación
          db.query('DELETE FROM categorias WHERE id_categoria = ?', [categoryId], (err, result) => {
              if (err) throw err;

              req.flash('success', 'Categoría eliminada.');
              res.redirect('/inventory/categories');
          });
      }
  });
});

/*
  // Eliminar categoría
router.post('/categories/delete/:id', (req, res) => {
  const categoryId = req.params.id;
  
  db.query('DELETE FROM categorias WHERE id_categoria = ?', [categoryId], (err, result) => {
    if (err) throw err;
    res.redirect('/inventory/categories'); // Redirigir después de eliminar
  });
});
*/
  
  // 3. Visualizar y Añadir Proveedores
  router.get('/suppliers', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM proveedores', (err, results) => {
      if (err) throw err;
      res.render('addSupplier', { proveedores: results, user: req.session.user });
    });
  });
  
  router.post('/suppliers/add', (req, res) => {
    const { nombre, telefono, web, email } = req.body;
    db.query('INSERT INTO proveedores (nombre_proveedor, telefono, web, email) VALUES (?, ?, ?, ?)', [nombre, telefono, web, email], (err, result) => {
      if (err) throw err;
      res.redirect('/inventory/suppliers');
    });
  });

// Eliminar proveedores
router.post('/suppliers/delete/:id', (req, res) => {
  const supplierId = req.params.id;

  console.log(`Intentando eliminar el proveedor con ID: ${supplierId}`);

  // Primero, verificar si el proveedor está relacionado con algún producto
  db.query('SELECT COUNT(*) AS count FROM producto_proveedor WHERE id_proveedor = ?', [supplierId], (err, result) => {
      if (err) throw err;

      console.log('Resultado de la consulta:', result);
      const relatedProductsCount = result[0].count;
      console.log(`Número de productos relacionados: ${relatedProductsCount}`);

      if (relatedProductsCount > 0) {
          // Si hay productos relacionados, mostrar mensaje de error
          req.flash('error', 'El proveedor no se puede eliminar porque está relacionado con productos existentes.');
          res.redirect('/inventory/suppliers');
      } else {
          // Si no hay productos relacionados, proceder con la eliminación
          db.query('DELETE FROM proveedores WHERE id_proveedor = ?', [supplierId], (err, result) => {
              if (err) throw err;

              req.flash('success', 'Proveedor eliminado.');
              res.redirect('/inventory/suppliers');
          });
      }
  });
});
  
  // 4. Visualizar y Añadir Localizaciones
  router.get('/locations', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM localizaciones', (err, results) => {
      if (err) throw err;
      res.render('addLocation', { localizaciones: results, user: req.session.user });
    });
  });
  
  router.post('/locations/add', (req, res) => {
    const { nombre } = req.body;
    db.query('INSERT INTO localizaciones (nombre_localizacion) VALUES (?)', [nombre], (err, result) => {
      if (err) throw err;
      res.redirect('/inventory/locations');
    });
  });

  // Eliminar localizaciones
router.post('/locations/delete/:id', (req, res) => {
  const locationId = req.params.id;

  console.log(`Intentando eliminar la localización con ID: ${locationId}`);

  // Primero, verificar si la localización está relacionada con algún producto
  db.query('SELECT COUNT(*) AS count FROM productos WHERE id_localizacion = ?', [locationId], (err, result) => {
      if (err) throw err;

      console.log('Resultado de la consulta:', result);
      const relatedProductsCount = result[0].count;
      console.log(`Número de productos relacionados: ${relatedProductsCount}`);

      if (relatedProductsCount > 0) {
          // Si hay productos relacionados, mostrar mensaje de error
          req.flash('error', 'La localización no se puede eliminar porque está relacionada con productos existentes.');
          res.redirect('/inventory/locations');
      } else {
          // Si no hay productos relacionados, proceder con la eliminación
          db.query('DELETE FROM localizaciones WHERE id_localizacion = ?', [locationId], (err, result) => {
              if (err) throw err;

              req.flash('success', 'Localización eliminada.');
              res.redirect('/inventory/locations');
          });
      }
  });
});
  
  // 5. Visualizar Productos con Stock Mínimo
  router.get('/low-stock', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM productos WHERE stock < stock_minimo', (err, results) => {
      if (err) throw err;
      res.render('lowStock', { productos: results, user: req.session.user });
    });
  });

  /* OLD
  // 6. Gestionar Usuarios (Solo para Admins)
  router.get('/users', isAdmin, (req, res) => {
    db.query('SELECT * FROM usuarios', (err, results) => {
      if (err) throw err;
      res.render('manageUsers', { usuarios: results });
    });
  });

  */

// 6. Gestionar Usuarios (Solo para Admins)
router.get('/users', isAdmin, (req, res) => {
  const query = `
    SELECT u.*, r.nombre_rol 
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
  `;

  db.query(query, (err, results) => {
    if (err) throw err;

    // Consulta para obtener todos los roles
    const rolesQuery = 'SELECT * FROM roles'; // Suponiendo que tienes una tabla roles
    db.query(rolesQuery, (err, roles) => {
      if (err) throw err;

      // Pasar la lista de usuarios y roles a la vista
      res.render('manageUsers', { usuarios: results, roles: roles });
    });
  });
});
  
  router.post('/users/add', isAdmin, (req, res) => {
    const { nombre, apellidos, email, telefono, password, rol } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.query('INSERT INTO usuarios (nombre_usuario, apellidos, email, telefono, password, id_rol) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, apellidos, email, telefono, hashedPassword, rol], (err, result) => {
        if (err) throw err;
        res.redirect('/inventory/users');
      }
    );
  });

// Ruta combinada para eliminar usuarios y administradores
router.post('/users/delete/:id', (req, res) => {
  const userId = req.params.id;

  console.log(`Intentando eliminar el usuario con ID: ${userId}`);

 // Ruta combinada para eliminar usuarios (administrador o usuario básico)
router.post('/users/delete/:id', (req, res) => {
  const userId = req.params.id;

  console.log(`Intentando eliminar el usuario con ID: ${userId}`);

  // Comprobar el rol del usuario mediante una consulta con JOIN
  const query = `
    SELECT roles.nombre_rol 
    FROM usuarios 
    JOIN roles ON usuarios.id_rol = roles.id_rol 
    WHERE usuarios.id_usuario = ?`;

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error al obtener el rol del usuario:', err);
      req.flash('error', 'Error al eliminar el usuario.');
      return res.redirect('/inventory/users');
    }

    if (result.length > 0) {
      const roleName = result[0].nombre_rol;

      // Proceder con la eliminación según el rol
      db.query('DELETE FROM usuarios WHERE id_usuario = ?', [userId], (err) => {
        if (err) {
          console.error(`Error al eliminar el usuario ${roleName}:`, err);
          req.flash('error', `Error al eliminar el ${roleName}.`);
          return res.redirect('/inventory/users');
        }

        req.flash('success', `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} eliminado exitosamente.`);
        res.redirect('/inventory/users');
      });
    } else {
      req.flash('error', 'Usuario no encontrado.');
      res.redirect('/inventory/users');
    }
  });
});
});

  /* //Ruta para cerrar sesión en entorno de desarrollo
router.get('/logout', (req, res) => {
    // Destruir la sesión
    req.session.destroy((err) => {
      if (err) {
        return res.redirect('/inventory'); // Si hay un error, redirige de vuelta
      }
      res.clearCookie('connect.sid'); // Limpia la cookie de sesión
      res.redirect('/login'); // Redirige al usuario a la página de login
    });
  });
*/

/* //Ruta para cerrar sesión en producción - version simple
router.get('/logout', (req, res) => {
  // Eliminar la sesión establecida con cookie-session
  req.session = null; // Esto elimina la cookie de sesión

  // Redirigir al usuario a la página de login
  res.redirect('/login');
});
*/

// Ruta para cerrar sesión en producción
router.get('/logout', (req, res) => {
  try {
      // Intentar eliminar la sesión
      req.session = null; // Esto elimina la cookie de sesión

      // Redirigir al usuario a la página de login
      res.redirect('/login');
  } catch (err) {
      console.error('Error al cerrar sesión:', err);

      // Si hay un error, redirigir a la página de inventario
      res.redirect('/inventory');
  }
});


module.exports = router;