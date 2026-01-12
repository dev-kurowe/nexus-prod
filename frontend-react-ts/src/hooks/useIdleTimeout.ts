import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
const TIMEOUT_MS = 15 * 60 * 1000; 

export default function useIdleTimeout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => {
      const token = Cookies.get("token");
      if (token) {
        Cookies.remove("token");
        Cookies.remove("user");
        navigate("/"); 
        window.location.reload();
      }
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(handleLogout, TIMEOUT_MS);
    };
    const events = [
      "mousemove",
      "keydown",
      "wheel",
      "mousedown",
      "touchstart"
    ];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });
    resetTimer();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate]);
}