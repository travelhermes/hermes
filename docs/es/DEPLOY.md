# ¿Cómo desplegar Hermes?

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
        - Foursquare:
            + Para añadir categorias en la base de datos, es necesario tener una lista de [categorias de Foursquare](https://developer.foursquare.com/docs/build-with-foursquare/categories/)
    2. `db.json`: Este archivo contiene los lugares que se almacenarán en la base de datos. Añada este archivo en el directorio `server/db/db.json`. Se muestra un ejemplo en la raíz de este repositorio.
    3. Metric-FF: Compile el código fuente de [Metric-FF 1.2](https://fai.cs.uni-saarland.de/hoffmann/metric-ff.html) acorde a la arquitectura de su máquina. Mueva el ejecutable `ff` generado a  `server/planner/ff`.
    4. `hermes.env`: El resto de la configuración de Hermes se realiza mediante _SECRETS_ o variables de entorno. A partir del archivo `env_example`, cree un archivo `hermes.env` donde configure todas las variables necesarias
3. Genere la imagen del servidor: Desde `server/`, ejecute `docker build -t srgmc/hermes .`
4. Configure  `docker-compose.yaml` para que las rutas sean las correctas.
    - La variable `SERVER` es necesaria en el caso de usar logs en producción, ya que determina el nombre del servidor en el que se ejecuta.
5. Creación de la base de datos: 
    1. Exporte la variable de entorno `DATABASE`: `export "DATABASE=<mariadb or postgres>://<username>:<password>@<address>:<port>/<db name>"`. Este valor debe de ser el mismo que el configurado en el paso 2.4.
    2. Inicie el contenedor de la base de datos que va a utilizar para Hermes con `docker-compose up mariadb`.
    3. Inicie la instancia de Graphhopper.
    4. Dirígase a `server/db` y ejecute el comando `node init.js && addPlaces.js`. 
        - Esto añadirá todas las tablas a la base de datos y posteriormente añadirá todos los lugares de `db.json`. Puede generar este archivo con los scripts del directorio `data/`.
6. Iniciar el servidor: Inicie el servidor con `docker-compose up -d`
7. Configuración de cron: En el archivo `crontab`, se muestra un ejemplo de una tarea períodica.
    - Tenga en cuenta que las fechas están en formato UTC.