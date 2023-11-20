import { memo, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Toggle from "react-toggle";
import { useTheme } from "./controller";
import { LoadingSplash, CustomMouseCursor } from "./components";
import "./styles/main.scss";
import { Home } from "./pages/Home/Home";

export const App = memo(function App() {
  const { theme, toggle } = useTheme();

  return (
    <>
      <div
        className="t-w"
        onClick={toggle}
        data-mouse-hover="button"
        data-mouse-hover-text="toggle theme"
      >
        <Toggle checked={!!theme} icons={false} onChange={toggle} />
      </div>
      <CustomMouseCursor />
      {/* <LoadingSplash> */}
      <>
        <Suspense fallback={<div>loading...</div>}>
          <Routes>
            <Route path="/" element={<Home theme={theme} />} />
          </Routes>
        </Suspense>
      </>
      {/* </LoadingSplash> */}
    </>
  );
});
