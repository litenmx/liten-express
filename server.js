const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// URL BASE: cambia a 'https://guias-api.enviafacil.shop/api/v1' cuando pases a producción
const BASE_URL = 'https://sandbox.enviafacil.shop:8443/api/v1';

// Credenciales de acceso interno para empleados
const USUARIO_SISTEMA = process.env.APP_USER || 'admin';
const PASSWORD_SISTEMA = process.env.APP_PASSWORD || 'Liten2026*';

app.use(express.json());

// Candado de seguridad (Autenticación Básica)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1] || '';
  const [usuario, password] = Buffer.from(token, 'base64').toString().split(':');

  if (usuario === USUARIO_SISTEMA && password === PASSWORD_SISTEMA) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Acceso Privado Liten Express"');
  return res.status(401).send('Acceso no autorizado. Ingrese credenciales autorizadas de Liten Express.');
});

// Interfaz Liten Express
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liten Express - Portal de Envíos</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
        .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .badge-seguridad { background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
        .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 18px 0 10px; border-left: 4px solid #2563eb; padding-left: 8px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .full { grid-column: span 2; }
        label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #475569; }
        input { width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
        input:focus { outline: none; border-color: #2563eb; }
        .btn-primary { width: 100%; background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-success { background: #16a34a; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-success:hover { background: #15803d; }
        .card-servicio { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .precio { font-size: 18px; font-weight: 700; color: #15803d; margin-right: 12px; }
        #seccionEmision { display: none; margin-top: 24px; padding-top: 18px; border-top: 2px dashed #cbd5e1; }
        .exito-box { background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 8px; margin-top: 18px; }
        .error { color: #b91c1c; background: #fee2e2; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>Liten Express</h1>
            <p>Comercio Electrónico Liten - Generador de Guías Interno</p>
          </div>
          <span class="badge-seguridad">🔒 Sesión Segura</span>
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
          <button type="submit" id="btnCotizar" class="btn-primary">Cotizar Paqueterías</button>
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
                <input type="text" id="remEmpresa" value="Comercio Electrónico Liten">
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
        </div>
      </div>

      <script>
        let cotizacionActual = null;
        let servicioSeleccionado = null;

        document.getElementById('cotizadorForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resDiv = document.getElementById('resultadosCotizacion');
          const btn = document.getElementById('btnCotizar');
          document.getElementById('seccionEmision').style.display = 'none';
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

            let html = '<h3 style="margin-bottom: 10px;">Selecciona la paquetería para crear la guía:</h3>';
            data.servicios.forEach(s => {
              html += \`
                <div class="card-servicio">
                  <div>
                    <strong>\${s.nombre}</strong><br>
                    <small>Entrega estimada: \${s.dias} días hábiles</small>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <div class="precio">$\${parseFloat(s.total).toFixed(2)} MXN</div>
                    <button type="button" class="btn-success" onclick="seleccionarServicio(\${s.idservicio}, '\${s.nombre}', \${s.total})">
                      Seleccionar
                    </button>
                  </div>
                </div>
              \`;
            });
            resDiv.innerHTML = html;
          } catch (err) {
            resDiv.innerHTML = \`<div class="error">\${err.message}</div>\`;
          } finally {
            btn.disabled = false;
            btn.innerText = 'Cotizar Paqueterías';
          }
        });

        window.seleccionarServicio = (idservicio, nombre, total) => {
          servicioSeleccionado = idservicio;
          document.getElementById('tituloServicioSeleccionado').innerText =
            \`2. Emisión de Guía - \${nombre} ($ \${parseFloat(total).toFixed(2)} MXN)\`;
          const seccion = document.getElementById('seccionEmision');
          seccion.style.display = 'block';
          seccion.scrollIntoView({ behavior: 'smooth' });
        };

        document.getElementById('emisionForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('btnGenerarGuia');
          const resFinal = document.getElementById('resultadoFinal');
          btn.disabled = true;
          btn.innerText = 'Generando guía en la paquetería...';
          resFinal.innerHTML = '';

          const payloadGuia = {
            idcotizacion: cotizacionActual.idcotizacion,
            idservicio: servicioSeleccionado,
            contenido: document.getElementById('paqContenido').value.trim(),
            remitente: {
              nombre: document.getElementById('remNombre').value.trim(),
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
                \${data.urlGuia ? \`<p><a href="\${data.urlGuia}" target="_blank" style="display:inline-block; padding:10px 18px; background:#16a34a; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Descargar Guía en PDF</a></p>\` : '<p>Guía generada correctamente.</p>'}
              </div>
            \`;
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

// Endpoint Cotizar
app.post('/api/cotizar', async (req, res) => {
  const apiKey = process.env.ENVIAFACIL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta ENVIAFACIL_API_KEY' });

  try {
    const apiRes = await fetch(`${BASE_URL}/cotizacion`, {
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

// Endpoint Generar Guía
app.post('/api/guias', async (req, res) => {
  const apiKey = process.env.ENVIAFACIL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta ENVIAFACIL_API_KEY' });

  try {
    const apiRes = await fetch(`${BASE_URL}/guias`, {
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

app.listen(PORT, () => console.log('Liten Express operativo con seguridad'));
