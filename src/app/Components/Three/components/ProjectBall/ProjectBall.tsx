import { memo, useCallback, useEffect, useState } from "react";
import { useBox } from "@react-three/cannon";
import { Html } from "@react-three/drei";
import cn from "./ProjectBall.module.scss";
import { ActionList } from "../../../ActionList/ActionList";
import { Layers } from "@react-three/fiber";

interface ProjectBallProps {
  data: any;
  selected: boolean;
}

export function ProjectBall({ data, selected }: ProjectBallProps) {
  const [hovered, setHovered] = useState(false);
  const [ref] = useBox(() => ({
    mass: 1,
    position: [
      Math.random() * 100 - 50,
      Math.random() * 50 + 100,
      Math.random() * 100 - 50,
    ],
  }));

  const hover = useCallback(() => {
    setHovered(true);
  }, []);
  const unhover = useCallback(() => {
    setHovered(false);
  }, []);

  return (
    <mesh
      // @ts-ignore: fix later
      ref={ref}
      onPointerOver={hover}
      onPointerOut={unhover}
      layers={[0, 1] as unknown as Layers}
      castShadow
    >
      {window.innerWidth > 768 && (
        <Html className={cn.container}>
          <ActionList data={data} selected={selected} />
        </Html>
      )}
      <sphereGeometry args={[8, 20, 20]} />
      <meshBasicMaterial
        attach="material"
        color={hovered ? "#ffffff" : "#00ffff"}
      />
    </mesh>
  );
}
