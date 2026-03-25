import { AppDispatch } from "../../types/auth.types";
import { loginFailure, loginSuccess, setLoading } from "./authSlice";

export const loginUser =
  (email: string, password: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const res = await fetch("https://your-api.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      dispatch(
        loginSuccess({
          user: data.user,
        }),
      );
    } catch (error) {
      dispatch(loginFailure("Login failed"));
    }
  };
