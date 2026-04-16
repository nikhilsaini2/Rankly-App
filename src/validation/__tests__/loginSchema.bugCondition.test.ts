/**
 * Bug Condition Exploration Test — Property 1
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists: loginSchema validates the raw (untrimmed)
 * email value, so emails with leading/trailing whitespace are incorrectly
 * rejected with "Invalid email format" even though the trimmed value is valid.
 *
 * isBugCondition(email): email !== email.trim() AND email.trim() matches the email regex
 */

import { loginSchema } from "../auth.schema";

const bugConditionEmails = [
  "  alex@gmail.com",    // leading space  (Req 1.1)
  "alex@gmail.com  ",    // trailing space (Req 1.2)
  "  alex@gmail.com  ",  // both sides     (Req 1.3)
];

describe("Property 1: Bug Condition — Whitespace Email Fails Validation on Unfixed Code", () => {
  test.each(bugConditionEmails)(
    "loginSchema.validate should resolve (not throw) for email with whitespace: %j",
    async (email) => {
      // Assert: the trimmed value is a valid email (confirms isBugCondition is true)
      expect(email.trim()).toMatch(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
      expect(email).not.toBe(email.trim()); // has leading/trailing whitespace

      // On UNFIXED code this will throw "Invalid email format" — confirming the bug.
      // After the fix (Task 3), this assertion will pass.
      await expect(
        loginSchema.validate({ email, password: "secret1" })
      ).resolves.not.toThrow();
    }
  );
});
