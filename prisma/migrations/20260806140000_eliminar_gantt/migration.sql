-- El Gantt se retiro de la app hace tiempo y el plan de trabajo vive en
-- listas_roadmap / tareas_roadmap. La tabla quedaba "por si se rediseña la
-- vista de cronograma", pero un modelo que nadie lee ni escribe solo agrega
-- ruido al schema y a la generacion del cliente.
--
-- Se verifico que esta vacia (0 filas) antes de borrarla: no se pierde nada.
-- El enum EstadoTarea era exclusivo de esta tabla; EstadoTareaRoadmap, que es
-- el que usa el Follow Up, no se toca.
DROP TABLE "tareas_proyecto";

DROP TYPE "EstadoTarea";
