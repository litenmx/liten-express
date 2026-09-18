const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// URL BASE: PRODUCCIÓN ACTIVA (ENTORNO REAL)
const BASE_URL = 'https://guias-api.enviafacil.shop/api/v1';

// ---------------------------------------------------------
// DATOS LEGALES Y SUCURSAL LITEN EXPRESS
// ---------------------------------------------------------
const DATOS_NEGOCIO = {
  razon_social: "COMERCIO ELECTRÓNICO LITEN SA DE CV",
  rfc: "CEL-040929-AH4",
  marca: "Liten Express Paquetería",
  calle_numero: "Constituyentes 3170",
  referencia: "(Entre F. Canal y E. Morales)",
  colonia_cp: "Centro, Veracruz, Ver. CP 91700",
  contacto: "Tel y WhatsApp: 229-667-6770"
};

// ---------------------------------------------------------
// BASE DE DATOS DE USUARIOS, ROLES Y TARIFAS LITEN EXPRESS
// ---------------------------------------------------------
const adminUser = process.env.APP_USER || 'admin';
const adminPass = process.env.APP_PASSWORD || 'Liten2026*';

const BASE_DATOS_USUARIOS = {
  // CAJEROS LOCALES (Generan guías + Tarifa Local 125%/65%)
  [adminUser]: { pass: adminPass, rol: 'cajero', tarifa: 'local' },
  "deyanira": { pass: "@Alan2015*", rol: 'cajero', tarifa: 'local' },
  "Jorge": { pass: "@Alan2015*", rol: 'cajero', tarifa: 'local' },
  "caja1": { pass: "@Liten123*", rol: 'cajero', tarifa: 'local' },
  "caja2": { pass: "@Liten123*", rol: 'cajero', tarifa: 'local' },
  "joseluis": { pass: "Pablito1122", rol: 'cajero', tarifa: 'local' },

  // SOLO LECTURA LOCAL (Solo cotizan + Tarifa Local 125%/65%)
  "cotizador": { pass: "cotiza", rol: 'solo_lectura', tarifa: 'local' },

  // CAJERO COMERCIAL (Generan guías + Tarifa Comercial 150%/90%)
  "guiascomerciales": { pass: "@Alan2015*", rol: 'cajero', tarifa: 'comercial' },

  // SOLO LECTURA COMERCIAL (Solo cotizan + Tarifa Comercial 150%/90%)
  "moball": { pass: "llegodios123", rol: 'solo_lectura', tarifa: 'comercial' },
  "cotizaya": { pass: "Cotiza2026", rol: 'solo_lectura', tarifa: 'comercial' }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==========================================
// FUNCIÓN PARA LEER COOKIES (SIN LIBRERÍAS EXTRA)
// ==========================================
function parseCookies(request) {
    const list = {};
    const cookieHeader = request.headers?.cookie;
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });
    return list;
}

// ==========================================
// SISTEMA DE SESIÓN WEB (LOGIN FORMULARIO)
// ==========================================

// 1. Mostrar Pantalla de Login
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acceso - Liten Express</title>
            <style>
                body { background: #f1f5f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: -apple-system, sans-serif; color: #1e293b; }
                .login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); width: 100%; max-width: 360px; text-align: center; }
                .login-card h2 { color: #1e40af; margin-bottom: 5px; font-size: 20px; }
                .login-card p { color: #64748b; font-size: 13px; margin-bottom: 25px; }
                input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
                input:focus { outline: none; border-color: #2563eb; }
                button { width: 100%; background: #2563eb; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px; }
                button:hover { background: #1d4ed8; }
            </style>
        </head>
        <body>
            <div class="login-card">
                <img src="/logo.png" style="max-height: 90px; margin-bottom: 10px;" alt="Liten Express" onerror="this.style.display='none'">
                <h2>COMERCIO ELECTRÓNICO LITEN</h2>
                <p>Acceso al Portal de Operaciones</p>
                <form action="/login" method="POST">
                    <input type="text" name="usuario" placeholder="Usuario" required autocomplete="off">
                    <input type="password" name="password" placeholder="Contraseña" required>
                    <button type="submit">Ingresar al Portal</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 2. Procesar Login
app.post('/login', (req, res) => {
    const { usuario, password } = req.body;
    const usuarioDb = BASE_DATOS_USUARIOS[usuario];

    if (usuarioDb && usuarioDb.pass === password) {
        // Genera un token simple y lo guarda en cookie por 12 horas
        const token = Buffer.from(usuario + ':' + password).toString('base64');
        res.setHeader('Set-Cookie', 'liten_auth=' + token + '; HttpOnly; Path=/; Max-Age=43200');
        return res.redirect('/');
    }
    // Si falla, regresa con alerta
    res.send('<script>alert("Credenciales incorrectas. Intente de nuevo."); window.location.href="/login";</script>');
});

// 3. Cerrar Sesión
app.get('/logout', (req, res) => {
    // Destruye la cookie
    res.setHeader('Set-Cookie', 'liten_auth=; HttpOnly; Path=/; Max-Age=0');
    res.redirect('/login');
});

// ==========================================
// CANDADO GENERAL PARA RUTAS PROTEGIDAS
// ==========================================
app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const token = cookies['liten_auth'];

  if (token) {
      const [usuario, password] = Buffer.from(token, 'base64').toString().split(':');
      const usuarioDb = BASE_DATOS_USUARIOS[usuario];
      
      if (usuarioDb && usuarioDb.pass === password) {
          req.usuarioLiten = usuario; 
          req.rolLiten = usuarioDb.rol;
          req.tarifaLiten = usuarioDb.tarifa;
          return next();
      }
  }
  // Si no hay sesión, manda a login
  return res.redirect('/login');
});

// ==========================================
// PORTAL WEB LITEN EXPRESS (PROTEGIDO)
// ==========================================
app.get('/', (req, res) => {
  const usuarioActual = req.usuarioLiten;
  const rolActual = req.rolLiten;
  const tarifaActual = req.tarifaLiten;

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liten Express - Portal de Envíos</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        /* Se añade padding-bottom de 60px para que la barra flotante no tape el botón de imprimir u otro contenido inferior */
        body { background: #f1f5f9; margin: 0; padding: 20px 14px 60px 14px; color: #1e293b; }
        .container { max-width: 780px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        
        .logo-container { text-align: center; margin-bottom: 16px; }
        .logo-container img { max-height: 180px; max-width: 100%; height: auto; border-radius: 8px; object-fit: contain; }

        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
        .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .badge-seguridad { background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
        .badge-solo-lectura { background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; display: ${rolActual === 'solo_lectura' ? 'inline-block' : 'none'}; margin-top: 5px; }
        .badge-tarifa { background: #fef08a; color: #854d0e; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 5px; }
        .btn-logout { background: #ef4444; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block; }
        .btn-logout:hover { background: #dc2626; }

        .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 18px 0 10px; border-left: 4px solid #2563eb; padding-left: 8px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .full { grid-column: span 2; }
        label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #475569; }
        input, select { width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; background-color: #fff; }
        input:focus, select:focus { outline: none; border-color: #2563eb; }
        .btn-primary { width: 100%; background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-success { background: #16a34a; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .btn-success:hover { background: #15803d; }
        .btn-print { background: #475569; color: #fff; border: none; padding: 12px 18px; border-radius: 6px; font-size: 15px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 15px; display: none; }
        .btn-print:hover { background: #334155; }

        .card-servicio { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; background: #f8fafc; }
        .precio { font-size: 18px; font-weight: 700; color: #15803d; }
        #seccionEmision { display: none; margin-top: 24px; padding-top: 18px; border-top: 2px dashed #cbd5e1; }
        .exito-box { background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 8px; margin-top: 18px; }
        .error { color: #b91c1c; background: #fee2e2; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 10px; }
        
        .desglose-precios { display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 180px; }
        .rubro-precio { font-size: 13px; color: #475569; margin-bottom: 4px; }
        .peso-facturado { color: #1e40af; font-weight: 600; font-size: 12px; margin-top: 4px; display: inline-block; background: #dbeafe; padding: 2px 6px; border-radius: 4px; }
        
        .alerta-cargos { background: #fef08a; color: #854d0e; padding: 8px 10px; border-radius: 6px; font-size: 11px; margin-top: 8px; border: 1px solid #fde047; }
        .alerta-cargos ul { margin: 4px 0 0 0; padding-left: 20px; }
        .nota-operativa { font-weight: bold; font-style: italic; }

        /* ========================================================= */
        /* BARRA FIJA INFERIOR DE SOPORTE Y CONCESIONES (3 COLUMNAS) */
        /* ========================================================= */
        .footer-soporte {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: #1e293b; 
            color: #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            font-size: 11px;
            z-index: 1000;
            box-shadow: 0 -3px 12px rgba(0,0,0,0.2);
            border-top: 2px solid #2563eb;
            gap: 15px;
        }
        .footer-soporte strong { color: #60a5fa; font-weight: 700; }
        .footer-concesiones { color: #94a3b8; font-size: 10px; text-align: right; }
        .footer-centro { flex: 1; text-align: center; color: #cbd5e1; font-weight: bold; font-size: 11px; letter-spacing: 0.5px; }

        /* Animación del Punto Verde */
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            background-color: #22c55e;
            border-radius: 50%;
            margin-right: 6px;
            box-shadow: 0 0 8px #22c55e;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        
        /* Estilos del Recibo (Ocultos en pantalla normal) */
        #reciboLiten { display: none; }

        /* ========================================================= */
        /* FORMATO DE IMPRESIÓN (TAMAÑO CARTA / A4 - CARETA)         */
        /* ========================================================= */
        @media print {
          body * { visibility: hidden; } 
          body { background: white; margin: 0; padding: 0; }
          #reciboLiten, #reciboLiten * { visibility: visible; } 
          
          /* OCULTAMOS LA BARRA DE SOPORTE AL IMPRIMIR PARA NO MANCHAR EL RECIBO */
          .footer-soporte { display: none !important; }
          
          #reciboLiten { 
            display: block; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 30px; 
            font-family: Arial, Helvetica, sans-serif; 
            color: #000;
            line-height: 1.5;
          }
          @page { margin: 1cm; size: letter; }
          
          /* Encabezado / Membrete */
          .recibo-header { display: flex; justify-content: space-between; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 25px; }
          .recibo-logo { max-height: 80px; max-width: 250px; }
          .recibo-empresa { text-align: right; font-size: 11px; color: #333; }
          .recibo-empresa strong { font-size: 14px; display: block; color: #000; }
          
          /* Título Central */
          .recibo-titulo { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; letter-spacing: 1px; text-transform: uppercase; }
          .recibo-meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; font-weight: bold; }
          
          /* 2 Columnas: Remitente / Destino */
          .recibo-columnas { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 30px; }
          .recibo-col { flex: 1; border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
          .recibo-col h4 { margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; color: #1e40af; text-transform: uppercase; font-size: 13px; }
          .recibo-dato-linea { font-size: 12px; margin-bottom: 5px; }
          
          /* Tabla Operativa */
          .recibo-tabla { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .recibo-tabla th, .recibo-tabla td { border: 1px solid #aaa; padding: 12px; text-align: left; font-size: 13px; }
          .recibo-tabla th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; color: #000; }
          
          /* Total */
          .recibo-total { text-align: right; font-size: 22px; margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; }
          
          /* Legales y Firma */
          .recibo-footer { margin-top: 40px; font-size: 10px; color: #444; text-align: justify; }
          .recibo-firma-box { text-align: center; margin-top: 80px; page-break-inside: avoid; }
          .recibo-firma-linea { border-top: 1px solid #000; width: 300px; margin: 0 auto 10px auto; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-container">
          <img src="/logo.png" alt="Liten Express" onerror="this.style.display='none'">
        </div>

        <div class="header">
          <div>
            <h1>Liten Express</h1>
            <p>Hola, <strong>${usuarioActual}</strong> - Generador de Guías</p>
            <span class="badge-tarifa">🏷️ Aplicando Tarifa: ${tarifaActual.toUpperCase()}</span>
            <span class="badge-solo-lectura">⚠️ Modo Consulta (Generar guías desactivado)</span>
          </div>
          <div style="text-align: right;">
            <span class="badge-seguridad">🔒 Entorno Real Activo</span><br><br>
            <a href="/logout" class="btn-logout">Cerrar Sesión</a>
          </div>
        </div>

        <!-- PASO 1: COTIZACIÓN -->
        <form id="cotizadorForm">
          <div class="section-title">1. Dimensiones y Destino para Cotizar</div>
          <div class="form-grid">
            <div>
              <label>C.P. Origen</label>
              <input type="text" id="cpOrigen" required maxlength="5" value="91698">
            </div>
            <div>
              <label>Colonia Origen</label>
              <input type="text" id="coloniaOrigen" required value="hacienda sotavento">
            </div>
            <div>
              <label>C.P. Destino</label>
              <input type="text" id="cpDestino" required maxlength="5" value="22210">
            </div>
            <div>
              <label>Colonia Destino</label>
              <input type="text" id="coloniaDestino" required value="torres del lago">
            </div>
            <div>
              <label>Peso (kg)</label>
              <input type="number" id="peso" required min="1" value="1">
            </div>
            <div>
              <label>Largo (cm)</label>
              <input type="number" id="largo" required min="1" value="10">
            </div>
            <div>
              <label>Ancho (cm)</label>
              <input type="number" id="ancho" required min="1" value="10">
            </div>
            <div>
              <label>Alto (cm)</label>
              <input type="number" id="alto" required min="1" value="10">
            </div>
          </div>
          <button type="submit" id="btnCotizar" class="btn-primary">Cotizar Paqueterías (Entorno Real)</button>
        </form>

        <div id="resultadosCotizacion" style="margin-top: 20px;"></div>

        <!-- PASO 2: DATOS DEL CLIENTE Y ENVÍO -->
        <div id="seccionEmision">
          <div class="section-title" id="tituloServicioSeleccionado">2. Datos de Remitente y Destinatario</div>
          <form id="emisionForm">
            <div style="font-weight: 600; color: #1e40af; margin-bottom: 6px;">Remitente (Origen)</div>
            <div class="form-grid">
              <div>
                <label>Nombre del remitente</label>
                <input type="text" id="remNombre" required placeholder="Ej. Juan Pérez">
              </div>
              <div>
                <label>Empresa (Opcional)</label>
                <input type="text" id="remEmpresa" value="${DATOS_NEGOCIO.marca}">
              </div>
              
              <div>
                <label>Tipo de Identificación</label>
                <select id="remIdTipo" required>
                  <option value="" disabled selected>Selecciona una opción...</option>
                  <option value="INE/IFE">INE / IFE</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Cédula Profesional">Cédula Profesional</option>
                  <option value="Cartilla Militar">Cartilla Militar</option>
                  <option value="Doc. Migratorio">Documento Migratorio</option>
                </select>
              </div>
              <div>
                <label>Núm. de Identificación</label>
                <input type="text" id="remIdNum" required placeholder="Clave de Elector, Folio, etc.">
              </div>

              <div>
                <label>Calle y Número</label>
                <input type="text" id="remCalle" required placeholder="Av. Principal 123">
              </div>
              <div>
                <label>Ciudad</label>
                <input type="text" id="remCiudad" required placeholder="Ej. Veracruz">
              </div>
              <div>
                <label>Estado (Código o Nombre)</label>
                <input type="text" id="remEstado" required placeholder="Ej. VER">
              </div>
              <div>
                <label>Teléfono (10 dígitos)</label>
                <input type="tel" id="remTelefono" required pattern="[0-9]{10}" placeholder="2291234567">
              </div>
            </div>

            <div style="font-weight: 600; color: #1e40af; margin-top: 14px; margin-bottom: 6px;">Destinatario (Cliente Final)</div>
            <div class="form-grid">
              <div>
                <label>Nombre del cliente</label>
                <input type="text" id="destNombre" required placeholder="Ej. María López">
              </div>
              <div>
                <label>Empresa (Opcional)</label>
                <input type="text" id="destEmpresa" placeholder="Particular">
              </div>
              <div>
                <label>Calle y Número</label>
                <input type="text" id="destCalle" required placeholder="Calle 45 No. 678">
              </div>
              <div>
                <label>Ciudad</label>
                <input type="text" id="destCiudad" required placeholder="Ej. Tijuana">
              </div>
              <div>
                <label>Estado (Código o Nombre)</label>
                <input type="text" id="destEstado" required placeholder="Ej. BC">
              </div>
              <div>
                <label>Teléfono del cliente (10 dígitos)</label>
                <input type="tel" id="destTelefono" required pattern="[0-9]{10}" placeholder="6641234567">
              </div>
              <div class="full">
                <label>Contenido del paquete</label>
                <input type="text" id="paqContenido" required placeholder="Ej. Ropa, Calzado, Artículos varios">
              </div>
            </div>

            <button type="submit" id="btnGenerarGuia" class="btn-primary" style="background: #16a34a; margin-top: 10px;">
              Confirmar y Generar Guía Oficial
            </button>
          </form>

          <div id="resultadoFinal"></div>
          <button id="btnImprimirRecibo" class="btn-print" onclick="window.print()">🖨️ Imprimir Formato de Envío (Tamaño Carta)</button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- NUEVO RECIBO TAMAÑO CARTA OCULTO (CARETA OFICIAL)        -->
      <!-- ======================================================== -->
      <div id="reciboLiten">
          
          <!-- Membrete -->
          <div class="recibo-header">
              <div>
                  <img src="/logo.png" class="recibo-logo" alt="Logo Liten Express" onerror="this.style.display='none'">
              </div>
              <div class="recibo-empresa">
                  <strong>${DATOS_NEGOCIO.razon_social}</strong>
                  ${DATOS_NEGOCIO.marca}<br>
                  ${DATOS_NEGOCIO.calle_numero} ${DATOS_NEGOCIO.referencia}<br>
                  ${DATOS_NEGOCIO.colonia_cp}<br>
                  ${DATOS_NEGOCIO.contacto}
              </div>
          </div>

          <div class="recibo-titulo">COMPROBANTE OFICIAL DE ENVÍO Y RECEPCIÓN</div>
          
          <div class="recibo-meta">
              <div>Cajero Atendió: <span style="font-weight:normal;">${usuarioActual}</span></div>
              <div>Fecha de Emisión: <span id="rFecha" style="font-weight:normal;"></span></div>
          </div>

          <!-- Datos de Clientes a 2 Columnas -->
          <div class="recibo-columnas">
              <div class="recibo-col">
                  <h4>Datos del Remitente</h4>
                  <div class="recibo-dato-linea"><strong>Nombre:</strong> <span id="rRemNombre"></span></div>
                  <div class="recibo-dato-linea"><strong>Identificación:</strong> <span id="rRemIdentificacion"></span></div>
                  <div class="recibo-dato-linea"><strong>Teléfono:</strong> <span id="rRemTel"></span></div>
              </div>
              <div class="recibo-col">
                  <h4>Datos del Destinatario</h4>
                  <div class="recibo-dato-linea"><strong>Nombre:</strong> <span id="rDestNombre"></span></div>
                  <div class="recibo-dato-linea"><strong>Dirección:</strong> <span id="rDestDir"></span></div>
                  <div class="recibo-dato-linea"><strong>C.P.:</strong> <span id="rDestCP"></span></div>
                  <div class="recibo-dato-linea"><strong>Teléfono:</strong> <span id="rDestTel"></span></div>
              </div>
          </div>

          <!-- Tabla de Servicio -->
          <table class="recibo-tabla">
              <thead>
                  <tr>
                      <th>Paquetería Asignada</th>
                      <th>Número de Rastreo</th>
                      <th>Contenido Declarado</th>
                      <th>Peso Facturado</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td><strong id="rPaqueteria"></strong></td>
                      <td><strong id="rRastreo" style="font-size:16px;"></strong></td>
                      <td id="rContenido"></td>
                      <td><span id="rPeso"></span> kg</td>
                  </tr>
              </tbody>
          </table>

          <div class="recibo-total">
              <strong>TOTAL COBRADO: $<span id="rTotal"></span> MXN</strong>
          </div>
          
          <!-- Legales y Firma -->
          <div class="recibo-footer">
              <p><strong>ATENCIÓN AL CLIENTE Y RASTREO DE PAQUETES:</strong><br>
              Todo seguimiento, reclamo o duda respecto al estatus y tiempo de entrega de su paquete es <strong>exclusivamente</strong> a través de la empresa de paquetería asignada. Liten Express proporciona los siguientes medios de contacto directos de su paquetería:<br>
              Teléfono Oficial: <strong id="rPaqTel"></strong> | Portal Web: <strong id="rPaqWeb"></strong><br>
              <em>Nota aclaratoria: Esta sucursal opera únicamente como centro de recepción y emisión de envíos. La oficina solo recibe y genera sus guías, mas no cuenta con área operativa de paquetería para realizar rastreos, resolver reclamos, indemnizaciones o justificar demoras.</em></p>

              <p><strong>TÉRMINOS Y CONDICIONES (${DATOS_NEGOCIO.razon_social}):</strong><br>
              Al firmar este comprobante, el remitente declara bajo protesta de decir verdad que el contenido del paquete es totalmente lícito, no incluye artículos prohibidos, inflamables, valores o efectivo, y no infringe las regulaciones vigentes en territorio nacional. Liten Express actúa únicamente como un intermediario tecnológico para la generación de la guía prepagada y no se hace responsable por daños, mermas, extravíos, robos o demoras en la entrega, siendo estos atribuibles directa y exclusivamente a la empresa de paquetería contratada de acuerdo con sus propios términos de servicio.</p>
          </div>

          <div class="recibo-firma-box">
              <div class="recibo-firma-linea"></div>
              <strong>Firma de conformidad y aceptación del remitente</strong><br>
              <span id="rFirmaNombre"></span>
          </div>
      </div>
      
      <!-- BARRA FLOTANTE CON INDICADOR, DATOS FISCALES Y CONCESIONES (3 COLUMNAS) -->
      <div class="footer-soporte">
        <div style="white-space: nowrap;">
          <span class="status-dot"></span><span style="color: #4ade80; font-weight: bold; margin-right: 12px;">Conectado</span>
          Soporte: <strong>+52-294-168-0707</strong>
        </div>
        <div class="footer-centro">
          ${DATOS_NEGOCIO.razon_social} &nbsp;|&nbsp; RFC: ${DATOS_NEGOCIO.rfc}
        </div>
        <div class="footer-concesiones" style="white-space: nowrap;">
          <strong>Concesiones:</strong> DHL: P-POINT20240625HH2 V2029 | FEDEX: FD20A558602000 V2028 | ESTAFETA: MXES202425AA2566 V2030
        </div>
      </div>

      <script>
        const ROL_USUARIO_ACTUAL = '${rolActual}'; 
        const TARIFA_USUARIO_ACTUAL = '${tarifaActual}'; 

        let cotizacionActual = null;
        let servicioSeleccionado = null;
        let nombrePaqueteriaSeleccionada = '';
        let totalCobradoSeleccionado = 0;
        let pesoFacturadoSeleccionado = 0;

        function obtenerContactoPaqueteria(nombrePaq) {
            const paq = nombrePaq.toUpperCase();
            
            if (paq.includes('DHL')) return { tel: '55 5345 7000', web: 'https://www.dhl.com/mx-es/home.html' };
            if (paq.includes('ESTAFETA')) return { tel: '55 5270 8300 o al 800 378 2338', web: 'https://www.estafeta.com/' };
            if (paq.includes('FEDEX')) return { tel: '55 5228 9904', web: 'https://www.fedex.com/es-mx/home.html' };
            if (paq.includes('PAQUETEXPRESS')) return { tel: '800 821 0208 (WhatsApp: 6681 680000)', web: 'https://www.paquetexpress.com.mx/' };
            if (paq.includes('TRES GUERRAS') || paq.includes('TRESGUERRAS')) return { tel: '800 710 8352', web: 'https://www.tresguerras.com.mx/' };
            
            // Condición para paqueterías no listadas (Línea en blanco para llenar a mano)
            return { tel: '.:___________', web: '.:___________' };
        }

        function obtenerNotaOperativa(nombrePaq) {
            const n = nombrePaq.toUpperCase();
            if (n.includes('MANUAL')) {
                return "Esta guía es exclusivamente para 1kg de peso, no se pueden pagar sobrepesos en mostrador ni con monedero";
            }
            if (n.includes('PAQUETEXPRESS DIA SIGUIENTE (SE ADJUNTA UNA GUIA PDF EN BLANCO') ||
                n === 'ESTAFETA TERRESTRE SIN RECOLECCION1' ||
                n === 'ESTAFETA DIA SIGUIENTE SIN RECOLECCION' ||
                n === 'ESTAFETA TERRESTRE SIN RECOLECCION' ||
                n === 'PAQUETEXPRESS TERRESTRE P') {
                return "*cargos extras se pagan en mostrador*";
            }
            return "cargos extras se paga con monedero"; 
        }

        document.getElementById('cotizadorForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resDiv = document.getElementById('resultadosCotizacion');
          const btn = document.getElementById('btnCotizar');
          document.getElementById('seccionEmision').style.display = 'none';
          document.getElementById('btnImprimirRecibo').style.display = 'none';
          btn.disabled = true;
          btn.innerText = 'Consultando tarifas...';
          resDiv.innerHTML = '';

          const payload = {
            cpOrigen: document.getElementById('cpOrigen').value.trim(),
            cpDestino: document.getElementById('cpDestino').value.trim(),
            coloniaOrigen: document.getElementById('coloniaOrigen').value.trim(),
            coloniaDestino: document.getElementById('coloniaDestino').value.trim(),
            peso: parseInt(document.getElementById('peso').value, 10),
            largo: parseInt(document.getElementById('largo').value, 10),
            ancho: parseInt(document.getElementById('ancho').value, 10),
            alto: parseInt(document.getElementById('alto').value, 10),
            envioAsegurado: false, 
            conRecoleccion: false  
          };

          try {
            const response = await fetch('/api/cotizar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al cotizar');

            cotizacionActual = data;

            if (!data.servicios || data.servicios.length === 0) {
              resDiv.innerHTML = '<p>No hay servicios disponibles para esta ruta.</p>';
              return;
            }

            let html = '<h3 style="margin-bottom: 12px;">Selecciona la paquetería para crear la guía:</h3>';
            data.servicios.forEach(s => {
              
              // ==============================================================
              // LÓGICA DE PRECIOS MATRICIAL (LOCAL VS COMERCIAL)
              // ==============================================================
              const costoTraslado = parseFloat(s.total); 
              
              let multiplicadorServicio;

              if (TARIFA_USUARIO_ACTUAL === 'comercial') {
                  multiplicadorServicio = 1.50; 
                  if (/DHL/i.test(s.nombre)) multiplicadorServicio = 0.90;
              } else {
                  multiplicadorServicio = 1.25; 
                  if (/DHL/i.test(s.nombre)) multiplicadorServicio = 0.65;
              }

              const costoServicio = costoTraslado * multiplicadorServicio; 
              const costoTotalMuestra = costoTraslado + costoServicio;     
              
              const notaAdvertencia = obtenerNotaOperativa(s.nombre);

              // Detector visual de recargos ocultos
              let htmlCargosExtras = \`<div class="alerta-cargos"><span class="nota-operativa">⚠️ \${notaAdvertencia}</span>\`;
              
              if (s.cargosAplicados && s.cargosAplicados.length > 0) {
                  htmlCargosExtras += \`<ul>\`;
                  s.cargosAplicados.forEach(cargo => {
                      htmlCargosExtras += \`<li>\${cargo.concepto}: $\${cargo.monto.toFixed(2)}</li>\`;
                  });
                  htmlCargosExtras += \`</ul>\`;
              }
              htmlCargosExtras += \`</div>\`;

              // Ocultar botón si es "solo_lectura"
              let botonHTML = '';
              if (ROL_USUARIO_ACTUAL === 'cajero') {
                  botonHTML = \`<button type="button" class="btn-success" style="width: 100%; padding: 10px;" onclick="seleccionarServicio(\${s.idservicio}, '\${s.nombre}', \${costoTotalMuestra}, \${s.kg})">Seleccionar</button>\`;
              } else {
                  botonHTML = \`<div style="color: #991b1b; font-size: 11px; text-align: center; margin-top: 5px; font-weight: bold;">[Botón de Emisión Desactivado]</div>\`;
              }

              html += \`
                <div class="card-servicio">
                  <div style="flex: 1;">
                    <strong style="font-size: 16px;">\${s.nombre}</strong><br>
                    <small style="color: #64748b;">Entrega estimada: \${s.dias} días hábiles</small><br>
                    <span class="peso-facturado">Peso a cobrar: \${s.kg} kg</span>
                    \${htmlCargosExtras}
                  </div>
                  
                  <div class="desglose-precios">
                    <div class="rubro-precio">Combustible: <strong>$\${costoTraslado.toFixed(2)}</strong></div>
                    <div class="rubro-precio">Servicio: <strong>$\${costoServicio.toFixed(2)}</strong></div>
                    <div class="precio" style="margin-top: 4px; margin-bottom: 10px;">Total: $\${costoTotalMuestra.toFixed(2)} MXN</div>
                    \${botonHTML}
                  </div>
                </div>
              \`;
            });
            resDiv.innerHTML = html;
          } catch (err) {
            resDiv.innerHTML = \`<div class="error">\${err.message}</div>\`;
          } finally {
            btn.disabled = false;
            btn.innerText = 'Cotizar Paqueterías (Entorno Real)';
          }
        });

        window.seleccionarServicio = (idservicio, nombre, totalMostrado, pesoFacturado) => {
          servicioSeleccionado = idservicio;
          nombrePaqueteriaSeleccionada = nombre; 
          totalCobradoSeleccionado = totalMostrado; 
          pesoFacturadoSeleccionado = pesoFacturado; 

          document.getElementById('tituloServicioSeleccionado').innerText =
            \`2. Emisión de Guía - \${nombre} (Total a cobrar: $ \${parseFloat(totalMostrado).toFixed(2)} MXN)\`;
          const seccion = document.getElementById('seccionEmision');
          seccion.style.display = 'block';
          seccion.scrollIntoView({ behavior: 'smooth' });
        };

        document.getElementById('emisionForm').addEventListener('submit', async (e) => {
          e.preventDefault();

          if (!confirm("⚠️ ATENCIÓN: ANTES DE GENERAR LA GUÍA\\n\\n1. Verifica que el C.P. y la dirección sean correctos.\\n2. Confirma que YA HAS COBRADO el importe total.\\n\\n¿Estás seguro de emitir la guía oficial? (Se descontará saldo)")) return;

          const btn = document.getElementById('btnGenerarGuia');
          const resFinal = document.getElementById('resultadoFinal');
          btn.disabled = true;
          btn.innerText = 'Generando guía en la paquetería...';
          resFinal.innerHTML = '';
          document.getElementById('btnImprimirRecibo').style.display = 'none';

          const nombreRemitente = document.getElementById('remNombre').value.trim();

          const payloadGuia = {
            idcotizacion: cotizacionActual.idcotizacion,
            idservicio: servicioSeleccionado,
            contenido: document.getElementById('paqContenido').value.trim(),
            remitente: {
              nombre: nombreRemitente,
              empresa: document.getElementById('remEmpresa').value.trim() || 'Liten Express',
              calle: document.getElementById('remCalle').value.trim(),
              colonia: document.getElementById('coloniaOrigen').value.trim(),
              ciudad: document.getElementById('remCiudad').value.trim(),
              estado: document.getElementById('remEstado').value.trim(),
              codigoPostal: document.getElementById('cpOrigen').value.trim(),
              telefono: document.getElementById('remTelefono').value.trim()
            },
            destinatario: {
              nombre: document.getElementById('destNombre').value.trim(),
              empresa: document.getElementById('destEmpresa').value.trim() || 'Particular',
              calle: document.getElementById('destCalle').value.trim(),
              colonia: document.getElementById('coloniaDestino').value.trim(),
              ciudad: document.getElementById('destCiudad').value.trim(),
              estado: document.getElementById('destEstado').value.trim(),
              codigoPostal: document.getElementById('cpDestino').value.trim(),
              telefono: document.getElementById('destTelefono').value.trim()
            }
          };

          try {
            const response = await fetch('/api/guias', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadGuia)
            });

            const data = await response.json();
            if (!response.ok) {
              const msg = data.detalles ? data.detalles.join(', ') : (data.error || 'Error al emitir guía');
              throw new Error(msg);
            }

            resFinal.innerHTML = \`
              <div class="exito-box">
                <h3 style="margin-top:0;">✅ ¡Guía Generada Exitosamente!</h3>
                <p><strong>Paquetería:</strong> \${data.paqueteria}</p>
                <p><strong>Número de Rastreo:</strong> \${data.trackingCode}</p>
                \${data.urlGuia ? \`<p><a href="\${data.urlGuia}" target="_blank" style="display:inline-block; padding:10px 18px; background:#16a34a; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Descargar Guía en PDF</a></p>\` : '<p>Guía generada correctamente. URL en espera.</p>'}
              </div>
            \`;

            // === LLENAR DATOS DEL RECIBO FORMAL CARTA ===
            const paqueteriaFinal = data.paqueteria || nombrePaqueteriaSeleccionada;
            const datosContacto = obtenerContactoPaqueteria(paqueteriaFinal);

            document.getElementById('rFecha').innerText = new Date().toLocaleString('es-MX');
            document.getElementById('rRemNombre').innerText = nombreRemitente;
            
            const tipoId = document.getElementById('remIdTipo').value;
            const numId = document.getElementById('remIdNum').value;
            document.getElementById('rRemIdentificacion').innerText = \`\${tipoId} - \${numId}\`;
            
            document.getElementById('rRemTel').innerText = document.getElementById('remTelefono').value;
            document.getElementById('rDestNombre').innerText = document.getElementById('destNombre').value;
            document.getElementById('rDestDir').innerText = \`\${document.getElementById('destCalle').value}, \${document.getElementById('coloniaDestino').value}\`;
            document.getElementById('rDestCP').innerText = document.getElementById('cpDestino').value;
            document.getElementById('rDestTel').innerText = document.getElementById('destTelefono').value;
            
            document.getElementById('rPaqueteria').innerText = paqueteriaFinal;
            document.getElementById('rRastreo').innerText = data.trackingCode;
            document.getElementById('rPeso').innerText = pesoFacturadoSeleccionado;
            document.getElementById('rContenido').innerText = document.getElementById('paqContenido').value;
            document.getElementById('rTotal').innerText = parseFloat(totalCobradoSeleccionado).toFixed(2);
            
            document.getElementById('rPaqTel').innerText = datosContacto.tel;
            document.getElementById('rPaqWeb').innerText = datosContacto.web;
            document.getElementById('rFirmaNombre').innerText = nombreRemitente;
            
            document.getElementById('btnImprimirRecibo').style.display = 'block';

          } catch (err) {
            resFinal.innerHTML = \`<div class="error"><strong>Error al crear guía:</strong> \${err.message}</div>\`;
          } finally {
            btn.disabled = false;
            btn.innerText = 'Confirmar y Generar Guía Oficial';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Endpoint seguro Cotizar 
app.post('/api/cotizar', async (req, res) => {
  const apiKey = process.env.ENVIAFACIL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta ENVIAFACIL_API_KEY' });

  try {
    const apiRes = await fetch(BASE_URL + '/cotizacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(req.body)
    });
    const data = await apiRes.json();
    return res.status(apiRes.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint seguro Generar Guía
app.post('/api/guias', async (req, res) => {
  if (req.rolLiten !== 'cajero') {
    return res.status(403).json({ error: 'Operación denegada. Este usuario solo tiene permisos para cotizar, no para gastar saldo.' });
  }

  const apiKey = process.env.ENVIAFACIL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta ENVIAFACIL_API_KEY' });

  try {
    const apiRes = await fetch(BASE_URL + '/guias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(req.body)
    });
    const data = await apiRes.json();
    return res.status(apiRes.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log('Liten Express operativo con Sesiones Web y Recibo Formal.'));
