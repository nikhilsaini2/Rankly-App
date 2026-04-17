import * as Yup from "yup";

// ─── Central email validator ──────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const emailField = Yup.string()
  .trim()
  .required("Email is required")
  .test(
    "valid-email",
    "Enter a valid email address",
    (value) => !!value && EMAIL_REGEX.test(value.trim().toLowerCase()),
  );

// ─── Password validator ───────────────────────────────────────────────────────
// Rules: min 8 chars, 1 uppercase, 1 number, 1 special character, no spaces
const passwordField = Yup.string()
  .required("Password is required")
  .min(8, "Password must be at least 8 characters")
  .matches(/^\S+$/, "Password cannot contain spaces")
  .matches(/[A-Z]/, "Must include at least 1 uppercase letter")
  .matches(/[0-9]/, "Must include at least 1 number")
  .matches(/[^A-Za-z0-9]/, "Must include at least 1 special character");

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const RegisterSchema = Yup.object().shape({
  firstName: Yup.string()
    .required("First name is required")
    .matches(/^[A-Za-z]+$/, "First name must contain only letters"),

  lastName: Yup.string()
    .optional()
    .test(
      "valid-last-name",
      "Last name can only contain letters, \".\" and \"-\"",
      (value) => !value || /^[A-Za-z.-]+$/.test(value),
    ),

  email: emailField,

  password: passwordField,

  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm your password"),

  role: Yup.string().required("Select a role"),
});

export const loginSchema = Yup.object({
  email: emailField,

  // Login password — no strength rules, just required and no spaces
  password: Yup.string()
    .required("Password is required")
    .matches(/^\S+$/, "Password cannot contain spaces"),
});
