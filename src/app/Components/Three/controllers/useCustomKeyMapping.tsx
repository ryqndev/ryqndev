import { KeyboardControlsEntry } from "@react-three/drei";
import { useMemo } from "react";

export enum CustomControls {
  FORWARD = "FORWARD",
  BACKWARD = "BACKWARD",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  JUMP = "JUMP",
}

export const useCustomKeyMapping = () => {
  const map = useMemo<KeyboardControlsEntry<CustomControls>[]>(
    () => [
      { name: CustomControls.FORWARD, keys: ["KeyW"] },
      { name: CustomControls.BACKWARD, keys: ["KeyS"] },
      { name: CustomControls.LEFT, keys: ["KeyA"] },
      { name: CustomControls.RIGHT, keys: ["KeyD"] },
      { name: CustomControls.JUMP, keys: ["Space"] },
    ],
    []
  );

  return map;
};
