# FotoLista OSS 🖼️

Herramienta web gratuita para preparar fotografías para imprimir en medidas estándar. **Todo se procesa en tu navegador**: las imágenes no se envían a servidores.

> Versión inicial **0.1.0**: proyecto nuevo y experimental, publicado para recibir pruebas, ideas y colaboraciones. No afirmamos tener usuarios, descargas ni adopción verificadas.

## Funciones

- Tamaños: 10×15, 15×20, 20×30, 21×15, 30×40, 30×45 y 20×20 cm.
- Orientación vertical u horizontal.
- Exportación en JPG, **300 DPI en los metadatos JFIF**.
- Foto completa con bordes o recorte central, siempre sin distorsionar las proporciones.
- Convierte hasta 10 fotografías por lote; cuando hay varias, descarga un archivo ZIP.
- Compatible con imágenes JPG, PNG y WebP admitidas por el navegador.
- Funciona sin conexión una vez descargados los archivos (sin bibliotecas externas).

## Uso rápido

1. Descarga el proyecto o clónalo.
2. Abre `index.html` con Chrome, Edge o Firefox.
3. Selecciona tus fotos, tamaño, orientación y encuadre.
4. Pulsa **Preparar fotografías**. Se descargará un JPG o un ZIP.

## Publicar en GitHub sin programar

1. Entra a [github.com/new](https://github.com/new), con tu cuenta iniciada.
2. Nombre del repositorio: `fotolista-oss`. Descripción sugerida: *Herramienta libre para preparar fotografías para impresión en JPG a 300 DPI*.
3. Marca **Public** y pulsa **Create repository** (sin marcar "Add a README" para que el repositorio esté vacío).
4. En la nueva página, haz clic en **uploading an existing file** (o **Add file → Upload files**).
5. Descomprime el ZIP del proyecto y sube **los archivos y carpetas de su interior**, no el ZIP.
6. Pulsa **Commit changes**.
7. Opcional: en **Settings → Pages**, en **Build and deployment**, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda. La web podrá verse públicamente cuando GitHub termine de publicarla.

## Nota sobre los 300 DPI

El programa exporta fotografías con dimensiones de píxel calculadas según el tamaño seleccionado y registra densidad de 300 puntos por pulgada en el encabezado JFIF. Esto **no mejora mágicamente la resolución** de una foto con pocos píxeles. El ajuste de proporciones puede dejar bordes o aplicar un recorte, según el modo elegido. Confirma las medidas en el diálogo de impresión de tu laboratorio.

## Privacidad

Las fotos se procesan localmente mediante Canvas y no se cargan en ningún servidor. No uses fotos personales de otras personas para probar públicamente el repositorio: publica solo código y ejemplos sobre los que tengas derechos.

## Estado y próximos pasos

La versión 0.1.0 es un punto de partida. Se buscan pruebas en navegadores, reportes de problemas y contribuciones para mejorar el desempeño con archivos grandes, añadir una vista previa de recorte e incorporar nuevos tamaños.

## Colaboraciones

Consulta [CONTRIBUTING.md](CONTRIBUTING.md). Puedes abrir un issue para proponer mejoras o reportar errores.

## Licencia

[MIT](LICENSE).
