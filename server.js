const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Interfaz Liten Express
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liten Express - Sistema de Envíos</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
        .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #475569; }
        input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
        input:focus { outline: none; border-color: #2563eb; }
        button { width: 100%; background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #1d4ed8; }
        #resultados { margin-top: 24px; }
        .card-servicio { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .nombre-servicio { font-size: 16px; font-weight: 600; color: #0f172a; }
        .detalles-servicio { font-size: 13px; color: #64748b; margin-top: 2px; }
        .precio { font-size: 18px; font-weight: 700; color: #15803d; }
        .error { color: #b91c1c; background: #fee2e2; padding: 12px; border-radius: 6px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Liten Express</h1>
          <p>Comercio Electrónico Liten - Cotizador de Envíos</p>
        </div>

        <form id="cotizadorForm">
          <div class="form-grid">
            <div>
              <label>C.P. Origen (5 dígitos)</label>
              <input type="text" id="cpOrigen" required maxlength="5" value="85169">
            </div>
            <div>
              <label>Colonia Origen</label>
              <input type="text" id="coloniaOrigen" required value="Centro">
            </div>
            <div>
              <label>C.P. Destino (5 dígitos)</label>
              <input type="text" id="cpDestino" required maxlength="5" value="06700">
            </div>
            <div>
              <label>Colonia Destino</label>
              <input type="text" id="coloniaDestino" required value="Roma Norte">
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
          <button type="submit" id="btnCotizar">Cotizar Tarifas Disponibles</button>
        </form>

        <div id="resultados"></div>
      </div>

      <script>
        document.getElementById('cotizadorForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resDiv = document.getElementById('resultados');
          const btn = document.getElementById('btnCotizar');
          btn.disabled = true;
          btn.innerText = 'Buscando tarifas en EnviaFácil...';
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
            if (!response.ok) {
              const mensajeError = data.error || (data.detalles ? data.detalles.join(', ') : 'Error al cotizar');
              throw new Error(mensajeError);
            }

            if (!data.servicios || data.servicios.length === 0) {
              resDiv.innerHTML = '<p>No hay servicios de paquetería disponibles para esta ruta.</p>';
              return;
            }

            let html = '<h3 style="margin-bottom: 12px; font-size: 16px;">Opciones disponibles:</h3>';
            data.servicios.forEach(s => {
              html += \`
                <div class="card-servicio">
                  <div>
                    <div class="nombre-servicio">\${s.nombre}</div>
                    <div class="detalles-servicio">Entrega estimada: \${s.dias} días hábiles | ID Servicio: \${s.idservicio}</div>
                  </div>
                  <div class="precio">$\${parseFloat(s.total).toFixed(2)} MXN</div>
                </div>
              \`;
            });
            resDiv.innerHTML = html;
          } catch (err) {
            resDiv.innerHTML = \`<div class="error"><strong>Error:</strong> \${err.message}</div>\`;
          } finally {
            btn.disabled = false;
            btn.innerText = 'Cotizar Tarifas Disponibles';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Endpoint seguro intermediario
app.post('/api/cotizar', async (req, res) => {
  const apiKey = process.env.ENVIAFACIL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar ENVIAFACIL_API_KEY en Render.' });
  }

  // URL Base de Sandbox según documentación oficial
  const API_URL = 'https://sandbox.enviafacil.shop:8443/api/v1/cotizacion';

  try {
    const apiRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(req.body)
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Fallo de conexión con el servidor de EnviaFácil: ' + error.message });
  }
});

app.listen(PORT, () => console.log('Liten Express operativo en puerto ' + PORT));
