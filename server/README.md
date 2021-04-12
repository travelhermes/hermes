# Hermes

Hermes es un sistema recomendador y planificador turístico, para facilitar la tarea más tediosa de todo viaje: **planificarlo**.

En este directorio se encuentra el código que compone el _backend_ de la plataforma.

El _backend_ está diseñado usando dos lenguajes de programación

- [Rust](https://www.rust-lang.org/): Para cálculos computacionales del sistema recomendador.
- [Node.js](https://nodejs.org/en/) (v14 o superior, v14.16 recomendada): Para el resto de la plataforma

## Dependencias

El _frontend_ esta diseñado usando las siguientes dependencias:

- [Neon](https://neon-bindings.com/): Libreria para compilar programas escritos en Rust para que sean accesibles por Node.js.
- [Metric-FF 1.2](https://fai.cs.uni-saarland.de/hoffmann/metric-ff.html): Sistema planificador.
- [axios](https://www.npmjs.com/package/axios): Comprobación del token de hCaptcha.
- [bcrypt](https://www.npmjs.com/package/bcrypt): Encriptacion de contraseñas.
- [Fastify](https://www.fastify.io/): Servidor web.
- [geolib](https://www.npmjs.com/package/geolib): Cálculo de distancias.
- [Nodemailer](https://nodemailer.com/about/): Envio de correos electrónicos.
- [pug](https://www.npmjs.com/package/pug): Generación de correos electrónicos.
- [Sequelize](https://sequelize.org/) (con driver mariadb): Acceso a base de datos.

## Estructura

### Directorios

Este directorio está dividido en las siguientes partes:

- **Controladores**: Se encuentran en el directorio `controllers/`. Los controladores definen los _endpoints_ de la plataforma y las tareas que se pueden realizar
- **Base de datos**: Se encuentran en el directorio `db/`. Contiene todo el código utilizado para generar y acceder a la base de datos.
- ***Logs***: Se encuentran en el directorio `logger/`. Contiene todo el código utilizado para generar _logs_.
- **Correos electrónicos**: Se encuentran en el directorio `mail/`. Contiene todo el código utilizado para enviar correos electrónicos. El cuerpo de los correos están definidos en formato Pug.
- **Planificador**: Se encuentran en el directorio `planner/`. Contiene todo el código utilizado para planificar rutas y planes. Hace uso de Metric-FF mediante un generador y _parser_ de problemas.
- **Recomendador**: Se encuentran en el directorio `recommender/`. Contiene todo el código utilizado para generar recomendaciones. Hace uso de la librería de Rust.
- **Utilidades**: Se encuentran en el directorio `utils/`. Contiene código con utilidades, como cachés o sanitización de string.

### Red

Hermes está diseñado para ejecutarse de forma distribuída:

![Estructura distribuída](assets/structure_distributed.png)

El proceso de una petición (por ejemplo, cuando un usuario desea acceder a la plataforma) es el siguiente

1. **Cloudflare**: La petición comienza entrando en la red de Cloudflare. Cloudflare, aunque es opcional, es utilizado como CDN y Firewall para prevenir ataques de denegación de servicio, para mejorar el rendimiento de la plataforma y para reducir el consumo de banda ancha de los servidores.
2. ***Load balancing***: Tras pasar por Cloudflare, la petición se procesa en un servidor con Nginx. Este servidor es utilizado para las tareas de _Load balancing_ (distribuir la carga entre distintos servidores).
3. **Máquina**: Una vez Nginx ha elegido el servidor que procesará la petición, esta es enviada a una de las máquinas. Estás maquinas contienen tres programas:
    - MariaDB: Es la base de datos utilizada por Hermes. Cuando hay más de una máquina en funcionamiento, la base de datos se distribuye entre todas ellas de manera que se reparta la carga de trabajo de la plataforma
    - Cluster Node.js: Como Node.js se ejecuta en un único proceso, se malgastan recursos de la máquina en la que está en ejecución. Para ello, la librería `cluster` de Node.js, crea distintos procesos hijos del mismo programa para aprovechar los recursos disponibles. Esta librería funciona de igual forma a Ngnix, repartiendo las peticiones entre procesos hijos.
    - `Cronjobs`: Para la regeneración periódica de recomendaciones, el envio de correos electrónicos, etc..., el servicio Cron ejecuta una serie de tareas de forma periódica cada día, a las 00:00.

Aunque Hermes está diseñado para ejecutarse de forma distribuída, actualmente se ejecuta con una sola máquina, de la siguiente forma:

![Estructura con una sola máquina](assets/structure.png)