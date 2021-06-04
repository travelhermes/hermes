# Contribuir a Hermes

## Contribuir nuevas ciudades

Crea un [nuevo Issue con la plantilla correspondiente](https://github.com/SrGMC/hermes-issues/issues/new?assignees=SrGMC&labels=city+request&template=es_city_request.md&title=%5BCIUDAD%5D+).

## Contribuir con lugares

Puedes contribuir a Hermes añadiendo nuevos lugares a la base de datos. Los archivos de la base de datos se encuentran en formato JSON en el directorio `data`.

Para añadir un nuevo lugar, crea un nuevo _pull request_ en el que añadas el nuevo lugar en el archivo de base de datos correspondiente. Las propiedades del objeto del lugar son las siguientes:

```
{
    "osmId": ID de OpenStreetMap (relation/XXXX, way/XXXXX, ...)
    "fsqId": ID de FourSquare
    "gmapsUrl": URL del lugar en Google Maps
    "lat": Latitud
    "lon": Longitud
    "name": Nombre
    "description": Descripción
    "timeSpent": Duración de la visita (en minutos)
    "wikidata": ID de Wikidata (opcional)
    "wheelchair": Si tiene acceso para discapacitados (true) o no (false)
    "images": Número de imágenes del lugar
    "address": Calle y número
    "postalCode": Código postal
    "city": Ciudad
    "zone": Zona (ver más abajo)
    "state": Estado o comunidad autónoma
    "country": País
    "placeUrl": Página web del lugar (opcional)
    "phone": Teléfono del lugar (opcional, ver más abajo),
    "twitter": Usuario de Twitter del lugar (opcional),
    "facebook": ID de usuario o usuario de Facebook del lugar (opcional)
    "instagram": Usuario de Instagram del lugar (opcional)
    "categories": [
        ID de la categoría 1 (ver más abajo)
        ID de la categoría 2
        ...
    ]
    "hours": [
        Horario 1 (ver más abajo)
        Horario 2
        ...
    ],
    "popular": [
        Horas más populares 1 (ver más abajo)
        Horas más populares 2
        ...
    ]
}
```

Las ciudades (zonas) actualmente disponibles son las siguientes:

| ID     | Ciudad | Archivo                                 |
| ------ | ------ | --------------------------------------- |
| Madrid | Madrid | [`madrid.json`](../../data/madrid.json) |

Las categorías actualmente disponible son las siguientes:

| ID  | Nombre                   | ID de Foursquare         |
| --- | ------------------------ | ------------------------ |
| 1   | Salas de conciertos      | 5032792091d4c4b30a586d5c |
| 2   | Mezquitas                | 4bf58dd8d48988d138941735 |
| 3   | Jardínes botánicos       | 52e81612bcbc57f1066b7a22 |
| 4   | Esculturas al aire libre | 52e81612bcbc57f1066b79ed |
| 5   | Plazas peatonales        | 52e81612bcbc57f1066b7a25 |
| 6   | Salónes de ópera         | 4bf58dd8d48988d136941735 |
| 7   | Cuevas                   | 56aa371be4b08b9a8d573511 |
| 8   | Templos                  | 4bf58dd8d48988d13a941735 |
| 9   | Jardínes                 | 4bf58dd8d48988d15a941735 |
| 10  | Zoológicos               | 4bf58dd8d48988d17b941735 |
| 11  | Mercados                 | 4bf58dd8d48988d1fa941735 |
| 12  | Arte público             | 507c8c4091d498d9fc8c67a9 |
| 13  | Lugares conmemorativos   | 5642206c498e4bfca532186c |
| 14  | Museos de arte           | 4bf58dd8d48988d18f941735 |
| 15  | Miradores                | 4bf58dd8d48988d165941735 |
| 16  | Lagos                    | 4bf58dd8d48988d161941735 |
| 17  | Estadios                 | 4bf58dd8d48988d184941735 |
| 18  | Arte callejero           | 52e81612bcbc57f1066b79ee |
| 19  | Miradores elevados       | 4bf58dd8d48988d133951735 |
| 20  | Planetarios              | 4bf58dd8d48988d192941735 |
| 21  | Cementerios              | 4bf58dd8d48988d15c941735 |
| 22  | Ayuntamientos            | 4bf58dd8d48988d129941735 |
| 23  | Galerías de arte         | 4bf58dd8d48988d1e2931735 |
| 24  | Faros                    | 4bf58dd8d48988d15d941735 |
| 25  | Monumentos               | 4bf58dd8d48988d12d941735 |
| 26  | Sinagogas                | 4bf58dd8d48988d139941735 |
| 27  | Capitolios               | 4bf58dd8d48988d12a941735 |
| 28  | Castillos                | 50aaa49e4b90af0d42d5de11 |
| 29  | Auditorios               | 4bf58dd8d48988d173941735 |
| 30  | Monasterios              | 52e81612bcbc57f1066b7a40 |
| 31  | Jardínes de esculturas   | 4bf58dd8d48988d166941735 |
| 32  | Templos budistas         | 52e81612bcbc57f1066b7a3e |
| 34  | Santuarios               | 4eb1d80a4b900d56c88a45ff |
| 35  | Exibiciónes zoologicas   | 58daa1558bbb0b01f18ec1fd |
| 36  | Museos de ciencia        | 4bf58dd8d48988d191941735 |
| 37  | Plazas públicas          | 4bf58dd8d48988d164941735 |
| 38  | Palacios                 | 52e81612bcbc57f1066b7a14 |
| 39  | Acuarios                 | 4fceea171983d5d06c3e9823 |
| 40  | Fuentes                  | 56aa371be4b08b9a8d573547 |
| 41  | Iglesias y catedrales    | 4bf58dd8d48988d132941735 |
| 42  | Juntas municipales       | 52e81612bcbc57f1066b7a38 |
| 43  | Museos de historia       | 4bf58dd8d48988d190941735 |
| 44  | Lugares históricos       | 4deefb944765f83613cdba6e |
| 45  | Bahías                   | 56aa371be4b08b9a8d573544 |
| 47  | Templos Sikh             | 5bae9231bedf3950379f89c9 |
| 48  | Puentes                  | 4bf58dd8d48988d1df941735 |
| 49  | Parques                  | 4bf58dd8d48988d163941735 |
| 50  | Anfiteatros              | 56aa371be4b08b9a8d5734db |
| 51  | Teatros                  | 4bf58dd8d48988d137941735 |

Los números de teléfono deben seguir el formato regional del país del lugar, incluyendo siempre el [prefijo del país](https://en.wikipedia.org/wiki/List_of_country_calling_codes) en formato `+XXX`.

Los horarios del lugar y las horas más populares tienen las siguientes propiedades:

```
{
    "day": Día de la semana
    "monthStart": Primer mes en el que se cumple este horario,
    "monthEnd": Ultimo mes en el que se cumple este horario,
    "timeStart": Horario de apertura. Debe ser inferior al horario de cierre
    "timeEnd": Horario de cierre. Debe ser inferior al horario de apertura
},
```

Los formatos son los siguientes:

-   Día de la semana: 1 = Lunes ... 7 = Domingo.
-   Mes: 0 = Enero ... 11 = Diciembre.
    -   Si no hay restricciones de meses, su valor debe ser `-1`.
-   Horario:
    -   `"HHMM"`: `"1000"` indica que el lugar abre a las 10:00 AM.
    -   `"+HHMM"`: `"+0400"` indica que el lugar cierra a las 04:00 AM del día siguiente.

Por ejemplo:

```
...
hours: [
    {
        "day": 1
        "monthStart": 8,
        "monthEnd": 3,
        "timeStart": "1000"
        "timeEnd": "2200"
    },
    {
        "day": 1
        "monthStart": 4,
        "monthEnd": 7,
        "timeStart": "0800"
        "timeEnd": "+0200"
    },
]
```

Este horario indica que el lugar:

-   Entre septiembre y abril, el lugar estará abierto los lunes de 10:00 AM a 10:00 PM.
-   Entre mayo y agosto, el lugar estará abierto los lunes de 08:00 AM a 02:00 AM del día siguiente.

### _Pull request_

Una vez hayas añadido los lugares al archivo de base de datos correspondiente, crea un _pull request_.

En caso de que el lugar tenga imágenes, crea un archivo `.zip` con estas imágenes con la extensión `.jpg` y adjunta el archivo comprimido al pull request.

Por favor, no modifiques lugares existentes. Si deseas modificar un lugar existente, crea un _pull request_ distinto en el que **expliques que has cambiado y porqué**.

## Contribuir con código

Las versiones son nombradas mediante [SemVer](https://semver.org/).

Este proyecto usa el programa CLI [`prettier`](https://prettier.io/) respetando la configuración por defecto, excepto con:

-   Print width: 120.
-   Tab width: 4.
-   Single quotes: `true`.

Puedes formatear las nuevas contribuciones con `prettier --tab-width 4 --print-width 120 --single-quote --write <file>`.

Asímismo, se usan los comentarios en formato [JSDoc](https://jsdoc.app/).

Cuando contribuyas código a este proyecto, ten en cuenta lo siguiente:

-   Intenta escribir código que sea eficiente y rápido.
-   Escribe código que sea entendible y fácil de leer.
-   Evita escribir código complejo y que anide muchos bloques dentro de otros.
-   Comenta todo el código que añadas, cambies o modifiques.
    -   Si creas nuevas funciones o clases, recuerda usar el formato [JSDoc](https://jsdoc.app/).
    -   Comenta todo el código que sea relevante.
