const express = require('express');
const bcrypt = require('bcryptjs'); 
const db = require('../config/db');
const router = express.Router();

// Página de inicio de sesión
router.get('/login', (req, res) => {
  res.render('login'); // Renderiza la vista login.ejs
});

// Página de registro
router.get('/register', (req, res) => {
  res.render('registro'); // Renderiza la vista registro.ejs
});

// Ruta para registrar usuario
router.post('/register', async (req, res) => {
  const { nombre, apellidos, email, telefono, password } = req.body;

  try {
    // Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(password, 10);

    // Asignar un rol predeterminado (2 = admin, 1 = usuario basico)
    const id_rol = 1; // Asigna por defecto el rol de usuario basico

    // Guardar el usuario con la contraseña hasheada en la base de datos
    db.query(
      'INSERT INTO usuarios (nombre_usuario, apellidos, email, telefono, password, id_rol) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, apellidos, email, telefono, hashedPassword, id_rol],
      (err, result) => {
        if (err) {
          console.error('Error al registrar el usuario:', err);
          return res.status(500).send('Error al registrar el usuario');
        }

         // Mensaje de éxito al registrar
         req.flash('success', 'Usuario registrado correctamente');
        console.log('Usuario registrado exitosamente:', result);
        res.redirect('/login');
      }
    );
  } catch (error) {
    console.error('Error durante el proceso de registro:', error);
    res.status(500).send('Error en el servidor');
  }
});

// Manejo de inicio de sesión
router.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    // Buscar usuario por email
    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Error al buscar el usuario:', err);
        return res.status(500).send('Error en el servidor');
      }
  
      // Verificar si el usuario existe
      if (results.length === 0) {
        console.log('Usuario no encontrado');
        return res.status(401).send('Usuario o contraseña incorrecta');
      }
  
      // Obtener el usuario y hash de contraseña
      const user = results[0];
      console.log('Usuario encontrado:', user);
  
      // Verificar si la contraseña ingresada es correcta
      const validPass = await bcrypt.compare(password, user.password);
      console.log('Contraseña ingresada:', password); 
      console.log('Contraseña hasheada almacenada:', user.password);
      console.log('Resultado de la comparación:', validPass);
  
      if (!validPass) {
        console.log('Contraseña incorrecta');
        return res.status(401).send('Usuario o contraseña incorrecta');
      }
      
  
      /* OLD // Si la contraseña es correcta, iniciar sesión
      req.session.user = user;
      */
  
      // Si la contraseña es correcta, iniciar sesión
      req.session.user = {
        id: user.id_usuario,
        nombre: user.nombre_usuario,
        id_rol: user.id_rol // Asignar el rol de usuario
      };

console.log('Sesión iniciada:', req.session.user);
res.redirect('/inventory'); // Redirige a la página de inventario

    });
  });

module.exports = router;