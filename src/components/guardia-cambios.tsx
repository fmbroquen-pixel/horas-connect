"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useGuardadoPagina } from "@/components/guardado-pagina";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

// Avisa antes de salir de una pantalla con cambios sin guardar.
//
// Con un botón único al pie, olvidarse de guardar dejó de ser un descuido chico:
// antes cada card se guardaba sola y lo peor que pasaba era perder una; ahora se
// pierde todo lo que se tocó.
//
// Son dos caminos distintos y ninguno cubre al otro:
//
//   · Salir del sitio —recargar, cerrar la pestaña, escribir otra URL— solo se
//     puede frenar con `beforeunload`, y ahí el navegador impone su propio
//     cartel: no se puede ofrecer "Guardar y salir".
//   · Navegar dentro de la app no dispara `beforeunload`, porque nunca se
//     descarga el documento. Ese clic se intercepta acá y sí puede preguntar
//     bien.
export function GuardiaCambios() {
  const { hayCambios, guardarTodo } = useGuardadoPagina();
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);
  const [guardandoYSaliendo, setGuardandoYSaliendo] = useState(false);

  // Salida del sitio. El texto lo pone el navegador; devolver algo es lo único
  // que hace falta para que aparezca.
  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [hayCambios]);

  // Navegación dentro de la app. Se escucha en captura y sobre el documento
  // entero: los enlaces que llevan afuera de esta pantalla están en la sidebar
  // y en las solapas, o sea fuera del árbol de este componente.
  useEffect(() => {
    if (!hayCambios) return;

    const alClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      // Con modificador el navegador abre otra pestaña: esta pantalla se queda
      // como está y no hay nada que preguntar.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const ancla = (e.target as Element | null)?.closest?.("a[href]");
      if (!(ancla instanceof HTMLAnchorElement)) return;
      if (ancla.target && ancla.target !== "_self") return;
      if (ancla.hasAttribute("download")) return;

      const url = new URL(ancla.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Ir al mismo lugar no es salir.
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;

      e.preventDefault();
      setDestino(url.pathname + url.search);
    };

    document.addEventListener("click", alClic, true);
    return () => document.removeEventListener("click", alClic, true);
  }, [hayCambios]);

  const salir = () => {
    const url = destino;
    setDestino(null);
    if (url) router.push(url);
  };

  const guardarYSalir = async () => {
    setGuardandoYSaliendo(true);
    const ok = await guardarTodo();
    setGuardandoYSaliendo(false);
    // Si el guardado falló, no se navega: el error queda a la vista y lo
    // escrito no se pierde. Irse igual sería justamente lo que este cartel
    // trata de evitar.
    if (ok) salir();
    else setDestino(null);
  };

  return (
    <Modal
      open={destino !== null}
      onClose={() => setDestino(null)}
      labelledBy="titulo-cambios-sin-guardar"
    >
      {/* max-w-lg y no md: con tres acciones, "Cancelar · Salir sin guardar ·
          Guardar y salir" no entraba en 448px y la principal caía sola a un
          segundo renglón. */}
      <div className="w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <h2
          id="titulo-cambios-sin-guardar"
          className="font-display text-sm uppercase text-white"
        >
          Cambios sin guardar
        </h2>
        <p className="mt-3 text-sm text-dc-text">
          Tenés cambios sin guardar. ¿Querés guardarlos antes de salir?
        </p>

        {/* En pantalla angosta van en columna y ocupando todo el ancho, nunca
            apretados ni partidos a la mitad. El col-reverse es para que, en esa
            columna, la acción principal quede arriba: en fila va a la derecha
            —el lugar donde se la busca al final— y al apilarse, arriba. El
            orden del DOM es uno solo y sigue siendo el del foco: Cancelar
            primero. */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDestino(null)}
            className={BTN_SECONDARY}
          >
            Cancelar
          </button>
          <button type="button" onClick={salir} className={BTN_SECONDARY}>
            Salir sin guardar
          </button>
          <button
            type="button"
            onClick={() => void guardarYSalir()}
            disabled={guardandoYSaliendo}
            className={BTN_PRIMARY}
          >
            {guardandoYSaliendo ? "Guardando…" : "Guardar y salir"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
