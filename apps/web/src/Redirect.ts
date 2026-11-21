import { useEffect } from "react";

export const Redirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  });

  return null;
};

