# Hermes

Hermes es un sistema recomendador y planificador turístico, para facilitar la tarea más tediosa de todo viaje: **planificarlo**.

## Issues

- [Español](#español)
- [English](#english)

### Español

Bienvenida/o al repositorio de incidencias de Hermes. Aquí puedes informar de cualquier error que encuentres o sugerir ediciones y nuevos lugares y ciudades a la plataforma.

Empieza con las siguientes plantillas:

- [Informe de errores](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=bug&template=es_bug_report.md&title=%5BBUG%5D+): Informe de errores en la plataforma.
- [Solicitud de características](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=enhancement&template=es_feature_request.md&title=%5BFEATURE%5D+): Sugerir una nueva característica
- [Solicitud de nueva ciudad](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=city+request&template=es_city_request.md&title=%5BCIUDAD%5D+): Sugerir una nueva ciudad.
- [Solicitud de lugar](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=place+request&template=es_place_request.md&title=%5BLUGAR%5D+): Sugiere una edición o un nuevo lugar.

### English

Welcome to the hermes issues repository. Here, you can report any bug that you find or suggest edits and new places and cities to the platform.

Get started with the following templates:
- [Bug report](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=bug&template=en_bug_report.md&title=%5BBUG%5D+): Report bugs.
- [Feature request](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=enhancement&template=en_feature_request.md&title=%5BFEATURE%5D+): Suggest a new feature
- [City request](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=city+request&template=en_city_request.md&title=%5BCITY%5D+): Suggest a new city.
- [Place request](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=place+request&template=en_place_request.md&title=%5BPLACE%5D+): Suggest an edit or a new place.

## Directorios

Este repositorio está dividido en dos directorios distintos:

- [`web`](web/): Contiene el _frontend_ de la plataforma.
- [`server`](server/): Contiene el _backend_ de la plataforma
- [`data`](data/): Scripts para extraer datos para añadir a la base de datos.

## Despliegue

Para desplegar Hermes, se recomienda utilizar Docker y `docker-compose`.

Se provee un archivo de `docker-compose` como punto de inicio.

Los pasos de despligue son los siguientes:

1. Preparación de la web
    1. `js/common.js`: Cambie la constante `TILESERVER_ENDPOINT` para que apunte al servidor de tiles para los mapas.
    2. Reemplace, si lo desea, los términos y condiciones y la política de privacidad que se ofrecen como ejemplo.
        - **Nota**: Tenga en cuenta que Hermes está bajo la licencia GPL-3.0 
    3. Añada la carpeta `places` en `assets`. Esta contiene todas las imágenes de los lugares en el formato `{idLugar}/{numeroImagen}.jpg`.
2. Preparación del servidor
    1. `config.json`: Cree un archivo llamado `config.json`. Se muestra un ejemplo en la raíz de este repositorio. Añada este archivo en el directorio `server/`
        - Graphhopper: Para extraer distancias, es necesario una instancia de Graphhopper. Puede crear una instancia de [Graphhopper en su máquina](https://github.com/graphhopper/graphhopper) o utilizar la [API de Graphhopper](https://www.graphhopper.com/pricing/).
        - Secret: `secret` es utilizado para cifrar Cookies.
        - Email: Existen varias formas de configurar los correos elctrónicos:
            + Si `service` está configurado, se utilizará el servicio especifico
            + Si no se ha especificado `service`, deerá cofigurar los siguientes parámetros adiciones:
                * `host`: Host del servidor SMTP.
                * `port`: Puerto del servidor SMTP.
                * `secure`: Configurelo a `true` si usa STARTTLS.
        - Foursquare:
            + Para añadir categorias en la base de datos, es necesario tener una lista de [categorias de Foursquare](https://developer.foursquare.com/docs/build-with-foursquare/categories/)
    2. `db.json`: Este archivo contiene los lugares que se almacenarán en la base de datos. Añada este archivo en el directorio `server/db/db.json`. Se muestra un ejemplo en la raíz de este repositorio.
    3. Metric-FF: Compile el código fuente de [Metric-FF 1.2](https://fai.cs.uni-saarland.de/hoffmann/metric-ff.html) acorde a la arquitectura de su máquina. Mueva el ejecutable `ff` generado a  `server/planner/ff`.
3. Genere la imagen del servidor: Desde `server/`, ejecute `docker build -t srgmc/hermes .`
4. Configure  `docker-compose.yaml` para que las rutas sean las correctas.
5. Creación de la base de datos: 
    1. Inicie el contenedor de la base de datos que va a utilizar para Hermes con `docker-compose up mariadb`.
    2. Inicie la instancia de Graphhopper.
    3. Dirígase a `server/db` y ejecute el comando `node init.js && addPlaces.js`. 
        - Esto añadirá todas las tablas a la base de datos y posteriormente añadirá todos los lugares de `db.json`. Puede generar este archivo con los scripts del directorio `data/`.
6. Iniciar el servidor: Inicie el servidor con `docker-compose up -d`
7. Configuración de cron: En el archivo `crontab`, se muestra un ejemplo de una tarea períodica.

## Licencia

Copyright (C) 2021  Álvaro Galisteo

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
