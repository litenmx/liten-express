const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Interfaz visual para tus empleados
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
        body { background: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 700px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
        .header p { margin: 4px 0 0 0; color: #64748b; font-size: 13px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .full { grid-column: span 2; }
        label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #475569; }
        input { width: 100%; padding: 9px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
        input:focus { outline: none; border-color: #2563eb; }
        button { width: 100%; background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 15px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #1d4ed8; }
        #resultados { margin-top: 24px; }
        .card-opcion { border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
        .card-opcion strong { font-size: 16px; color: #0f172a; }
        .precio { font-size: 18px; font-weight: bold; color: #16a34a; }
        .error { color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 6px; font-size: 13px; margin-top: 15px; }
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
              <input type="text" id="cpOrigen" required maxlength="5" placeholder="Ej. 85169">
            </div>
            <div>
              <label>Colonia Origen</label>
              <input type="text" id="coloniaOrigen" required placeholder="Ej. Centro">
            </div>
            <div>
              <label>C.P. Destino (5 dígitos)</label>
              <input type="text" id="cpDestino" required maxlength="5" placeholder="Ej. 06700">
            </div>
            <div>
              <label>Colonia Destino</label>
              <input type="text" id="coloniaDestino" required placeholder="Ej. Roma Norte">
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
          btn.innerText = 'Buscando tarifas...';
          resDiv.innerHTML = '';

          const payload = {
            cpOrigen: document.getElementById('cpOrigen').value.trim(),
            cpDestino: document.getElementById('cpDestino').value.trim(),
            coloniaOrigen: document.getElementById('coloniaOrigen').value.trim(),
            coloniaDestino: document.getElementById('coloniaDestino').value.trim(),
            peso: parseInt(document.getElementById('peso').value),
            largo: parseInt(document.getElementById('largo').value),
            ancho: parseInt(document.getElementById('ancho').value),
            alto: parseInt(document.getElementById('alto').value)
          };

          try {
            const response = await fetch('/api/cotizar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al cotizar');

            if (!data.cotizaciones || data.cotizaciones.length === 0) {
              resDiv.innerHTML = '<p>No hay servicios disponibles para esta ruta.</p>';
              return;
            }

            let html = '<h3>Opciones disponibles:</h3>';
            data.cotizaciones.forEach(c => {
              html += \`
                <div class="card-opcion">
                  <div>
                    <strong>\${c.paqueteria || 'Servicio Express'} - \${c.servicio || ''}</strong><br>
                    <small>Entrega estimada: \${c.diasEntrega ? c.diasEntrega + ' días' : 'Estándar'}</small>
                  </div>
                  <div class="precio">$\${c.precioTotal || c.precio || '0.00'} MXN</div>
                </div>
              \`;
            });
            resDiv.innerHTML = html;
          } catch (err) {
            resDiv.innerHTML = \`<div class="error">\${err.message}</div>\`;
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

// Endpoint intermedio que oculta la API Key
app.post('/api/cotizar', async (req, res) => {
  const apiKey = process.env.ENVIAFACIL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar la API Key en el servidor.' });
  }

  try {
    const apiRes = await fetch('https://guias-api.enviafacil.shop/api/v1/cotizacion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(req.body)
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.mensaje || 'Error en la API de envíos' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno de comunicación con el servicio de paqueterías.' });
  }
});

app.listen(PORT, () => console.log('Liten Express corriendo en el puerto ' + PORT));
