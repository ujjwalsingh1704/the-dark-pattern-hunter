"use client";

import { useState } from "react";

const QUIZ_QUESTIONS = [
  {
    id: 1,
    title: "Scenario 1: Subscription Cancellation",
    description: "You click 'Cancel Membership' and are presented with two options. Which phrase is an example of Confirm-Shaming?",
    options: [
      { id: "a", text: "Confirm cancellation of your standard membership", isCorrect: false },
      { id: "b", text: "No thanks, I'd rather pay full price and miss out on exclusive savings", isCorrect: true, explanation: "Confirm-shaming phrases opt-out choices with guilt or embarrassment to steer user behavior." },
      { id: "c", text: "Pause subscription for 30 days instead", isCorrect: false },
      { id: "d", text: "Contact customer support via email", isCorrect: false }
    ]
  },
  {
    id: 2,
    title: "Scenario 2: Free Trial Registration",
    description: "A streaming service offers a '7-Day Free Trial'. What detail flags a Forced Continuity dark pattern?",
    options: [
      { id: "a", text: "Requiring an email address to create an account", isCorrect: false },
      { id: "b", text: "Sending a confirmation email after signup", isCorrect: false },
      { id: "c", text: "Requiring credit card entry with automatic $14.99/mo renewal after 7 days without explicit opt-out notice", isCorrect: true, explanation: "Forced continuity relies on automatic billing roll-over when trial periods expire." },
      { id: "d", text: "Offering an optional HD video upgrade package", isCorrect: false }
    ]
  },
  {
    id: 3,
    title: "Scenario 3: Event Ticket Checkout",
    description: "During checkout, you notice a $12.50 charge added right before the final pay button. What is this dark pattern called?",
    options: [
      { id: "a", text: "Pre-checked Add-on", isCorrect: false },
      { id: "b", text: "Hidden / Drip Fee", isCorrect: true, explanation: "Hidden or drip fees reveal mandatory extra costs at the final step of checkout when users have already invested effort." },
      { id: "c", text: "Visual Imbalance", isCorrect: false },
      { id: "d", text: "Forced Registration", isCorrect: false }
    ]
  }
];

export default function DarkPatternQuiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const question = QUIZ_QUESTIONS[currentIdx];

  function handleSelect(option) {
    if (selectedOpt !== null) return;
    setSelectedOpt(option);
    if (option.isCorrect) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (currentIdx + 1 < QUIZ_QUESTIONS.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOpt(null);
    } else {
      setCompleted(true);
    }
  }

  function handleReset() {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setCompleted(false);
  }

  return (
    <div className="rounded-2xl border border-rule/80 bg-gradient-to-br from-panel via-paper to-panel p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-rule/60 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flag text-xs font-bold text-paper">
            🧠
          </span>
          <h3 className="font-serif text-lg font-bold text-ink">
            Interactive UX Spotter Challenge
          </h3>
        </div>
        <span className="text-xs font-mono font-semibold text-inkfaint bg-paper px-2.5 py-1 border border-rule rounded-full">
          {!completed ? `Question ${currentIdx + 1} of ${QUIZ_QUESTIONS.length}` : "Completed"}
        </span>
      </div>

      {!completed ? (
        <div>
          <h4 className="text-sm font-semibold text-ink mb-1">{question.title}</h4>
          <p className="text-xs text-inkfaint leading-relaxed mb-4">{question.description}</p>

          <div className="space-y-2.5 mb-5">
            {question.options.map((opt) => {
              const isSelected = selectedOpt?.id === opt.id;
              let btnStyle = "border-rule bg-paper text-ink hover:border-ink/60 hover:bg-panel";

              if (selectedOpt) {
                if (opt.isCorrect) {
                  btnStyle = "border-clear text-clear bg-clearfaint font-semibold";
                } else if (isSelected) {
                  btnStyle = "border-flag text-flag bg-flagfaint font-semibold";
                } else {
                  btnStyle = "border-rule/40 text-inkfaint opacity-50 bg-paper";
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  disabled={selectedOpt !== null}
                  className={`w-full text-left p-3 text-xs rounded-lg border transition-all flex items-start gap-3 ${btnStyle}`}
                >
                  <span className="font-mono text-xs font-bold uppercase shrink-0 mt-0.5">{opt.id}.</span>
                  <span className="flex-1">{opt.text}</span>
                  {selectedOpt && opt.isCorrect && <span>✅</span>}
                  {selectedOpt && isSelected && !opt.isCorrect && <span>❌</span>}
                </button>
              );
            })}
          </div>

          {selectedOpt && (
            <div className="mb-5 p-3 rounded-lg border border-rule bg-paper/80 text-xs">
              <p className="font-semibold text-ink mb-1">
                {selectedOpt.isCorrect ? "🎯 Spot On!" : "💡 Explanation:"}
              </p>
              <p className="text-inkfaint leading-relaxed">{selectedOpt.explanation || question.options.find(o => o.isCorrect).explanation}</p>
            </div>
          )}

          {selectedOpt && (
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="border border-ink bg-ink text-paper text-xs px-5 py-2 rounded-lg font-medium hover:bg-transparent hover:text-ink transition-colors"
              >
                {currentIdx + 1 < QUIZ_QUESTIONS.length ? "Next Challenge →" : "View Final Score"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <span className="text-4xl mb-2 block">🏆</span>
          <h4 className="font-serif text-xl font-bold text-ink mb-1">
            Challenge Score: {score} / {QUIZ_QUESTIONS.length}
          </h4>
          <p className="text-xs text-inkfaint max-w-md mx-auto mb-5 leading-relaxed">
            {score === 3
              ? "Master Hunter Status! You have an expert eye for manipulative user interfaces."
              : "Good effort! Dark patterns can be subtle. Run audits with our autonomous agent to detect hidden tricks effortlessly."}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="border border-rule bg-paper text-xs text-ink px-4 py-2 rounded-lg font-medium hover:border-ink"
            >
              Try Challenge Again 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
