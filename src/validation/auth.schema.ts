import * as Yup from "yup";

export const RegisterSchema = Yup.object().shape({
  firstName: Yup.string().required("First name is required"),

  lastName: Yup.string().required("Last name is required"),

  email: Yup.string()
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid email format",
    )
    .required("Email is required"),

  password: Yup.string()
    .min(6, "Min 6 chars")
    .matches(/^\S+$/, "No spaces allowed")
    .required("Password is required"),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm your password"),

  role: Yup.string().required("Select a role"),
});

export const loginSchema = Yup.object({
  email: Yup.string()
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid email format",
    )
    .required("Email is required"),

  password: Yup.string()
    .matches(/^\S+$/, "No spaces allowed")
    .required("Password is required"),
});
