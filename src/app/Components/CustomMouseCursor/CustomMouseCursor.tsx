import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { MouseEvent, ReactEventHandler, useEffect, useState } from "react";
import cn from "./CustomMouseCursor.module.scss";

export const CustomMouseCursor = () => {
  const { t } = useTranslation();
  const [mouse, setMouse] = useState({
    pos: [-100, -100],
    target: "none",
    message: "",
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        pos: [e.clientX, e.clientY],
        // @ts-ignore: Implement custom event later
        target: e.target.dataset?.mouseHover,
        // @ts-ignore: Implement custom event later
        message: e.target.dataset?.mouseHoverText ?? "",
      });
    };
    // @ts-ignore: Implement custom event later
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      // @ts-ignore: Implement custom event later
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      className={clsx(
        cn.container,
        mouse.target === "link" && cn.link,
        mouse.target === "button" && cn.button
      )}
      style={{ top: mouse.pos[1], left: mouse.pos[0] }}
    >
      <svg viewBox="0 0 300 300" enableBackground="new 0 0 300 300">
        <defs>
          <path
            id="circleTextPath"
            d=" M 150, 150 m -120, 0 a 120,120 0 0,1 240,0 a 120,120 0 0,1 -240,0 "
          />
        </defs>
        <g>
          <use xlinkHref="#circleTextPath" fill="none" />
          <text fill="#fff">
            <textPath xlinkHref="#circleTextPath">{t(mouse.message)}</textPath>
          </text>
        </g>
      </svg>
    </div>
  );
};
