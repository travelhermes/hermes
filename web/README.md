# Hermes

Hermes es un sistema recomendador y planificador turístico, para facilitar la tarea más tediosa de todo viaje: **planificarlo**.

En este directorio se encuentra el código que compone el _frontend_ de la plataforma.

## Dependencias

El _frontend_ esta diseñado usando las siguientes dependencias:

- Bootstrap 5
- Bootstrap Icons
- FontAwesome
- Leaflet
- hCaptcha

Para mantener las librerías consistentes, estas se añaden a la plataforma sin utilizar servicios externos (como por ejemplo, unpkg), a excepción de Leaflet y hCaptcha.

## Estructura

Este directorio está dividido en las siguientes partes:

- **Scripts**: Se encuentran en el directorio `js/`. Contienen todos los scripts usados por cada página de la plataforma, reunidos en un único lugar. Además, añade las librerías de Bootstrap y FontAwesome.
- **Estilos**: Se encuentran en el directorio `styles/`. Contienen todos los estilos usados por cada página de la plataforma, reunidos en un único lugar. Además, añade las librerías de Bootstrap y Bootstrap Icons.
- ***Assets***: Contiene todas las imágenes e iconos utilizados por la plataforma.
- **Páginas**: Cada página esta almacenada en su correspondiente directorio, como archivo `.html`.