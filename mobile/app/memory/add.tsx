// Add / Edit Memory — supports both create and edit through file routing.
// app/memory/add.tsx (new), app/memory/[id].tsx (edit). Shared component handles both.
import React from "react";
import { MemoryForm } from "@/src/screens/MemoryForm";

export default function AddMemory() {
  return <MemoryForm mode="create" />;
}
