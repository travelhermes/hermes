# Hermes

Hermes es un sistema recomendador y planificador turístico, para facilitar la tarea más tediosa de todo viaje: **planificarlo**.

En este repositorio se encuentra el código utilizado para la generación de recomendaciones.

## Dependencias

- [Rust](https://www.rust-lang.org/): Para cálculos computacionales del sistema recomendador.
- [Neon](https://neon-bindings.com/): Libreria para compilar programas escritos en Rust para que sean accesibles por Node.js.

## Implementación

hermes-rust implementa MPIP (modified proximity-impact-popularity) [1], presentado por S. Manochandar y M. Punniyamoorthy. MPIP analiza las medidas convencionales para calcular la similitud, como el coeficiente de correlación o el coeficiente de Jaccard para mostrar su efectividad y errores. 

Posteriormente analiza PIP (Proximity-Impact-Popularity)[2], que mejora a las medidas anteriores.

Finalmente, se presentan mejoras para PIP, que mejoras su efectividad y reduce su salida a un rango entre [0,1], más manejable

## Referencias

> [1] S. Manochandar y M. Punniyamoorthy, «A new user similarity measure in a new
prediction model for collaborative filtering», Appl. Intell., vol. 51, n. o 1, pp. 586-
615, ene. 2021, doi: 10.1007/s10489-020-01811-3.
> [2] H. J. Ahn, «A new similarity measure for collaborative filtering to alleviate the new
user cold-starting problem», Inf. Sci. (Ny)., vol. 178, n. o 1, pp. 37-51, ene. 2008, doi:
10.1016/j.ins.2007.07.024.


