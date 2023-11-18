import { useEffect } from "react";

const Redirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  });
  return null;
};

export default Redirect;
