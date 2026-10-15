---
titulo: ¿Uso un LLM, luego existo?
slug: uso-un-llm-luego-existo
orden: 11
resumen: Cómo uso los LLMs para programar, por qué se equivocan en bases de código grandes y por qué hoy saber importa más que saber hacer.
fecha: 2025-09-20
---

En la empresa donde trabajo se ha puesto de moda usar LLMs para todo, con la consigna de que siempre deben hacernos más eficientes. Eso me hizo reflexionar sobre mi experiencia personal con ellos: cómo los uso, lo que me han dado y lo que realmente pienso (leyendo tanto a detractores como a fanáticos).

Un poco de contexto. En octubre de 2024, poco después de entrar a mi actual empresa, mandé este mensaje a mis amigos más cercanos (con grosería censurada para no meterme en líos jaja):

> La manera en que estoy usando ChatGPT últimamente es algo que qué bárbaro.
>
> Cuando se den cuenta que tira el 95% de mi código me van a correr.

¿Por qué importa? Porque el “boom” de los LLMs coincidió con mi paso por una BigTech. En ese tiempo, el miedo a filtrar información era fuerte, así que nos prohibían usarlos para trabajo. Confieso que algunos correos sí los escribí con ayuda, sobre todo para mejorar mi inglés. Pero cuando al fin pude usarlos, descubrí que eran perfectos para lo que esperaba:

Rebotar ideas, revisar código, encontrar otra manera de hacer algo, copiar, pegar y modificar (y claro que creen boilerplate code por mí!).

Para que se entienda mejor: soy “viejo”. ¿Qué tan viejo? Mi primer internet corría a 52kbps. Aprendí a programar por accidente y me gustó, pero también soy práctico (y flojo). Si ya sé hacer algo, no pierdo tiempo perfeccionándolo (a menos que sea necesario). Prefiero usarlo para resolver problemas. Por eso, más que en StackOverflow, mi aprendizaje vino de leer miles de líneas de código interno en las empresas donde trabajé. Eso me obligó a desarrollar el hábito de leer, correr y entender código ajeno para adaptarlo. Así que tener un “genie”, como lo llama Kent Beck, que me genere una posible solución lista para probar y modificar, siempre fue un sueño. Y cuando entré aquí, decidí aprovecharlo (con cuidado de no compartir nada sensible, claro).

En ese entonces hablar de LLMs era casi secreto. Hoy es distinto: la narrativa es que nos harán mejores, que las máquinas deben escribir código.

Pero aquí está el problema: se equivocan mucho. Aunque mejoran, siguen teniendo poco contexto. En bases de código grandes o conversaciones largas, fallan, inventan, borran o asumen.

Ejemplo real:

Este test no funciona, arréglalo

Tienes razón Juan 🚀 vamos a arreglarlo

...

Y lo que hizo fue borrar las líneas que causaban el error (o directamente el test).

¿Creo que en poco tiempo X% del código será escrito por máquinas? No, en absoluto.

En un video o una imagen, los errores no pesan tanto. ¿Qué importa si alguien aparece con seis dedos? Pero en código, en procesos críticos, sí importa: que un sistema regale dinero de más, que apruebe un reembolso indebido o que decida operarte el apéndice cuando solo necesitabas eructar.

¿Son útiles? ¡Claro que sí! Los uso todos los días: en mi trabajo, en mi doctorado (para crear valor), incluso con mis hijos. Pero los uso en cosas donde sé detectar cuándo algo está muy mal y cuándo no.

Por eso no compro el discurso de quienes creen que porque Cursor o Lovable les generan una página ya tienen el trabajo hecho, y luego se frustran porque tardan más con tres prompts que haciéndolo ellos.

¿Mi consejo?

Primero aprende los fundamentos. Hoy más que nunca, saber importa más que saber hacer. Cuando dominas los fundamentos, sabes cuándo delegar, cuándo revisar y cuándo un error es tolerable.

Cualquiera puede manejar un carro automático, pero no todos saben qué hacer cuando falla el freno. Con los LLM pasa lo mismo: cualquiera puede generar código, pero no todos saben cuándo detenerse, corregir o tomar el control.
