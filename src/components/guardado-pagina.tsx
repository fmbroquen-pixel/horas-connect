"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { BTN_PRIMARY } from "@/lib/ui";

// Un solo Guardar para una pantalla con varias secciones.
//
// Usuarios tiene tres cards —datos, tarifa y clientes asignados— y cada una
// traía su propio botón. Eran tres formularios independientes y por lo tanto
// tres guardados: alguien que tocaba las tres cosas tenía que acordarse de
// apretar tres veces, y no había nada que le avisara si se olvidaba de una.
//
// Cada sección sigue siendo dueña de su estado y de su server action; lo único
// que cede es el botón. Se registra acá con una función para guardarse a sí
// misma, y el botón del pie las llama a todas.

export type ResultadoSeccion = { error?: string } | void;

type Registro = {
  sucio: boolean;
  // Ref y no la función directa: la sección la redefine en cada render y no
  // queremos volver a registrar por eso.
  guardar: { current: () => Promise<ResultadoSeccion> };
  // Para nombrar la sección que falló.
  titulo: string;
  // Posición fija, asignada la primera vez que la sección se registra.
  //
  // Hace falta porque una sección se vuelve a registrar cada vez que cambia si
  // está sucia, y un Map recorre por orden de inserción: al reescribirla se iba
  // al final. O sea que la sección que acababas de editar pasaba a guardarse
  // última, y si alguna anterior fallaba, tus cambios se perdían. Justo la que
  // tocaste era la que menos chances tenía.
  orden: number;
};

type Ctx = {
  // Si es false, no hay provider: la sección dibuja su propio botón, como
  // antes. Es lo que deja a "Mi perfil" funcionando sin cambios.
  coordinado: boolean;
  registrar: (id: string, r: Omit<Registro, "orden">) => void;
  quitar: (id: string) => void;
  hayCambios: boolean;
  guardando: boolean;
  guardarTodo: () => Promise<boolean>;
  errores: string[];
};

const GuardadoCtx = createContext<Ctx>({
  coordinado: false,
  registrar: () => {},
  quitar: () => {},
  hayCambios: false,
  guardando: false,
  guardarTodo: async () => true,
  errores: [],
});

export function useGuardadoPagina() {
  return useContext(GuardadoCtx);
}

export function GuardadoPaginaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const secciones = useRef(new Map<string, Registro>());
  const [hayCambios, setHayCambios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const recalcular = useCallback(() => {
    const hay = [...secciones.current.values()].some((r) => r.sucio);
    setHayCambios((antes) => (antes === hay ? antes : hay));
  }, []);

  // El orden vive aparte y NO se limpia al desregistrar. Guardarlo dentro del
  // registro no alcanzaba: al ensuciarse, la sección se da de baja y se vuelve a
  // dar de alta, y en la baja se perdía su posición junto con todo lo demás.
  const orden = useRef(new Map<string, number>());
  const proximoOrden = useRef(0);

  const registrar = useCallback(
    (id: string, r: Omit<Registro, "orden">) => {
      if (!orden.current.has(id)) orden.current.set(id, proximoOrden.current++);
      secciones.current.set(id, { ...r, orden: orden.current.get(id)! });
      recalcular();
    },
    [recalcular],
  );

  const quitar = useCallback(
    (id: string) => {
      secciones.current.delete(id);
      recalcular();
    },
    [recalcular],
  );

  // Guarda TODAS las secciones, no solo las sucias. Las acciones son
  // idempotentes, así que guardar algo que no cambió no cuesta nada; y si la
  // detección de cambios fallara, el botón seguiría sirviendo. Que un botón de
  // guardar no guarde es peor que un viaje de más.
  //
  // No se corta en el primer error: se intentan todas y se juntan los que
  // hubo. Cortar dejaba a las secciones siguientes sin guardar por un problema
  // que no era de ellas.
  const guardarTodo = useCallback(async () => {
    setGuardando(true);
    setErrores([]);
    const enOrden = [...secciones.current.values()].sort(
      (a, b) => a.orden - b.orden,
    );
    const fallos: string[] = [];
    try {
      for (const r of enOrden) {
        try {
          const res = await r.guardar.current();
          if (res && res.error) fallos.push(`${r.titulo}: ${res.error}`);
        } catch {
          fallos.push(`${r.titulo}: no se pudo guardar.`);
        }
      }
      setErrores(fallos);
      return fallos.length === 0;
    } finally {
      setGuardando(false);
    }
  }, []);

  return (
    <GuardadoCtx.Provider
      value={{
        coordinado: true,
        registrar,
        quitar,
        hayCambios,
        guardando,
        guardarTodo,
        errores,
      }}
    >
      {children}
    </GuardadoCtx.Provider>
  );
}

// La usa cada sección para ceder su botón. Devuelve si hay coordinador: cuando
// no lo hay, la sección dibuja el suyo y sigue andando sola.
export function useSeccionGuardable(
  id: string,
  titulo: string,
  sucio: boolean,
  guardar: () => Promise<ResultadoSeccion>,
): boolean {
  const { coordinado, registrar, quitar } = useContext(GuardadoCtx);
  const guardarRef = useRef(guardar);
  // En efecto y no durante el render: escribir un ref mientras se renderiza es
  // un efecto secundario, y con StrictMode o un render descartado quedaría
  // apuntando a una versión que nunca llegó a la pantalla.
  useEffect(() => {
    guardarRef.current = guardar;
  });

  useEffect(() => {
    if (!coordinado) return;
    registrar(id, { sucio, guardar: guardarRef, titulo });
    return () => quitar(id);
  }, [coordinado, registrar, quitar, id, sucio, titulo]);

  return coordinado;
}

// El botón del pie. Va fuera de las cards, alineado a la derecha, con el mismo
// violeta sólido que "+ Agregar usuario": guardar la pantalla es una acción
// principal, y el check verde queda para confirmaciones puntuales dentro de una
// fila o un modal.
//
// Siempre habilitado, incluso sin cambios: ver el comentario de guardarTodo.
export function BotonGuardarPagina({ etiqueta = "Guardar" }: { etiqueta?: string }) {
  const { guardando, guardarTodo, errores } = useGuardadoPagina();
  return (
    <div className="flex flex-col items-end gap-2">
      {/* Los errores van pegados al botón: es donde está mirando quien acaba de
          apretarlo. Nombran la sección, que con un Guardar único es lo único
          que dice dónde mirar. */}
      {errores.map((e) => (
        <p key={e} className="text-xs text-dc-pink" role="alert">
          {e}
        </p>
      ))}
      <button
        type="button"
        onClick={() => void guardarTodo()}
        disabled={guardando}
        className={BTN_PRIMARY}
      >
        {guardando ? "Guardando…" : etiqueta}
      </button>
    </div>
  );
}
