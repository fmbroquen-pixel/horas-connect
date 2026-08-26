"use client";

import { useEffect, useState } from "react";
import { ToastOk } from "./toast-ok";
import { ToastAviso } from "./toast-aviso";

// Avisos breves para toda la app, con un único host montado en el layout.
//
// El host va arriba y no en cada pantalla por un motivo concreto: quien avisa
// suele desaparecer justo después —la fila que se elimina se desmonta, el
// formulario de alta se pliega al guardar— y se llevaría con él cualquier
// toast que dibujara. Acá el emisor es una función suelta: se avisa y se
// olvida, sin importar si el que avisó sigue existiendo un instante después.
//
// Un solo suscriptor a propósito: hay un host y está en el layout. Si en algún
// momento hubiera dos, gana el último montado, que es el que está en pantalla.
type Aviso = { mensaje: string; error: boolean; seq: number };

let emitir: ((mensaje: string, error: boolean) => void) | null = null;

// Salió bien. El mensaje lo pone quien hizo la acción, porque solo ahí se sabe
// qué pasó ("Tarea enviada a papelera", "Hora registrada").
export function avisarOk(mensaje: string) {
  emitir?.(mensaje, false);
}

// Falló. Se muestra con el estilo de aviso, no con el de confirmación: no
// puede parecer que algo salió bien cuando no salió.
export function avisarError(mensaje: string) {
  emitir?.(mensaje, true);
}

export function Avisos() {
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
