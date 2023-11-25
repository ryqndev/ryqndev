import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import { Color, DirectionalLight } from "three";

export const Lights = memo(function Lights({ theme }: { theme: number }) {
  const light = useRef<DirectionalLight>(null);

  useFrame(() => {
    light.current?.color.lerp(
      theme ? new Color("#6633dd") : new Color("#ffff00"),
      0.05
    );
  });

  return (
    <>
      <directionalLight
        ref={light}
        castShadow
        intensity={2}
        position={[0, 50, 100]}
        color={theme ? new Color("#ffff00") : new Color("#6633dd")}
      />
      <directionalLight
        intensity={theme ? 1 : 1}
        position={[0, -100, 50]}
        color={theme ? "#a66B33" : "#ffff00"}
      />
      <ambientLight
        intensity={theme ? 0.8 : 0.4}
        color={theme ? "#6633dd" : "white"}
      />
      <directionalLight intensity={0.4} color={"white"} />
      <directionalLight
        intensity={1}
        position={[0, -100, 100]}
        color={"white"}
      />
    </>
  );
});
