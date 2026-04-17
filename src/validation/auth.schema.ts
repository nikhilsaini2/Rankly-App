import * as Yup from "yup";

// ─── Central email validator ──────────────────────────────────────────────────
// Supports: alex+test@gmail.com, sub.domain@company.co.in
// Rejects:  spaces, missing TLD, bare local parts
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const emailField = Yup.string()
  .trim()
  .required("Email is required")
  .test(
    "valid-email",
    "Enter a valid email address",
    (value) => !!value && EMAIL_REGEX.test(value.trim().toLowerCase()),
  );

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const RegisterSchema = Yup.object().shape({
  firstName: Yup.string().required("First name is required"),

  lastName: Yup.string().required("Last name is required"),

  email: emailField,

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
  email: emailField,

  password: Yup.string()
    .matches(/^\S+$/, "No spaces allowed")
    .required("Password is required"),
});
