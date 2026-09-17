import { decideFormFields } from "./llm.js";

const TEST_USER = {
  firstName: "Audit",
  lastName: "Tester",
  fullName: "Audit Tester",
  email: "audit.primary@example.com",
  personalEmail: "audit.personal@example.com",
  password: "Audit@Test123!",
  phone: "9999999999",
  company: "Audit Test Company",
  city: "Test City",
  dob: "2000-01-15",
  day: "15",
  month: "January",
  year: "2000",
  gender: "Male",
  college: "Institute of Technology",
  rollNo: "TEST12345"
};

// -----------------------------------------
// STABLE LOCATOR HELPER
// -----------------------------------------
function getFieldLocator(page, field) {
  if (field.id) {
    return page.locator(`#${CSS.escape(field.id)}:visible`).first();
  }

  if (field.name) {
    return page.locator(`[name="${field.name}"]:visible`).first();
  }

  return null;
}

// -----------------------------------------
// DETERMINISTIC CLASSIFIER WITH ID/NAME PRECEDENCE
// -----------------------------------------

function classifyField(field) {
  const id = (field.id || "").toLowerCase();
  const name = (field.name || "").toLowerCase();
  const placeholder = (field.placeholder || "").toLowerCase();
  const aria = (field.ariaLabel || "").toLowerCase();
  const autocomplete = (field.autocomplete || "").toLowerCase();
  const type = (field.type || "").toLowerCase();

  const text = `
    ${id}
    ${name}
    ${placeholder}
    ${aria}
    ${autocomplete}
    ${type}
  `;

  // -------------------------
  // Strong ID/name matches
  // -------------------------

  // Roll number / university ID (must evaluate before college)
  if (
    id === "rollno" ||
    name.includes("roll") ||
    name.includes("usn") ||
    text.includes("roll number") ||
    text.includes("university id")
  ) {
    return "rollNo";
  }

  if (
    id === "firstname" ||
    name === "firstname" ||
    /first.?name|given.?name/.test(text)
  ) {
    return "firstName";
  }

  if (
    id === "lastname" ||
    name === "lastname" ||
    /last.?name|family.?name|surname/.test(text)
  ) {
    return "lastName";
  }

  if (
    id === "fullname" ||
    name === "fullname" ||
    /full.?name/.test(text)
  ) {
    return "fullName";
  }

  if (
    id === "dob" ||
    name === "dob" ||
    type === "date" ||
    /date.?of.?birth|birth.?date/.test(text)
  ) {
    return "dob";
  }

  if (
    id === "college" ||
    name === "college" ||
    /college|university|institution|campus/.test(text)
  ) {
    return "college";
  }

  if (
    id === "password" ||
    id === "plaintextpassword" ||
    name === "password" ||
    /password|passcode/.test(text)
  ) {
    return "password";
  }

  if (
    id === "personalemail" ||
    name === "personalemail" ||
    /personal.?email/.test(text)
  ) {
    return "personalEmail";
  }

  if (
    type === "email" ||
    id === "email" ||
    name === "email" ||
    /email|e-mail/.test(text)
  ) {
    return "email";
  }

  if (
    id === "mobile" ||
    id === "phonenumber" ||
    name === "mobile" ||
    /phone|mobile|telephone/.test(text)
  ) {
    return "phone";
  }

  if (
    /company|organization|organisation/.test(text)
  ) {
    return "company";
  }

  if (
    /city/.test(text)
  ) {
    return "city";
  }

  return null;
}

// -----------------------------------------
// CHECK WHETHER LLM IS CONFIGURED
// -----------------------------------------

function isLLMAvailable() {
  return (
    process.env.ENABLE_LLM === "true" &&
    Boolean(
      process.env.ANTHROPIC_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GROQ_API_KEY
    )
  );
}

// -----------------------------------------
// MAIN AUTOFILL
// -----------------------------------------

export async function autofillForm(page) {
  let filledCount = 0;

  // -----------------------------------------
  // 1. TERMS & CONDITIONS CHECKBOXES
  // -----------------------------------------
  try {
    const checkboxes = await page
      .locator("input[type='checkbox'], [role='checkbox'], .checkbox, [class*='checkbox']")
      .all();

    for (const cb of checkboxes) {
      if (await cb.isVisible().catch(() => false)) {
        const isChecked = await cb.isChecked().catch(() => false);
        if (!isChecked) {
          await cb.click({ force: true }).catch(() => {});
          console.log("[Form Filler] Checked terms & conditions checkbox");
          filledCount++;
        }
      }
    }
  } catch (err) {
    console.warn(`[Form Filler] Checkbox fill note: ${err.message}`);
  }

  // -----------------------------------------
  // 2. GENDER RADIO / PILL SELECTION
  // -----------------------------------------
  try {
    const genderEls = await page
      .locator("input[type='radio'], button, [role='radio'], label")
      .evaluateAll((nodes) => {
        return nodes
          .map((el, index) => {
            const txt = (
              el.innerText ||
              el.textContent ||
              el.getAttribute("value") ||
              ""
            )
              .trim()
              .toLowerCase();

            if (/^male$|^female$|^other$/i.test(txt)) {
              return { index, txt };
            }
            return null;
          })
          .filter(Boolean);
      })
      .catch(() => []);

    if (genderEls.length > 0) {
      const maleOption = genderEls.find((g) => /male/i.test(g.txt)) || genderEls[0];
      const elLoc = page
        .locator("input[type='radio'], button, [role='radio'], label")
        .nth(maleOption.index);

      await elLoc.click({ force: true }).catch(() => {});
      console.log("[Form Filler] Selected gender option");
      filledCount++;
    }
  } catch (err) {
    console.warn(`[Form Filler] Gender selection note: ${err.message}`);
  }

  // -----------------------------------------
  // 3. CUSTOM COLLEGE / UNIVERSITY SEARCH DROPDOWN
  // -----------------------------------------
  try {
    if (page && !page.isClosed()) {
      const collegeLoc = page.locator("#college, [name='college'], input[placeholder*='college' i], [class*='college' i]");
      const count = await collegeLoc.count().catch(() => 0);

      if (count > 0 && await collegeLoc.first().isVisible().catch(() => false)) {
        const collegeInput = collegeLoc.first();
        await collegeInput.scrollIntoViewIfNeeded().catch(() => {});
        await collegeInput.click({ force: true }).catch(() => {});
        await page.waitForTimeout(400).catch(() => {});

        // Type search string with character delay
        await collegeInput.fill("").catch(() => {});
        await collegeInput.type("Institute", { delay: 100 }).catch(() => {});
        await page.waitForTimeout(1000).catch(() => {});

        // Pick rendered option item
        const optionLoc = page.locator(
          "[role='option'], .option, li.select-option, .dropdown-item, .ng-option, .mat-option, div[class*='option' i], .tt-suggestion"
        );

        const optCount = await optionLoc.count().catch(() => 0);
        if (optCount > 0 && await optionLoc.first().isVisible().catch(() => false)) {
          await optionLoc.first().click({ force: true }).catch(() => {});
          console.log("[Form Filler] Clicked matching college dropdown option");
        } else {
          await page.keyboard.press("ArrowDown").catch(() => {});
          await page.keyboard.press("Enter").catch(() => {});
        }

        await page.waitForTimeout(500).catch(() => {});
        const selVal = await collegeInput.inputValue().catch(() => "");
        console.log(`[Form Filler] College field verified value: "${selVal}"`);
        filledCount++;
      }
    }
  } catch (err) {
    console.warn(`[Form Filler] College dropdown selection error: ${err.message}`);
  }

  // -----------------------------------------
  // 4. STANDARD INPUT, TEXTAREA, SELECT FIELDS
  // -----------------------------------------
  const fields = await page
    .locator("input, textarea, select")
    .evaluateAll((nodes) =>
      nodes
        .map((el, index) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);

          // 1. Is visible?
          const visible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0;

          if (!visible) return null;

          // 2. Is disabled/readonly?
          const disabled =
            el.disabled ||
            el.readOnly ||
            el.hasAttribute("disabled") ||
            el.hasAttribute("readonly");
          if (disabled) return null;

          const type = (el.getAttribute("type") || "text").toLowerCase();
          const name = el.getAttribute("name") || "";
          const id = el.id || "";
          const placeholder = el.getAttribute("placeholder") || "";
          const ariaLabel = el.getAttribute("aria-label") || "";
          const autocomplete = el.getAttribute("autocomplete") || "";

          // Skip non-fillable inputs
          if (
            type === "checkbox" ||
            type === "radio" ||
            type === "hidden" ||
            type === "file" ||
            type === "submit" ||
            type === "button" ||
            type === "reset" ||
            type === "image"
          ) {
            return null;
          }

          // 3. Is OTP/verification code?
          const combinedText = `${type} ${name} ${id} ${placeholder} ${ariaLabel} ${autocomplete}`.toLowerCase();
          const isOTP =
            /otp|verification|verify|2fa|mfa|passcode|captcha|security.?code|one.?time/i.test(
              combinedText
            );
          if (isOTP) return null;

          return {
            index,
            tag: el.tagName.toLowerCase(),
            type,
            name,
            id,
            placeholder,
            ariaLabel,
            autocomplete,
            required: el.required
          };
        })
        .filter(Boolean)
    )
    .catch(() => []);

  if (fields.length === 0) {
    return filledCount;
  }

  let classifications = [];

  // TRY LLM FIRST
  if (isLLMAvailable()) {
    try {
      console.log("[Form Filler] LLM available — using LLM classification");
      classifications = await decideFormFields(fields);
    } catch (error) {
      console.warn(
        `[Form Filler] LLM failed — using deterministic fallback: ${error.message}`
      );
      classifications = fields.map((field) => ({
        index: field.index,
        type: classifyField(field)
      }));
    }
  } else {
    console.log("[Form Filler] No LLM available — using deterministic classifier");
    classifications = fields.map((field) => ({
      index: field.index,
      type: classifyField(field)
    }));
  }

  // FILL IDENTIFIED FIELDS
  for (const classification of classifications) {
    const field = fields.find(
      (f) => f.id === classification.id || f.index === classification.index
    );
    if (!field) continue;

    // College was already handled by the custom dropdown logic
    if (field.id === "college") {
      console.log(
        "[Form Filler] Skipping #college — already selected from dropdown"
      );
      continue;
    }

    const fieldType = classification.type;
    if (!fieldType || fieldType === "unknown") continue;

    // Direct value mapping without fallback
    const value = TEST_USER[fieldType];
    if (!value) {
      console.warn(`[Form Filler] No test value for ${fieldType}`);
      continue;
    }

    try {
      // Use strict attribute locator (id -> name) with :visible guard
      const locator = getFieldLocator(page, field);

      if (!locator) {
        console.warn(`[Form Filler] No stable locator for ${fieldType}`);
        continue;
      }

      // SELECT
      if (field.tag === "select") {
        const options = await locator
          .locator("option")
          .evaluateAll((options) =>
            options.map((option) => ({
              value: option.value,
              text: option.textContent?.trim() || ""
            }))
          )
          .catch(() => []);

        const option = options.find(
          (opt) => opt.value && !/select|choose/i.test(opt.text)
        );

        if (option) {
          await locator.selectOption(option.value, { timeout: 1500 });
          console.log(`[Form Filler] Selected ${fieldType} for element #${field.id || field.name}`);
          filledCount++;
        }
        continue;
      }

      // NORMAL INPUT
      if (fieldType === "password") {
        await locator.focus().catch(() => {});
        await locator.fill("").catch(() => {});
        await locator.pressSequentially(value, { delay: 40 }).catch(async () => {
          await locator.fill(value).catch(() => {});
        });
        await locator.dispatchEvent("input").catch(() => {});
        await locator.dispatchEvent("change").catch(() => {});
        await locator.dispatchEvent("blur").catch(() => {});

        const pData = await locator
          .inputValue()
          .then((v) => ({
            length: v.length,
            hasSpecial: /[^A-Za-z0-9]/.test(v)
          }))
          .catch(() => ({ length: -1, hasSpecial: false }));
        console.log("[Form Filler] Password entered:", pData);
      } else {
        await locator.fill(value, { timeout: 1500 });
        await locator.dispatchEvent("input").catch(() => {});
        await locator.dispatchEvent("change").catch(() => {});
      }

      console.log(`[Form Filler] Filled ${fieldType} into element #${field.id || field.name}`);
      filledCount++;
    } catch (error) {
      console.warn(
        `[Form Filler] Could not fill ${fieldType} at element #${field.id || field.name}: ${error.message}`
      );
    }
  }

  // -----------------------------------------
  // 5. FINAL TERMS RE-CHECK BEFORE SUBMISSION
  // -----------------------------------------
  try {
    const terms = page.locator("input[type='checkbox']:visible").last();
    if ((await terms.count().catch(() => 0)) > 0) {
      if (!(await terms.isChecked().catch(() => false))) {
        await terms.check({ force: true }).catch(() => {});
      }
      console.log(
        "[Form Filler] Terms checked:",
        await terms.isChecked().catch(() => false)
      );
    }
  } catch (err) {
    console.warn(`[Form Filler] Final terms check note: ${err.message}`);
  }

  return filledCount;
}
