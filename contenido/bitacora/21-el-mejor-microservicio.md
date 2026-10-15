---
titulo: El mejor microservicio es el que no se construye
slug: el-mejor-microservicio
orden: 21
resumen: Diez años con microservicios enseñan que mantener cada uno cuesta: dependencias, migraciones y versiones. Antes de diseñar 56, pregúntate si los necesitas.
---

He trabajado durante casi 10 años con arquitecturas de microservicios, manejando cantidades masivas de datos y solicitudes por segundo. Si hay algo que he aprendido, es que mantener un servicio puede ser un verdadero desafío. No hablo solo de añadir nuevas funciones o mejoras, sino de tareas aparentemente simples como migraciones de librerías, actualizaciones de dependencias (¿recuerdan el incidente con Log4J?), o incluso actualizar el lenguaje de programación porque la versión anterior ha quedado obsoleta (Java, Python, Node...). Estas tareas siempre estarán ahí, no agregarán valor directo a tus clientes, pero son imprescindibles.

Desde hace aproximadamente un año, doy clases sobre arquitectura de microservicios. He leído libros, visto videos y artículos de varios expertos, y noto una tendencia común, especialmente entre los “gurús”: crear tantos microservicios como sea posible en tu sistema.

¿Diseñando un sistema tipo WhatsApp? Vamos a crear 45 microservicios.

¿Desarrollando una app como Uber? Es hora de implementar un microservicio para convertir precios entre monedas.

Sí, estas ideas tienen sentido en teoría. Los sistemas más simples pueden facilitar la escalabilidad, pero esa es la clave: facilitan solo una parte del proceso. Antes de diseñar una arquitectura con 56 microservicios, cada uno con su propia base de datos y comunicación asíncrona, detente un momento y pregúntate si realmente los necesitas, si cuentas con el personal adecuado para mantenerlos y si puedes asumir el costo de mantener estos servicios operativos y actualizados.

No eres Amazon, Microsoft o Google. No sigas tendencias solo porque las grandes compañías lo hacen, sin entender su contexto y el tuyo. Y, sobre todo, no escuches ciegamente a quienes te dicen lo contrario (¡incluyéndome a mí! 😜).

Para ir más a fondo: [Microservicios: cuándo no](/notas/microservicios-cuando-no/).
