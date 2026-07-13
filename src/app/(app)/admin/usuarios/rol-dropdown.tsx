"use client";

import { useState } from "react";
import { Dropdown } from "@/components/dropdown";

const OPCIONES_ROL = [
  { value: "guest", label: "Mentor (guest)" },
  { value: "reader", label: "Solo lectura (reader)" },
  { value: "admin", label: "Administrador" },
];

// Dropdown de rol autogestionado: mantiene su propio estado y expone el valor
// con un input oculto name="rol", para usarlo dentro de forms server.
export function RolDropdown({
  defaultValue = "guest",
  className = "w-52",
}: {
  defaultValue?: string;
  className?: string;
}) {
  const [rol, setRol] = useState(defaultValue);
  return (
    <Dropdown
      name="rol"
      value={rol}
      onChange={setRol}
      options={OPCIONES_ROL}
      className={className}
      ariaLabel="Rol"
    />
  );
}
