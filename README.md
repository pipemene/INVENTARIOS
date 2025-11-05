# Inventarios

Aplicación web sencilla para crear inventarios fotográficos al momento de la
entrega de un inmueble. Permite capturar fotografías del estado del inmueble,
registrar la firma manuscrita del inquilino y tomar una selfie de verificación
para generar un PDF y compartirlo por WhatsApp con los equipos de
Arrendamientos y Reparaciones.

## Uso

1. Abre el archivo `index.html` en un navegador con soporte para cámara y
   canvas (Chrome o Edge en dispositivos móviles funcionan mejor).
2. Completa el código del inmueble junto con los datos del inquilino. La fecha de
   entrega se rellena automáticamente con la fecha actual.
3. Activa la cámara del inventario, captura tantas fotografías como necesites y
   elimínalas si es necesario.
4. Pide al inquilino escribir su nombre y firmar con el dedo en el recuadro.
5. Activa la cámara frontal para capturar la selfie de verificación.
6. Presiona **Generar PDF** para descargar el inventario. El sistema intentará
   compartir automáticamente el PDF por WhatsApp con Arrendamientos
   (317&nbsp;857&nbsp;4053) y Reparaciones (300&nbsp;294&nbsp;830). Si el dispositivo no
   soporta el uso compartido nativo, se abrirán los chats para que adjuntes el
   archivo descargado manualmente.

El PDF resultante coloca dos fotografías por página en alta resolución, con la
imagen corporativa de Blue Home, el código del inmueble y un resumen claro de
la firma y la selfie final.

> **Nota:** El navegador solicitará permiso para usar la cámara. Asegúrate de
> concederlo para poder tomar las fotos y la selfie.

La generación del PDF se realiza completamente en el navegador sin depender de
conexión a internet o bibliotecas externas, por lo que funcionará incluso en
lugares con señal limitada.
