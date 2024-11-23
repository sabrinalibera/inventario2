// Si no estamos en entorno de producción, cargar variables de entorno desde .env en entorno de desarrollo
if (process.env.NODE_ENV != "production" ) {
const dotenv = require('dotenv');
dotenv.config({path: './env/.env'});
}

/* // Cargar variables de entorno desde .env en entorno de desarrollo
const dotenv = require('dotenv');
dotenv.config({path: './env/.env'});
*/

const express = require('express');
const session = require('cookie-session'); //usar 'const session = require('express-session');' en entorno de desarrollo
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('connect-flash');

const app = express();

// Importar rutas
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');

// Configuración de vistas y CSS
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET, // Usar variable de entorno como clave
  resave: false,         // No guardar sesión si no hay cambios
  saveUninitialized: false, // No guardar sesiones vacías
  cookie: { secure: false } // false = sitio no usa HTTPS, de lo contrario true
}));

app.use(flash());

// Middleware para pasar los mensajes flash a las vistas
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Redirigir la ruta raíz '/' al login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Rutas
app.use('/', authRoutes);
app.use('/inventory', inventoryRoutes);

// Servidor escuchando, PORT es una variable que corresponde a la variable de entorno o a 3000
app.listen(process.env.PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${process.env.PORT}`);
});