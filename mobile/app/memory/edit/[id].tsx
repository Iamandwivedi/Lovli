import React from "react";
import { useLocalSearchParams } from "expo-router";
import { MemoryForm } from "@/src/screens/MemoryForm";

export default function EditMemory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemoryForm mode="edit" id={id} />;
}
