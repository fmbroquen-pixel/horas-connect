// El aviso de solo lectura por proyecto inactivo, en un solo lugar.
//
// Vive en lib y no dentro de una pantalla porque lo usan cinco módulos que no
// se importan entre sí: Home CORE (semáforo y etapa), la cabecera del proyecto,
// el Follow Up entero, y las filas históricas de Time Tracking y de Expenses.
// Estaba escrito de seis maneras distintas —algunas con el nombre del proyecto
// adelante, otras hablando de "cliente"— y seis redacciones para una sola regla
// se leen como seis reglas.
//
// Sin el nombre del proyecto a propósito: el tooltip sale de un control que ya
// está dentro de ese proyecto, o en una fila que lo tiene al lado. Repetirlo no
// agrega nada y alarga el globo.
//
// No lo usan los mensajes de ERROR del servidor, y es deliberado: esos sí
// nombran al proyecto porque aparecen al intentar guardar una edición masiva o
// una importación, donde saber cuál de todos está apagado es lo que permite
// sacarlo de la selección.
export const MOTIVO_INACTIVO = "Proyecto inactivo · Solo lectura";
