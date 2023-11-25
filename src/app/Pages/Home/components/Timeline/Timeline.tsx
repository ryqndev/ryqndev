import { ReactNode, memo } from "react";
import { ThreeContainer, ProjectBall, UCI } from "../../../../components";
import PROJECTS from "../../../../assets/projects.json";
import cn from "./Timeline.module.scss";
import { Zotbot } from "../../../../components/Three/components/Zotbot";
import { DrivableZotbot } from "../../../../components/Three/components/Zotbot/DrivableZotbot";

interface TimelineProps {
  theme: any;
  project: any;
  y: number;
  children: ReactNode;
  viewModelState: boolean;
}

export const Timeline = ({
  theme,
  project,
  y,
  children,
  viewModelState = true,
  ...props
}: TimelineProps) => (
  <div className={cn.container} {...props}>
    <ThreeContainer
      className={cn.container}
      theme={theme}
      project={project}
      allowRotate={viewModelState}
      y={y}
    >
      <Zotbot />
      {/* {!viewModelState &&
        PROJECTS.map((data, index) => (
          <ProjectBall
            key={data.name}
            data={data}
            selected={project === index}
          />
        ))} */}
      <DrivableZotbot />
      <UCI />
    </ThreeContainer>
    {children}
  </div>
);
