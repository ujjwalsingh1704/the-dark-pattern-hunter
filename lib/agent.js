import path from "node:path";
import crypto from "node:crypto";

import {
  runAllChecks,
  checkFlowAsymmetry,
  scoreFindings,
  checkFalseUrgency
} from "./checks.js";

import { decideNextAction } from "./llm.js";
import { autofillForm } from "./form-filler.js";
import { buildAuditReport } from "./report.js";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "public",
  "screenshots"
);

const INTERACTIVE_SELECTOR =
  "button, a, input[type='button'], input[type='submit'], [role='button'], .btn, [class*='btn'], [class*='button'], [onclick]";

function escapeCss(str) {
  if (!str) return "";
  return typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(str)
    : str.replace(/([^\w-])/g, "\\$1");
}

function escapeAttribute(str) {
  if (!str) return "";
  return str.replace(/"/g, '\\"');
}

export class AutonomousAgent {
  constructor(page, auditId) {
    this.page = page;
    this.auditId = auditId;

    this.auditState = {
      goal: "Audit website for dark patterns",
      targetUrl: page.url(),
      flow: "signup",
      step: 0,
      visitedUrls: [],
      actions: [],
      findings: [],
      screenshots: [],
      investigationQueue: []
    };
  }

  // ---------------------------------------------------------
  // Stable element resolution by HTML ID, Role + Text, Name,
  // or Tag + Text fallback (eliminating fragile nth-index matching)
  // ---------------------------------------------------------
  async resolveElement(element) {
    if (!element) return null;

    // 1. Try HTML id first
    const htmlId = element.idAttr || element.htmlId;
    if (htmlId) {
      const locator = this.page.locator(`#${escapeCss(htmlId)}`);
      if ((await locator.count()) > 0) {
        return locator.first();
      }
    }

    // 2. Try role + exact text
    if (element.role && element.text) {
      const locator = this.page.getByRole(element.role, {
        name: element.text,
        exact: true
      });
      if ((await locator.count()) > 0) {
        return locator.first();
      }
    }

    // 3. Try name attribute
    const nameVal = element.nameAttr || element.name;
    if (nameVal) {
      const locator = this.page.locator(`[name="${escapeAttribute(nameVal)}"]`);
      if ((await locator.count()) > 0) {
        return locator.first();
      }
    }

    // 4. Text fallback
    if (element.text) {
      const locator = this.page
        .locator(element.tag || "button")
        .filter({ hasText: element.text })
        .first();

      if (
        (await locator.count()) > 0 &&
        (await locator.isVisible().catch(() => false))
      ) {
        return locator;
      }
    }

    return null;
  }

  // ---------------------------------------------------------
  // Detect whether a visible editable form exists on the page
  // ---------------------------------------------------------
  async hasVisibleEditableForm() {
    try {
      const fields = this.page.locator("input, textarea, select");
      const count = await fields.count();

      for (let i = 0; i < count; i++) {
        const field = fields.nth(i);

        if (!(await field.isVisible().catch(() => false))) {
          continue;
        }

        const disabled = await field.isDisabled().catch(() => false);
        if (disabled) continue;

        const readonly = await field.getAttribute("readonly").catch(() => null);
        if (readonly !== null) continue;

        return true;
      }
    } catch {}

    return false;
  }

  // ---------------------------------------------------------
  // Create a small fingerprint of the current page.
  // ---------------------------------------------------------
  async getPageFingerprint() {
    try {
      const url = this.page.url();

      const text = await this.page
        .locator("body")
        .innerText()
        .catch(() => "");

      const importantText = text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      return crypto
        .createHash("md5")
        .update(`${url}|${importantText}`)
        .digest("hex");

    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------
  // Read visible interactive elements in ONE browser call.
  // ---------------------------------------------------------
  async readPage() {
    try {
      const elements = await this.page
        .locator(INTERACTIVE_SELECTOR)
        .evaluateAll((nodes) => {
          return nodes
            .map((el, index) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);

              const visible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0;

              if (!visible) return null;

              const tag = el.tagName.toLowerCase();

              const text =
                el.innerText ||
                el.value ||
                el.getAttribute("aria-label") ||
                el.getAttribute("title") ||
                "";

              return {
                domIndex: index,
                tag,
                idAttr: el.getAttribute("id"),
                nameAttr: el.getAttribute("name"),
                role:
                  el.getAttribute("role") ||
                  (tag === "a" ? "link" : "button"),
                text: text
                  .trim()
                  .replace(/\s+/g, " ")
                  .slice(0, 100),
                href: el.getAttribute("href"),
                type: el.getAttribute("type"),
                disabled: !!el.disabled
              };
            })
            .filter(Boolean)
            .filter((el) => el.text || el.href)
            .slice(0, 30);
        });

      const finalElements = elements.map((element, index) => ({
        id: `el_${index + 1}`,
        ...element,
        visible: true,
        enabled: !element.disabled
      }));

      const elementMap = new Map();

      for (const element of finalElements) {
        elementMap.set(element.id, element);
      }

      return {
        elements: finalElements,
        elementMap
      };

      return {
        elements: finalElements,
        elementMap
      };

    } catch (error) {
      console.warn(
        `[Agent] Could not read page: ${error.message}`
      );

      return {
        elements: [],
        elementMap: new Map()
      };
    }
  }

  // ---------------------------------------------------------
  // Screenshot
  // ---------------------------------------------------------
  async takeScreenshot(flow, stepIndex) {
    if (!this.page || this.page.isClosed()) {
      return null;
    }

    const screenshotName = `${this.auditId}-${flow}-${stepIndex}.png`;
    const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);

    try {
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        timeout: 3500
      });

      return `/screenshots/${screenshotName}`;

    } catch {
      try {
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false,
          timeout: 3500
        });

        return `/screenshots/${screenshotName}`;

      } catch (error) {
        console.warn(
          `[Agent] Viewport screenshot fallback failed: ${error.message}`
        );

        return null;
      }
    }
  }

  // ---------------------------------------------------------
  // Check urgency twice.
  // ---------------------------------------------------------
  async reloadAndVerifyUrgency(finding, stepIndex) {
    try {
      console.log(
        `[Agent] Verifying urgency claim...`
      );

      await this.page.reload({
        waitUntil: "domcontentloaded",
        timeout: 4000
      }).catch(() => {});

      const rechecked =
        await checkFalseUrgency(
          this.page,
          stepIndex
        );

      if (rechecked.length > 0) {
        finding.severity = "high";

        finding.detail +=
          " [Verified: urgency messaging remained unchanged after page reload.]";

        finding.confidence = 0.95;
      }

    } catch (error) {
      console.warn(
        `[Agent] Urgency verification failed: ${error.message}`
      );
    }
  }

  // ---------------------------------------------------------
  // Popup Dismissal Helper
  // Detects blocking dialogs/overlays and attempts explicit close,
  // falling back to sending an Escape key if needed.
  // ---------------------------------------------------------
  async dismissBlockingPopups() {
    const popupSelectors = [
      ".landing-popup",
      ".modal",
      '[role="dialog"]',
      '[aria-modal="true"]',
      ".popup",
      ".overly-home",
      '[class*="modal"]',
      '[class*="popup"]',
      '[class*="dialog"]'
    ];

    for (const selector of popupSelectors) {
      const popup = this.page.locator(selector).first();

      if (
        (await popup.count()) === 0 ||
        !(await popup.isVisible().catch(() => false))
      ) {
        continue;
      }

      console.log(`[Agent] Blocking popup detected: ${selector}`);

      const closeSelectors = [
        '[aria-label="Close"]',
        '[aria-label="close"]',
        ".popup-close",
        ".modal-close",
        ".close",
        '[data-dismiss="modal"]',
        "button:has-text('Apply Theme')",
        "button:has-text('Apply')",
        "button:has-text('Skip')",
        "button:has-text('Got it')",
        "button:has-text('Dismiss')",
        "button:has-text('Close')",
        "button:has-text('Accept')",
        "button:has-text('Continue')"
      ];

      let closed = false;

      for (const closeSelector of closeSelectors) {
        const closeButton = popup.locator(closeSelector).first();

        if (
          (await closeButton.count()) > 0 &&
          (await closeButton.isVisible().catch(() => false))
        ) {
          await closeButton.click().catch(() => {});
          closed = true;
          break;
        }
      }

      if (!closed) {
        await this.page.keyboard.press("Escape").catch(() => {});
      }

      await this.page.waitForTimeout(500).catch(() => {});
    }
  }

  // ---------------------------------------------------------
  // Multi-signal Page State Snapshot & Detector
  // Detects: URL changes, visible input changes, modal dialogs,
  // interactive element count shifts, and body content changes.
  // ---------------------------------------------------------
  async getPageStateSnapshot() {
    try {
      return await this.page.evaluate(() => {
        const body = document.body;

        if (!body) {
          return {
            url: location.href,
            bodyText: "",
            bodyLength: 0,
            visibleInputs: 0,
            visibleButtons: 0,
            visibleLinks: 0,
            modals: 0,
            headings: [],
            buttons: [],
            forms: []
          };
        }

        const isVisible = (el) => {
          const style = window.getComputedStyle(el);

          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            el.offsetWidth > 0 &&
            el.offsetHeight > 0
          );
        };

        const visibleInputs = Array.from(
          document.querySelectorAll(
            "input, textarea, select"
          )
        ).filter(isVisible);

        const visibleButtons = Array.from(
          document.querySelectorAll(
            "button, [role='button'], input[type='submit'], input[type='button']"
          )
        ).filter(isVisible);

        const visibleLinks = Array.from(
          document.querySelectorAll("a")
        ).filter(isVisible);

        const modals = Array.from(
          document.querySelectorAll(
            ".modal, [role='dialog'], [aria-modal='true'], .popup, .landing-popup"
          )
        ).filter(isVisible);

        const headings = Array.from(
          document.querySelectorAll(
            "h1, h2, h3, h4"
          )
        )
          .filter(isVisible)
          .map(el => el.innerText.trim())
          .filter(Boolean)
          .slice(0, 20);

        const buttons = visibleButtons
          .map(el => (
            el.innerText ||
            el.textContent ||
            el.value ||
            ""
          ).trim())
          .filter(Boolean)
          .slice(0, 50);

        const forms = Array.from(
          document.querySelectorAll("form")
        )
          .filter(isVisible)
          .map(form => form.innerText.trim())
          .filter(Boolean)
          .slice(0, 10);

        const bodyText = body.innerText
          .replace(/\s+/g, " ")
          .trim();

        return {
          url: location.href,
          bodyText: bodyText.slice(0, 10000),
          bodyLength: bodyText.length,
          visibleInputs: visibleInputs.length,
          visibleButtons: visibleButtons.length,
          visibleLinks: visibleLinks.length,
          modals: modals.length,
          headings,
          buttons,
          forms
        };
      });
    } catch {
      return null;
    }
  }

  hasStateChanged(before, after) {
    if (!before || !after) return true;

    if (before.url !== after.url) {
      return true;
    }

    if (
      before.visibleInputs !==
      after.visibleInputs
    ) {
      return true;
    }

    if (
      before.visibleButtons !==
      after.visibleButtons
    ) {
      return true;
    }

    if (
      before.visibleLinks !==
      after.visibleLinks
    ) {
      return true;
    }

    if (
      before.modals !==
      after.modals
    ) {
      return true;
    }

    if (
      JSON.stringify(before.headings) !==
      JSON.stringify(after.headings)
    ) {
      return true;
    }

    if (
      JSON.stringify(before.buttons) !==
      JSON.stringify(after.buttons)
    ) {
      return true;
    }

    if (
      JSON.stringify(before.forms) !==
      JSON.stringify(after.forms)
    ) {
      return true;
    }

    if (
      before.bodyText !==
      after.bodyText
    ) {
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------
  // Score an element for SIGNUP.
  // Higher score = more likely to be useful.
  // ---------------------------------------------------------
  scoreSignupElement(element, isInsideFlow = false) {
    const text = (element.text || "").trim();
    const tag = (element.tag || "").toLowerCase();

    if (/log.?in|sign.?in|login|signin/i.test(text)) {
      return -1000;
    }

    if (/blog|article|review|rating|feedback|comment/i.test(text)) {
      return -1000;
    }

    if (/privacy|terms|cookie|help|contact|about/i.test(text)) {
      return -1000;
    }

    let score = 0;

    if (isInsideFlow) {
      // Inside signup flow/modal: score form submission & progression controls ONLY
      if (/save(\s*and|\s*&)?\s*proceed/i.test(text)) score += 120;
      if (/start\s*registering/i.test(text)) score += 115;
      if (/complete\s*(registration|signup|profile|form)?/i.test(text)) score += 110;
      if (/register(ing)?/i.test(text)) score += 105;
      if (/save/i.test(text)) score += 100;
      if (/submit/i.test(text)) score += 100;
      if (/create\s*(an?\s*)?account/i.test(text)) score += 95;
      if (/sign\s*up/i.test(text)) score += 90;
      if (/get\s*started/i.test(text)) score += 90;
      if (/continue/i.test(text)) score += 90;
      if (/next/i.test(text)) score += 85;
      if (/verify|confirm|finish/i.test(text)) score += 85;
      if (/apply(\s*now)?/i.test(text)) score += 75;
      if (/send\s*(otp|code)?/i.test(text)) score += 70;
      if (/proceed/i.test(text)) score += 65;
      if (/start/i.test(text)) score += 60;

      // Tag fallback: if element is a button or submit input inside flow
      if (score === 0 && (tag === "button" || element.type === "submit" || element.role === "button")) {
        score += 80;
      }
    } else {
      // On homepage: score entry links to enter signup flow
      if (/sign\s*up/i.test(text)) score += 100;
      if (/trial/i.test(text)) score += 95;
      if (/create\s*(an?\s*)?account/i.test(text)) score += 90;
      if (/get\s*started/i.test(text)) score += 85;
      if (/start\s*registering/i.test(text)) score += 85;
      if (/register/i.test(text)) score += 80;
      if (/continue/i.test(text)) score += 70;
      if (/submit/i.test(text)) score += 65;
    }

    return score;
  }

  // ---------------------------------------------------------
  // Score an element for CANCELLATION.
  // ---------------------------------------------------------
  scoreCancelElement(element) {
    const text =
      `${element.text || ""} ${element.href || ""}`
        .toLowerCase();

    let score = 0;

    if (/cancel/.test(text)) score += 150;
    if (/unsubscribe/.test(text)) score += 140;
    if (/delete\s*account/.test(text)) score += 140;
    if (/close\s*account/.test(text)) score += 130;
    if (/manage\s*(plan|subscription)/.test(text)) score += 120;
    if (/subscription/.test(text)) score += 110;
    if (/billing/.test(text)) score += 100;
    if (/membership/.test(text)) score += 95;
    if (/my\s*plan/.test(text)) score += 90;
    if (/account/.test(text)) score += 80;
    if (/settings/.test(text)) score += 75;
    if (/profile/.test(text)) score += 60;
    if (/login|sign\s*in/.test(text)) score += 50;

    // Avoid unrelated links & reviews/ratings.
    if (/privacy|terms|cookie|blog|review|rating|share/.test(text)) {
      score -= 1000;
    }

    return score;
  }

  // ---------------------------------------------------------
  // Deterministic action selection.
  // LLM can override this later.
  // ---------------------------------------------------------
  chooseDeterministicAction(
    flowName,
    elements,
    previousActions
  ) {
    const clicked = new Set(
      previousActions
        .filter((action) => action.action === "click" && action.stateChanged === false)
        .map((action) => {
          if (action.elementKey) return action.elementKey;
          if (action.element && (action.element.text || action.element.href)) {
            return `${(action.element.text || "").toLowerCase()}|${(action.element.href || "").toLowerCase()}`;
          }
          return null;
        })
        .filter(Boolean)
    );

    const hasEnteredSignupFlow = previousActions.some(
      (a) => a.flow === "signup" && a.action === "click"
    );

    const scored = elements
      .map((element) => {
        const score =
          flowName === "signup"
            ? this.scoreSignupElement(element, hasEnteredSignupFlow)
            : this.scoreCancelElement(element);

        return {
          element,
          score
        };
      })
      .filter(({ score }) => score > 0)
      .filter(({ element }) => {
        const key = `${(element.text || "").toLowerCase()}|${(element.href || "").toLowerCase()}`;
        return !clicked.has(key);
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];

    if (!best || best.score <= 0) {
      return {
        action: "finishAudit",
        reason:
          `No more relevant ${flowName} actions were found.`,
        confidence: 0.9
      };
    }

    const element = best.element;

    return {
      action: "click",
      targetId: element.id,
      element: element,
      elementKey:
        `${element.text}|${element.href}|${element.domIndex}`,
      reason:
        `Selected "${element.text}" as the most relevant ${flowName} action.`,
      confidence: Math.min(
        0.95,
        0.5 + best.score / 200
      )
    };
  }

  // ---------------------------------------------------------
  // Execute one action using DOM evaluation.
  // ---------------------------------------------------------
  async executeAction(decision) {
    if (decision.action === "finishAudit") {
      return true;
    }

    if (decision.action === "click") {
      let element = decision.element;

      if (!element && decision.targetId) {
        element = { id: decision.targetId, text: decision.targetId };
      }

      if (!element) {
        console.warn(`[Agent] Missing element for action click on target ${decision.targetId}`);
        return false;
      }

      console.log(
        `[Agent] Resolving element: ${element.text || element.href || decision.targetId}`
      );

      const context = this.page.context ? this.page.context() : null;
      let popupPromise = null;
      if (context) {
        popupPromise = context.waitForEvent("page", { timeout: 3500 }).catch(() => null);
      }

      // ---------------------------------------------------------
      // Tier 0: Real Hardware Mouse Pointer Click (Playwright Mouse API)
      // Produces trusted pointer/mouse events required by SPAs
      // ---------------------------------------------------------
      if (this.page && !this.page.isClosed() && element.text && element.text.trim()) {
        const targetText = element.text.trim();
        try {
          const locator = this.page.getByText(targetText, { exact: false }).first();
          const isVis = await locator.isVisible({ timeout: 1500 }).catch(() => false);

          if (isVis && !this.page.isClosed()) {
            await locator.scrollIntoViewIfNeeded().catch(() => {});
            const box = await locator.boundingBox().catch(() => null);

            if (box && box.width > 0 && box.height > 0) {
              const cx = box.x + box.width / 2;
              const cy = box.y + box.height / 2;

              console.log(
                `[Agent] Real browser mouse click on "${targetText}" at (${Math.round(cx)}, ${Math.round(cy)})`
              );

              await this.page.mouse.click(cx, cy).catch(() => {});

              if (popupPromise) {
                const newTab = await popupPromise;
                if (newTab && !newTab.isClosed()) {
                  console.log(`[Agent] New tab/popup detected: ${newTab.url()}`);
                  await newTab.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
                  await newTab.waitForTimeout(1000).catch(() => {});
                  this.page = newTab;
                }
              }

              return true;
            } else {
              console.log(
                `[Agent] Playwright locator.click({ force: true }) on "${targetText}"`
              );

              await locator.click({ force: true, timeout: 3000 }).catch(() => {});

              if (popupPromise) {
                const newTab = await popupPromise;
                if (newTab && !newTab.isClosed()) {
                  console.log(`[Agent] New tab/popup detected: ${newTab.url()}`);
                  await newTab.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
                  await newTab.waitForTimeout(1000).catch(() => {});
                  this.page = newTab;
                }
              }

              return true;
            }
          }
        } catch (err) {
          console.log(`[Agent] Real pointer click attempt failed, using fallback: ${err.message}`);
        }
      }

      // Try using the element's HTML id
      const htmlId = element.htmlId || element.idAttr;
      if (htmlId) {
        const selector = `#${htmlId}`;

        try {
          const exists = await this.page.evaluate((selector) => {
            const el = document.querySelector(selector);

            if (!el) {
              return false;
            }

            el.scrollIntoView({
              behavior: "instant",
              block: "center"
            });

            return true;
          }, selector);

          if (exists) {
            console.log(
              `[Agent] Clicking #${htmlId}`
            );

            await this.page.evaluate((selector) => {
              const el = document.querySelector(selector);

              if (!el) {
                throw new Error(
                  `Element not found: ${selector}`
                );
              }

              el.click();
            }, selector);

            if (popupPromise) {
              const newTab = await popupPromise;
              if (newTab) {
                console.log(`[Agent] New tab/popup detected: ${newTab.url()}`);
                await newTab.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
                await newTab.waitForTimeout(1000);
                this.page = newTab;
              }
            }

            return true;
          }
        } catch (error) {
          console.log(
            `[Agent] ID click failed: ${error.message}`
          );
        }
      }

      // 2. Try matching by href attribute
      if (element.href) {
        try {
          const clicked = await this.page.evaluate((href) => {
            const links = Array.from(
              document.querySelectorAll("a[href], [href]")
            );

            const targetHref = href.trim().toLowerCase();

            const match = links.find((el) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);

              const visible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0;

              const h = (el.getAttribute("href") || el.href || "")
                .trim()
                .toLowerCase();

              return (
                visible &&
                (h === targetHref || h.includes(targetHref))
              );
            });

            if (!match) {
              return false;
            }

            match.scrollIntoView({
              behavior: "instant",
              block: "center"
            });

            match.click();

            return true;

          }, element.href);

          if (clicked) {
            console.log(
              `[Agent] Clicked link with href "${element.href}"`
            );

            if (popupPromise) {
              const newTab = await popupPromise;
              if (newTab) {
                console.log(`[Agent] New tab/popup detected: ${newTab.url()}`);
                await newTab.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
                await newTab.waitForTimeout(1000);
                this.page = newTab;
              }
            }

            return true;
          }
        } catch (error) {
          console.log(
            `[Agent] Href click failed: ${error.message}`
          );
        }
      }

      // 3. Try matching visible text
      if (element.text && element.text.trim()) {
        try {
          const clicked = await this.page.evaluate((text) => {
            const elements = Array.from(
              document.querySelectorAll(
                "button, a, input[type='button'], input[type='submit'], [role='button'], .btn, [class*='btn'], [class*='button'], [onclick], div, span, h1, h2, h3, h4, p"
              )
            );

            const normalizedTarget = text
              .trim()
              .toLowerCase();

            const match = elements.find((el) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);

              const visible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0;

              const elementText =
                (
                  el.innerText ||
                  el.textContent ||
                  el.value ||
                  ""
                )
                  .trim()
                  .toLowerCase();

              return (
                visible &&
                (elementText === normalizedTarget ||
                  elementText.includes(normalizedTarget))
              );
            });

            if (!match) {
              return false;
            }

            const clickableParent = match.closest(
              "button, a, [role='button'], input[type='submit'], input[type='button'], .btn, [class*='btn'], [class*='button'], [onclick]"
            );

            const target = clickableParent || match;

            target.scrollIntoView({
              behavior: "instant",
              block: "center"
            });

            target.click();

            try {
              target.dispatchEvent(
                new MouseEvent("click", {
                  bubbles: true,
                  cancelable: true,
                  view: window
                })
              );
            } catch {}

            return true;

          }, element.text);

          if (clicked) {
            console.log(
              `[Agent] Clicked "${element.text}"`
            );

            if (popupPromise) {
              const newTab = await popupPromise;
              if (newTab) {
                console.log(`[Agent] New tab/popup detected: ${newTab.url()}`);
                await newTab.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
                await newTab.waitForTimeout(1000);
                this.page = newTab;
              }
            }

            return true;
          }

        } catch (error) {
          console.log(
            `[Agent] Text click failed: ${error.message}`
          );
        }
      }

      // 4. Try matching by DOM index fallback
      if (typeof element.domIndex === "number") {
        try {
          const clicked = await this.page.evaluate((index) => {
            const elements = Array.from(
              document.querySelectorAll(
                "button, a, input[type='button'], input[type='submit'], [role='button'], .btn, [class*='btn'], [class*='button'], [onclick]"
              )
            ).filter((el) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0
              );
            });

            const target = elements[index];
            if (!target) return false;

            target.scrollIntoView({
              behavior: "instant",
              block: "center"
            });

            target.click();

            return true;
          }, element.domIndex);

          if (clicked) {
            console.log(
              `[Agent] Clicked element at index ${element.domIndex}`
            );

            if (popupPromise) {
              const newTab = await popupPromise;
              if (newTab) {
                console.log(`[Agent] New tab/popup detected: ${newTab.url()}`);
                await newTab.waitForLoadState("domcontentloaded", { timeout: 6000 }).catch(() => {});
                await newTab.waitForTimeout(1000);
                this.page = newTab;
              }
            }

            return true;
          }
        } catch (error) {
          console.log(
            `[Agent] Index click failed: ${error.message}`
          );
        }
      }

      const label = element.text || element.href || element.htmlId || decision.targetId || "unnamed element";

      // 5. Ultimate fallback: Playwright getByRole / text locator click
      if (element.text) {
        try {
          const textLocator = this.page.getByText(element.text.trim(), { exact: false }).first();
          if (await textLocator.isVisible().catch(() => false)) {
            console.log(`[Agent] Ultimate locator click fallback on text: "${element.text}"`);
            await textLocator.click({ force: true, timeout: 3000 }).catch(() => {});
            return true;
          }
        } catch {}
      }

      console.warn(`[Agent] Could not click element: "${label}"`);
      return false;
    }

    if (decision.action === "goBack") {
      try {
        await this.page.goBack({
          waitUntil: "domcontentloaded",
          timeout: 3000
        }).catch(() => {});

        await this.page.waitForTimeout(500).catch(() => {});

      } catch (error) {
        console.warn(
          `[Agent] goBack failed: ${error.message}`
        );
      }

      return true;
    }

    if (
      decision.action === "navigate" &&
      decision.url
    ) {
      try {
        await this.page.goto(
          decision.url,
          {
            waitUntil: "domcontentloaded",
            timeout: 5000
          }
        ).catch(() => {});

        await this.page.waitForTimeout(500).catch(() => {});

      } catch (error) {
        console.warn(
          `[Agent] Navigation failed: ${error.message}`
        );
      }

      return true;
    }

    return false;
  }

  // ---------------------------------------------------------
  // Record one actual flow state.
  // ---------------------------------------------------------
  async recordStep(
    flowName,
    findings,
    steps,
    options = {}
  ) {
    const stepIndex = steps.length;

    if (options.fillForm) {
      const hasForm = await this.hasVisibleEditableForm();
      if (hasForm) {
        console.log(
          `[Agent] Visible form detected. Filling synthetic test data...`
        );
        await autofillForm(this.page).catch(() => {});
      }
    }

    await this.page.waitForTimeout(200).catch(() => {});

    // 3. Take Screenshot of the current state
    const screenshotPath =
      await this.takeScreenshot(
        flowName,
        stepIndex
      );

    let currentUrl = this.auditState.targetUrl;

    try {
      currentUrl = this.page.url();
    } catch {}

    if (screenshotPath) {
      this.auditState.screenshots.push({
        flow: flowName,
        step: stepIndex,
        url: currentUrl,
        path: screenshotPath
      });
    }

    steps.push({
      index: stepIndex,
      label:
        `${flowName} step ${stepIndex + 1}`,
      url: currentUrl,
      screenshotPath,
      clickCount:
        this.auditState.actions.filter(
          (a) => a.action === "click"
        ).length
    });

    return screenshotPath;
  }

  // ---------------------------------------------------------
  // Main flow explorer.
  //
  // maxIterations is a SAFETY LIMIT.
  // Actual number of steps depends on the website.
  // ---------------------------------------------------------
  async runFlow(
    flowName,
    maxIterations = 4
  ) {
    this.auditState.flow = flowName;

    const steps = [];
    const findings = [];

    console.log(
      `[Autonomous Agent] Starting ${flowName} audit flow...`
    );

    let previousFingerprint =
      await this.getPageFingerprint();

    // -------------------------------------------------------
    // Capture initial state.
    // This is a real flow state, so it counts as Step 1.
    // -------------------------------------------------------
    await this.recordStep(
      flowName,
      findings,
      steps
    );

    for (
      let iteration = 0;
      iteration < maxIterations;
      iteration++
    ) {
      let currentUrl;

      try {
        currentUrl = this.page.url();
      } catch (error) {
        console.warn(
          `[Agent] Browser unavailable. Ending ${flowName} flow.`
        );
        break;
      }

      this.auditState.visitedUrls.push(
        currentUrl
      );

      // -----------------------------------------------------
      // Read current page
      // -----------------------------------------------------
      const {
        elements,
        elementMap
      } = await this.readPage();

      console.log(
        `[Agent Debug] Found ${elements.length} interactive elements:`,
        elements.map((e) => ({
          id: e.id,
          text: e.text,
          href: e.href,
          tag: e.tag
        }))
      );

      if (elements.length === 0) {
        console.log(
          `[Agent] No interactive elements. ${flowName} complete.`
        );
        break;
      }

      // -----------------------------------------------------
      // Ask LLM module.
      //
      // ENABLE_LLM=false means this immediately uses
      // deterministicFallback().
      // -----------------------------------------------------
      let decision;

      try {
        decision = await decideNextAction({
          goal: this.auditState.goal,
          flow: flowName,
          step: steps.length,
          targetUrl: this.auditState.targetUrl,
          currentUrl,
          visitedUrls: this.auditState.visitedUrls,
          elements,
          previousActions: this.auditState.actions,
          findings: this.auditState.findings
        });

      } catch (error) {
        console.warn(
          `[Agent] Decision failed: ${error.message}`
        );

        decision =
          this.chooseDeterministicAction(
            flowName,
            elements,
            this.auditState.actions
          );
      }

      // -----------------------------------------------------
      // If LLM/fallback gave a bad generic action, invalid targetId,
      // or finishAudit when scored deterministic candidate elements exist,
      // fall back to chooseDeterministicAction.
      // -----------------------------------------------------
      if (
        !decision ||
        decision.action === "finishAudit" ||
        (
          decision.action === "click" &&
          !elementMap.has(decision.targetId)
        )
      ) {
        const fallbackDecision = this.chooseDeterministicAction(
          flowName,
          elements,
          this.auditState.actions
        );

        if (fallbackDecision && fallbackDecision.action !== "finishAudit") {
          decision = fallbackDecision;
        }
      }

      if (decision && decision.action === "click" && !decision.element && elementMap.has(decision.targetId)) {
        decision.element = elementMap.get(decision.targetId);
      }

      console.log(
        `[Agent Step ${steps.length}] ` +
        `Action: ${decision.action} | ` +
        `Target: ${decision.targetId || "N/A"} | ` +
        `Reason: ${decision.reason}`
      );

      const elementKey = decision.element
        ? `${(decision.element.text || "").toLowerCase()}|${(decision.element.href || "").toLowerCase()}`
        : (decision.targetId || "").toLowerCase();

      const actionRecord = {
        step: steps.length,
        flow: flowName,
        url: currentUrl,
        elementKey,
        stateChanged: false,
        ...decision
      };

      this.auditState.actions.push(actionRecord);

      // -----------------------------------------------------
      // Stop if the agent thinks the flow is finished.
      // -----------------------------------------------------
      if (
        decision.action === "finishAudit"
      ) {
        const finishMessage =
          flowName === "cancel" && steps.length === 1
            ? "Cancellation flow unavailable from logged-out starting state."
            : decision.reason || "Completed exploration.";

        console.log(
          `[Agent] ${flowName} flow finished: ${finishMessage}`
        );
        break;
      }

      // -----------------------------------------------------
      // Dismiss popups BEFORE taking beforeSnapshot so popup
      // dismissal doesn't skew state change comparison.
      // -----------------------------------------------------
      await this.dismissBlockingPopups();

      // -----------------------------------------------------
      // Capture pre-action page state snapshot
      // -----------------------------------------------------
      const beforeSnapshot = await this.getPageStateSnapshot();

      // -----------------------------------------------------
      // Execute action
      // -----------------------------------------------------
      const executed = await this.executeAction(
        decision
      );

      if (!executed) {
        continue;
      }

      await this.page.waitForTimeout(1000).catch(() => {});
      await this.page
        .waitForLoadState("networkidle")
        .catch(() => {});
      await this.page.waitForTimeout(1000).catch(() => {});

      const afterSnapshot = await this.getPageStateSnapshot();
      const changed = this.hasStateChanged(
        beforeSnapshot,
        afterSnapshot
      );

      console.log("[Agent] ===== AFTER CLICK =====");
      console.log(
        "[Agent] URL:",
        afterSnapshot ? afterSnapshot.url : this.page.url()
      );
      console.log(
        "[Agent] Headings:",
        afterSnapshot ? afterSnapshot.headings : []
      );
      console.log(
        "[Agent] Buttons:",
        afterSnapshot ? afterSnapshot.buttons : []
      );
      console.log(
        "[Agent] Inputs:",
        afterSnapshot ? afterSnapshot.visibleInputs : 0
      );
      console.log(
        "[Agent] Body:",
        afterSnapshot && afterSnapshot.bodyText
          ? afterSnapshot.bodyText.slice(0, 1500)
          : ""
      );
      console.log("[Agent] =======================");

      // -----------------------------------------------------
      // Capture post-action page state snapshot & evaluate
      // -----------------------------------------------------
      console.log(`[Agent] State changed: ${changed}`);
      console.log(
        `[Agent] Current URL: ${
          afterSnapshot ? afterSnapshot.url : this.page.url()
        }`
      );
      console.log(
        `[Agent] Visible inputs: ${
          afterSnapshot ? afterSnapshot.visibleInputs : "N/A"
        }`
      );
      console.log(
        `[Agent] Visible modals: ${
          afterSnapshot ? afterSnapshot.modals : "N/A"
        }`
      );

      actionRecord.stateChanged = changed;

      if (!changed) {
        console.log(
          `[Agent] Page state did not change after clicking ${decision.targetId || "action"}. ` +
          `Trying another action instead of counting a new step.`
        );

        continue;
      }

      console.log("[Agent] New page/state detected.");

      // -----------------------------------------------------
      // The page actually changed.
      // NOW this is a genuine new flow step.
      // -----------------------------------------------------
      let stepFindings = [];

      try {
        stepFindings =
          await runAllChecks(
            this.page,
            steps.length
          );

      } catch (error) {
        console.warn(
          `[Agent] Pattern checks failed: ${error.message}`
        );
      }

      for (
        const finding of stepFindings
      ) {
        if (
          finding.kind === "false_urgency"
        ) {
          await this.reloadAndVerifyUrgency(
            finding,
            steps.length
          );
        }
      }

      findings.push(...stepFindings);

      this.auditState.findings.push(
        ...stepFindings
      );

      // -----------------------------------------------------
      // Record the actual new state with form check option.
      // -----------------------------------------------------
      const hasForm = await this.hasVisibleEditableForm();

      const screenshot = await this.recordStep(
        flowName,
        findings,
        steps,
        { fillForm: hasForm }
      );

      if (screenshot) {
        for (const finding of stepFindings) {
          finding.screenshot = screenshot;
          finding.url = this.page.url();
          finding.step = steps.length;
        }
      }
    }

    console.log(
      `[Agent] ${flowName}: ` +
      `${steps.length} actual flow step(s) discovered.`
    );

    return {
      steps,
      findings
    };
  }

  // ---------------------------------------------------------
  // Full audit
  // ---------------------------------------------------------
  async runFullAudit() {

    // Save original URL.
    const originalUrl =
      this.auditState.targetUrl;

    // -------------------------------------------------------
    // SIGNUP
    // -------------------------------------------------------
    const signup =
      await this.runFlow(
        "signup",
        4
      );

    // -------------------------------------------------------
    // RESET TO ORIGINAL WEBSITE
    // before cancellation exploration.
    // -------------------------------------------------------
    try {
      console.log(
        `[Agent] Resetting to original URL for cancellation flow...`
      );

      await this.page.goto(
        originalUrl,
        {
          waitUntil: "domcontentloaded",
          timeout: 8000
        }
      );

      await this.page.waitForTimeout(600).catch(() => {});

    } catch (error) {
      console.warn(
        `[Agent] Could not reset page: ${error.message}`
      );
    }

    // -------------------------------------------------------
    // CANCELLATION
    // -------------------------------------------------------
    const cancel =
      await this.runFlow(
        "cancel",
        4
      );

    const signupSteps =
      signup.steps;

    const cancelSteps =
      cancel.steps;

    const asymmetryFindings =
      checkFlowAsymmetry(
        signupSteps.length,
        cancelSteps.length
      );

    const allFindings = [
      ...signup.findings,
      ...cancel.findings,
      ...asymmetryFindings
    ];

    const score = scoreFindings(allFindings);

    const report = buildAuditReport({
      targetUrl: originalUrl,
      signupSteps,
      cancelSteps,
      findings: allFindings,
      score,
      screenshots: this.auditState.screenshots
    });

    return report;
  }
}