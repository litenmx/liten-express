const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// URL BASE: PRODUCCIÓN ACTIVA (ENTORNO REAL)
const BASE_URL = 'https://guias-api.enviafacil.shop/api/v1';

// ---------------------------------------------------------
// BASE DE DATOS DE USUARIOS Y ROLES LITEN EXPRESS
// ---------------------------------------------------------
const USUARIOS_CAJERO = {
  "deyanira": "@Alan2015*",
  "Jorge": "@Alan2015*",
  "caja1": "@Liten123*",
  "caja2": "@Liten123*",
  "joseluis": "Pablito1122"
};

const USUARIOS_SOLO_LECTURA = {
  "moball": "llegodios123",
  "ventas": "Liten2026"
};

const ADMIN_USER = process.env.APP_USER || 'admin';
const ADMIN_PASS = process.env.APP_PASSWORD || 'Liten2026*';
USUARIOS_CAJERO[ADMIN_USER] = ADMIN_PASS;

app.use(express.json());

// Evita que la contraseña parpadee por culpa del favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==========================================
// 1. CANDADO DE SEGURIDAD Y ROLES
// ==========================================
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1] || '';
  const [usuario, password] = Buffer.from(token, 'base64').toString().split(':');

  let rolAsignado = null;

  if (USUARIOS_CAJERO[usuario] && USUARIOS_CAJERO[usuario] === password) {
    rolAsignado = 'cajero';
  } else if (USUARIOS_SOLO_LECTURA[usuario] && USUARIOS_SOLO_LECTURA[usuario] === password) {
    rolAsignado = 'solo_lectura';
  }

  if (rolAsignado) {
    req.usuarioLiten = usuario; 
    req.rolLiten = rolAsignado;
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Acceso Privado Liten Express"');
  return res.status(401).send('Acceso no autorizado. Ingrese credenciales autorizadas de Liten Express.');
});

app.use(express.static(__dirname));

// ==========================================
// 3. PORTAL WEB LITEN EXPRESS
// ==========================================
app.get('/', (req, res) => {
  const usuarioActual = req.usuarioLiten || 'Cajero';
  const rolActual = req.rolLiten || 'solo_lectura';

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liten Express - Portal de Envíos</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f1f5f9; margin: 0; padding: 20px 14px; color: #1e293b; }
        .container { max-width: 780px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        
        .logo-container { text-align: center; margin-bottom: 16px; }
        .logo-container img { max-height: 180px; max-width: 100%; height: auto; border-radius: 8px; object-fit: contain; }

        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
        .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .badge-seguridad { background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
        .badge-solo-lectura { background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; display: ${rolActual === 'solo_lectura' ? 'inline-block' : 'none'}; margin-top: 5px; }
        
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
        .nota-operativa { color: #b91c1c; font-size: 11px; font-weight: 600; margin-top: 6px; display: block; font-style: italic; }

        /* Estilos para la nueva ALERTA DE CARGOS EXTRAS */
        .alerta-cargos { background: #fef08a; color: #854d0e; padding: 8px 10px; border-radius: 6px; font-size: 11px; margin-top: 8px; border: 1px solid #fde047; }
        .alerta-cargos ul { margin: 4px 0 0 0; padding-left: 20px; }

        /* Estilos del Recibo (Ocultos en pantalla normal) */
        #reciboLiten { display: none; }

        @media print {
          body * { visibility: hidden; } 
          #reciboLiten, #reciboLiten * { visibility: visible; } 
          #reciboLiten { 
            display: block; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            max-width: 320px; 
            padding: 10px; 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            color: #000;
            line-height: 1.4;
          }
          @page { margin: 0; }
          .separador { border-top: 1px dashed #000; margin: 10px 0; }
          .texto-legal { font-size: 10px; text-align: justify; margin-top: 10px; }
          .firma-box { text-align: center; margin-top: 40px; margin-bottom: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Logo Liten Express -->
        <div class="logo-container">
          <img src="/logo.png" alt="Liten Express" onerror="this.style.display='none'">
        </div>

        <div class="header">
          <div>
            <h1>Liten Express</h1>
            <p>Hola, <strong>${usuarioActual}</strong> - Generador de Guías</p>
            <span class="badge-solo-lectura">⚠️ Modo Consulta (Generar guías desactivado)</span>
          </div>
          <span class="badge-seguridad">🔒 Entorno Real Activo</span>
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
                <input type="text" id="remEmpresa" value="Comercio Electrónico Liten">
              </div>
              
              <!-- CAMPOS DE IDENTIFICACIÓN -->
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
          <button id="btnImprimirRecibo" class="btn-print" onclick="window.print()">🖨️ Imprimir Comprobante de Envío</button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- ESTRUCTURA DEL RECIBO LEGAL OCULTO (TICKET)              -->
      <!-- ======================================================== -->
      <div id="reciboLiten">
          <div style="text-align: center; margin-bottom: 10px;">
              <strong style="font-size: 16px;">LITEN EXPRESS</strong><br>
              Comprobante de Envío<br>
          </div>
          <div class="separador"></div>
          <div>
              <strong>Fecha:</strong> <span id="rFecha"></span><br>
              <strong>Cajero:</strong> ${usuarioActual}<br>
          </div>
          <div class="separador"></div>
          <div>
              <strong>REMITENTE:</strong><br>
              <span id="rRemNombre"></span><br>
              Id: <span id="rRemIdentificacion"></span><br>
              Tel: <span id="rRemTel"></span><br>
              <br>
              <strong>DESTINATARIO:</strong><br>
              <span id="rDestNombre"></span><br>
              <span id="rDestDir"></span><br>
              CP: <span id="rDestCP"></span><br>
              Tel: <span id="rDestTel"></span><br>
          </div>
          <div class="separador"></div>
          <div>
              <strong>Paquetería:</strong> <span id="rPaqueteria"></span><br>
              <strong>Rastreo:</strong> <span id="rRastreo"></span><br>
              <strong>Peso facturado:</strong> <span id="rPeso"></span> kg<br>
              <strong>Contenido:</strong> <span id="rContenido"></span><br>
          </div>
          <div class="separador"></div>
          <div style="text-align: right; margin-top: 10px; font-size: 16px;">
              <strong>TOTAL: $<span id="rTotal"></span> MXN</strong>
          </div>
          
          <div class="separador" style="margin-top: 15px;"></div>
          <div class="texto-legal">
              <strong>ATENCIÓN AL CLIENTE:</strong><br>
              Todo seguimiento, reclamo o duda respecto a la entrega es <strong>exclusivamente</strong> a través de la paquetería asignada:<br>
              Teléfono: <strong id="rPaqTel"></strong><br>
              Web: <strong id="rPaqWeb"></strong><br><br>
              <em>Nota: Esta sucursal opera únicamente como centro de recepción y emisión de envíos. La oficina solo recibe y genera sus envíos, mas no cuenta con área de atención a clientes para rastreos, reclamos o demoras.</em>
          </div>

          <div class="firma-box">
              _________________________________<br>
              Firma de aceptación<br>
              <span id="rFirmaNombre"></span>
          </div>

          <div class="texto-legal" style="font-size: 9px;">
              <strong>COMERCIO ELECTRÓNICO LITEN</strong><br>
              Al firmar este recibo, el remitente acepta los Términos y Condiciones del servicio, declarando que el contenido del paquete es lícito, no incluye artículos prohibidos y no infringe regulaciones nacionales. Liten Express actúa como intermediario tecnológico y no se hace responsable por daños, extravíos, robos o demoras atribuibles directamente a la empresa de paquetería contratada.
          </div>
      </div>

      <script>
        const ROL_USUARIO_ACTUAL = '${rolActual}'; // Inyectado desde el servidor
        let cotizacionActual = null;
        let servicioSeleccionado = null;
        let nombrePaqueteriaSeleccionada = '';
        let totalCobradoSeleccionado = 0;
        let pesoFacturadoSeleccionado = 0;

        // Base de datos de Contacto Oficial de Paqueterías
        function obtenerContactoPaqueteria(nombrePaq) {
            const paq = nombrePaq.toUpperCase();
            if (paq.includes('DHL')) return { tel: '55 5345 7000', web: 'www.dhl.com/mx-es' };
            if (paq.includes('ESTAFETA')) return { tel: '55 5270 8300', web: 'www.estafeta.com' };
            if (paq.includes('FEDEX')) return { tel: '55 5228 9904', web: 'www.fedex.com/es-mx' };
            if (paq.includes('PAQUETEXPRESS')) return { tel: '800 821 0208', web: 'www.paquetexpress.com.mx' };
            if (paq.includes('TRES GUERRAS') || paq.includes('TRESGUERRAS')) return { tel: '800 710 8352', web: 'www.tresguerras.com.mx' };
            if (paq.includes('JT') || paq.includes('J&T')) return { tel: '800 953 3333', web: 'www.jtexpress.mx' };
            if (paq.includes('IMILE')) return { tel: '55 9331 4333', web: 'www.imile.com/mx' };
            return { tel: 'Consulte portal web oficial', web: 'Buscar nombre en Google' };
        }

        // DICCIONARIO INTELIGENTE DE ADVERTENCIAS OPERATIVAS
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
            return "cargos extras se paga con monedero"; // Por defecto
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
            envioAsegurado: false, // NOTA: Aquí se puede habilitar el seguro a futuro
            conRecoleccion: false  // NOTA: Aquí se puede habilitar recolecciones
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
              
              // LÓGICA DE PRECIOS DINÁMICOS
              const costoTraslado = parseFloat(s.total); 
              let multiplicadorServicio = 1.25; 
              if (/DHL/i.test(s.nombre)) {
                multiplicadorServicio = 0.65;
              }

              const costoServicio = costoTraslado * multiplicadorServicio; 
              const costoTotalMuestra = costoTraslado + costoServicio;     
              
              const notaAdvertencia = obtenerNotaOperativa(s.nombre);

              // >>> NUEVO: DETECTOR VISUAL DE CARGOS EXTRAS <<<
              let htmlCargosExtras = '';
              if (s.cargosAplicados && s.cargosAplicados.length > 0) {
                  htmlCargosExtras = \`<div class="alerta-cargos"><strong>⚠️ Cargos extras incluidos en tarifa:</strong><ul>\`;
                  s.cargosAplicados.forEach(cargo => {
                      htmlCargosExtras += \`<li>\${cargo.concepto}: $\${cargo.monto.toFixed(2)}</li>\`;
                  });
                  htmlCargosExtras += \`</ul></div>\`;
              }

              // LÓGICA DE ROLES VISUAL: Ocultar botón si es "solo_lectura"
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
                    <span class="peso-facturado">Peso a cobrar: \${s.kg} kg</span><br>
                    <span class="nota-operativa">\${notaAdvertencia}</span>
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

            // === LLENAR DATOS DEL RECIBO LEGAL ===
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

// Endpoint seguro Generar Guía (Bloqueo para "solo_lectura")
app.post('/api/guias', async (req, res) => {
  if (req.rolLiten !== 'cajero') {
    return res.status(403).json({ error: 'Operación denegada. Este usuario solo tiene permisos para cotizar, no para gastar saldo.' });
  }

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

app.listen(PORT, () => console.log('Liten Express operativo.'));
