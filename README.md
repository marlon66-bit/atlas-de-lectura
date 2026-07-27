# Atlas de Lectura v2.2 Online

Versión preparada para alojamiento HTTPS como PWA estática. No necesita Python, una consola abierta ni un servidor en la computadora.

## Privacidad

La versión publicada comienza vacía y no contiene la biblioteca personal del archivo original. Los datos que se importen o creen se guardan en IndexedDB/localStorage del navegador del dispositivo.

## Migración desde localhost

1. Abra la versión local anterior y pulse **Exportar**.
2. Abra la URL HTTPS publicada.
3. Pulse **Importar** y seleccione el JSON exportado.
4. Repita la importación en el iPhone cuando desee copiar la biblioteca allí.

La copia de Windows y la del iPhone son independientes. Esta versión no incorpora sincronización automática entre dispositivos.

## GitHub Pages

El repositorio usa la rama `main`. En **Settings → Pages → Build and deployment**, seleccione **GitHub Actions**. El flujo `.github/workflows/pages.yml` publicará automáticamente cada cambio.
