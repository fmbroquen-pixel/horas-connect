"use client";

import { useEffect, useState } from "react";
import { ToastOk } from "./toast-ok";
import { ToastAviso } from "./toast-aviso";

// Avisos de eliminación para toda la app, con un único host montado en el
// layout.
//
// El host va arriba y no en cada pantalla por un motivo concreto: la fila que
// se elimina se desmonta, y con ella se iría cualquier toast que dibujara.
// Antes eso obligaba a subir el estado a la tabla de cada módulo y a pasar un
// callback fila por fila. Acá el emisor es una función suelta: quien borra
// avisa y se olvida, sin importar si sigue existiendo un instante después.
//
// Un solo suscriptor a propósito: hay un host y está en el layout. Si en algún
// momento hubiera dos, gana el último montado, que es el que está en pantalla.
type Aviso = { mensaje: string; error: boolean; seq: number };

let emitir: ((mensaje: string, error: boolean) => void) | null = null;

// La eliminación salió bien. El mensaje lo pone quien borra, porque solo ahí
// se sabe qué se borró y si fue a la papelera o para siempre.
export function avisarEliminado(mensaje: string) {
  emitir?.(mensaje, false);
}

// Falló. Se muestra con el estilo de aviso, no con el de confirmación: no
// puede parecer que algo se borró cuando no se borró.
export function avisarErrorAlEliminar(mensaje: string) {
  emitir?.(mensaje, true);
}

export function AvisosDeEliminacion() {
  // El contador hace que dos borrados seguidos vuelvan a mostrar el toast:
  // sin él, repetir el mismo mensaje no cambiaría el estado.
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    emitir = (mensaje, error) =>
      setAviso((a) => ({ mensaje, error, seq: (a?.seq ?? 0) + 1 }));
    return () => {
      emitir = null;
    };
  }, []);

  if (aviso?.error) {
    return (
      <ToastAviso mensaje={aviso.mensaje} onClose={() => setAviso(null)} />
    );
  }
  return (
    <ToastOk
      key={aviso?.seq}
      show={aviso !== null}
      onHide={() => setAviso(null)}
    >
      {aviso?.mensaje}
    </ToastOk>
  );
}
