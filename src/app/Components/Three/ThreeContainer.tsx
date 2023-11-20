import clsx from "clsx";
import { ReactNode, Suspense, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { CameraControls } from "./components";
import cn from "./ThreeContainer.module.scss";
import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { useCustomKeyMapping } from "./controllers/useCustomKeyMapping";

interface ThreeContainerProps {
  className: string;
  children: ReactNode;
  theme: any;
  project: any;
  y: number;
  allowRotate: boolean;
}

export const ThreeContainer = ({
  className,
  children,
  theme,
  project,
  y,
  allowRotate = false,
}: ThreeContainerProps) => {
  const map = useCustomKeyMapping();

  return (
    <Suspense fallback={<div></div>}>
      <KeyboardControls map={map}>
        <Canvas className={clsx(className)} id={cn.container} shadows>
          <CameraControls project={project} allowRotate={allowRotate} />
          <Physics debug>
            <directionalLight
              castShadow
              intensity={2}
              position={[0, 50, 100]}
              color={theme ? "#6633dd" : "#ffff00"}
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
            {children}
          </Physics>
        </Canvas>
      </KeyboardControls>
    </Suspense>
  );
};
