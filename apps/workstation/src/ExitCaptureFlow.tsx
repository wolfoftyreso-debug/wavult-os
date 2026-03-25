// ExitCaptureFlow.tsx — Context-Aware Exit Capture Engine
// "We don't ask what happened. We know what happened. We ask how it felt."
//
// The system already knows: actual vs planned time, delays, additions, wait time, deviations.
// We NEVER ask the customer about facts the system already has.
// Hard PIX = system facts (already known). Soft PIX = customer experience (captured here).
// Together: full operational truth.

import { useState, useEffect } from 'react';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#F2F2F7', surface: '#FFFFFF', border: '#D1D1D6',
  text: '#000000', secondary: '#8E8E93', tertiary: '#C7C7CC',
  blue: '#007AFF', green: '#34C759', orange: '#FF9500',
  red: '#FF3B30', fill: '#F2F2F7', separator: 'rgba(60,60,67,0.29)',
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface WorkOrderContext {
  delay_minutes: number;         // actual − planned (system-known)
  had_additional_work: boolean;  // tilläggsjobb utfördes
  customer_waited: boolean;      // kund väntade på plats
  had_parts_issue: boolean;      // del saknades
  all_nominal: boolean;          // inga avvikelser alls
}

type QuestionType = 'CONFIRM' | 'EXPERIENCE' | 'CLARITY' | 'FOLLOWUP';

interface Question {
  id: string;
  type: QuestionType;
  statement?: string;       // what the system knows — shown above the question
  question: string;
  yesLabel?: string;
  noLabel?: string;
}

interface Answer {
  questionId: string;
  value: boolean;
}

export interface CaptureResult {
  // Soft PIX (customer experience)
  answers: Answer[];
  wants_followup: boolean;
  // Derived
  pix_type: 'deviation_pix' | 'improvement_pix' | 'quality_signal';
  soft_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  requires_followup: boolean;
  // Hard PIX (system facts — passed through for the record)
  context: WorkOrderContext;
}

export interface ExitCaptureProps {
  workOrderId: string;
  vehicleReg: string;
  vehicleMake?: string;
  customerName?: string;
  context: WorkOrderContext;
  onComplete: (captureId: string, result: CaptureResult) => void;
  // No onCancel — this is mandatory
}

// ─── Question builder ─────────────────────────────────────────────────────────
// Max 3 questions, min 1. Never ask what the system already knows.
function buildQuestions(ctx: WorkOrderContext): Question[] {
  // No-question mode: everything nominal → single confirm, one tap, done
  if (ctx.all_nominal) {
    return [
      {
        id: 'confirm_nominal',
        type: 'CONFIRM',
        statement: 'Allt gick enligt plan.',
        question: 'Var allt som förväntat?',
        yesLabel: 'Ja, perfekt ✓',
        noLabel: 'Nej, något var fel',
      },
    ];
  }

  const questions: Question[] = [];

  // 1. Delay signal — we state the fact, ask for the experience
  if (ctx.delay_minutes >= 20) {
    questions.push({
      id: 'delay_experience',
      type: 'EXPERIENCE',
      statement: `Vi blev ${ctx.delay_minutes} min försenade.`,
      question: 'Var det ett problem för dig?',
      yesLabel: 'Ja',
      noLabel: 'Nej',
    });
  } else if (ctx.delay_minutes >= 5) {
    questions.push({
      id: 'delay_experience',
      type: 'EXPERIENCE',
      statement: 'Vi blev något försenade.',
      question: 'Märkte du av det?',
      yesLabel: 'Ja',
      noLabel: 'Nej',
    });
  }

  // 2. Additional work — we know it happened, ask about clarity of communication
  if (ctx.had_additional_work) {
    questions.push({
      id: 'additional_work_clarity',
      type: 'CLARITY',
      statement: 'Vi utförde extra arbete.',
      question: 'Var detta tydligt kommunicerat?',
      yesLabel: 'Ja, tydligt',
      noLabel: 'Kunde varit tydligare',
    });
  }

  // 3. Parts issue — if it caused customer impact
  if (ctx.had_parts_issue && questions.length < 2) {
    questions.push({
      id: 'parts_issue_impact',
      type: 'EXPERIENCE',
      statement: 'Det uppstod ett delproblem under jobbet.',
      question: 'Informerades du om det?',
      yesLabel: 'Ja',
      noLabel: 'Nej',
    });
  }

  // Cap at 2 content questions — then followup is 3rd if any negative
  const capped = questions.slice(0, 2);

  // Followup always added at the end (will render conditionally after negatives)
  capped.push({
    id: 'wants_followup',
    type: 'FOLLOWUP',
    question: 'Vill du bli kontaktad?',
    yesLabel: 'Ja — ring mig',
    noLabel: 'Nej, klart',
  });

  return capped;
}

// ─── PIX derivation (soft PIX from answers + hard PIX from context) ───────────
function deriveSoftPix(
  answers: Answer[],
  ctx: WorkOrderContext
): Pick<CaptureResult, 'pix_type' | 'soft_severity' | 'requires_followup'> {
  const negatives = answers.filter(a => a.value === false && a.questionId !== 'wants_followup');
  const wantsFollowup = answers.find(a => a.questionId === 'wants_followup')?.value ?? false;

  // Customer confirmed problem with a significant delay
  const delayWasProblem = answers.find(a => a.questionId === 'delay_experience')?.value === true;
  // Customer said communication was unclear about additional work
  const clarityFailed = answers.find(a => a.questionId === 'additional_work_clarity')?.value === false;
  // Customer wasn't informed about parts issue
  const partsNotCommunicated = answers.find(a => a.questionId === 'parts_issue_impact')?.value === false;
  // Nominal confirm but customer said something was wrong
  const nominalFailed = answers.find(a => a.questionId === 'confirm_nominal')?.value === false;

  if (nominalFailed) {
    return { pix_type: 'deviation_pix', soft_severity: 'HIGH', requires_followup: true };
  }

  if (delayWasProblem && ctx.delay_minutes >= 20) {
    return { pix_type: 'deviation_pix', soft_severity: ctx.had_parts_issue ? 'CRITICAL' : 'HIGH', requires_followup: true };
  }

  if (delayWasProblem || clarityFailed || partsNotCommunicated) {
    return { pix_type: 'improvement_pix', soft_severity: 'MEDIUM', requires_followup: wantsFollowup };
  }

  if (negatives.length === 0) {
    return { pix_type: 'quality_signal', soft_severity: null, requires_followup: wantsFollowup };
  }

  return { pix_type: 'improvement_pix', soft_severity: 'LOW', requires_followup: wantsFollowup };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExitCaptureFlow({
  workOrderId,
  vehicleReg,
  vehicleMake,
  customerName,
  context,
  onComplete,
}: ExitCaptureProps) {
  const questions = buildQuestions(context);
  const [phase, setPhase] = useState<'INTRO' | 'QUESTIONS' | 'DONE'>('INTRO');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('pixdrift_token') || '';
  const API = 'https://api.bc.pixdrift.com';
  const currentQ = questions[qIndex];
  const isLastQ = qIndex === questions.length - 1;

  // Auto-advance intro after 1.2s
  useEffect(() => {
    if (phase === 'INTRO') {
      const t = setTimeout(() => setPhase('QUESTIONS'), 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Save and close after DONE screen
  useEffect(() => {
    if (phase === 'DONE') {
      const t = setTimeout(() => finalize(), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function handleAnswer(value: boolean) {
    const newAnswers = [...answers, { questionId: currentQ.id, value }];
    setAnswers(newAnswers);

    // Skip FOLLOWUP if all previous answers were positive (no friction on a good job)
    const nextQ = questions[qIndex + 1];
    const anyNegative = newAnswers.some(
      a => a.value === false && a.questionId !== 'wants_followup'
    );
    if (nextQ?.type === 'FOLLOWUP' && !anyNegative && value !== false) {
      // Inject implicit "no followup" and finish
      setAnswers([...newAnswers, { questionId: 'wants_followup', value: false }]);
      setPhase('DONE');
      return;
    }

    if (isLastQ) {
      setPhase('DONE');
    } else {
      setQIndex(i => i + 1);
    }
  }

  async function finalize() {
    setSaving(true);
    const allAnswers = answers;
    const derived = deriveSoftPix(allAnswers, context);
    const wantsFollowup = allAnswers.find(a => a.questionId === 'wants_followup')?.value ?? false;

    const result: CaptureResult = {
      answers: allAnswers,
      wants_followup: wantsFollowup,
      context,
      ...derived,
    };

    try {
      // 1. Start capture
      const startRes = await fetch(`${API}/api/exit-capture/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: workOrderId,
          trigger_type: 'DIGITAL_HANDOVER',
          vehicle_reg: vehicleReg,
          // Pass hard PIX context alongside soft answers
          context_delay_minutes: context.delay_minutes,
          context_had_additional_work: context.had_additional_work,
          context_customer_waited: context.customer_waited,
          context_had_parts_issue: context.had_parts_issue,
          context_all_nominal: context.all_nominal,
        }),
      });
      const startData = startRes.ok ? await startRes.json() : { capture_id: `demo-${Date.now()}` };
      const captureId = startData.capture_id;

      // 2. Submit responses
      await fetch(`${API}/api/exit-capture/${captureId}/respond`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_resolved: !allAnswers.some(
            a => (a.questionId === 'confirm_nominal' || a.questionId === 'delay_experience') && a.value === false
          ),
          took_longer: context.delay_minutes >= 5,
          something_unclear: allAnswers.find(a => a.questionId === 'additional_work_clarity')?.value === false,
          wants_followup: wantsFollowup,
          soft_answers: allAnswers,
          pix_type: derived.pix_type,
          deviation_severity: derived.soft_severity,
          requires_followup: derived.requires_followup,
        }),
      });

      onComplete(captureId, result);
    } catch {
      onComplete(`demo-${Date.now()}`, result);
    }
  }

  const positiveOutcome =
    phase === 'DONE' &&
    !answers.some(
      a => a.value === false && a.questionId !== 'wants_followup'
    );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      padding: 24,
    }}>

      {/* ── INTRO ─────────────────────────────────────────────────────────── */}
      {phase === 'INTRO' && (
        <div style={{ textAlign: 'center', animation: 'ecFadeIn 0.3s ease' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✔</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Jobbet är klart
          </div>
          <div style={{ fontSize: 17, color: C.secondary }}>
            {vehicleMake || vehicleReg}
            {customerName && ` · ${customerName}`}
          </div>
          {!context.all_nominal && (
            <div style={{ marginTop: 12, fontSize: 13, color: C.tertiary }}>
              {context.delay_minutes >= 5 && `+${context.delay_minutes} min`}
              {context.had_additional_work && ' · extra arbete'}
              {context.had_parts_issue && ' · delproblem'}
            </div>
          )}
          <div style={{ marginTop: 20, fontSize: 13, color: C.tertiary }}>
            {context.all_nominal ? 'Snabb bekräftelse...' : 'Snabb koll...'}
          </div>
        </div>
      )}

      {/* ── QUESTIONS ─────────────────────────────────────────────────────── */}
      {phase === 'QUESTIONS' && currentQ && (
        <div
          key={currentQ.id}
          style={{ width: '100%', maxWidth: 380, animation: 'ecFadeIn 0.2s ease' }}
        >
          {/* Progress dots */}
          {questions.length > 1 && (
            <div style={{
              display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32,
            }}>
              {questions.map((_, i) => (
                <div key={i} style={{
                  width: i === qIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i <= qIndex ? C.blue : C.tertiary,
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          )}

          {/* System-known fact — shown as context, not as a question */}
          {currentQ.statement && (
            <div style={{
              background: currentQ.type === 'EXPERIENCE' ? '#FFF3E0' : '#F0F9FF',
              border: `0.5px solid ${currentQ.type === 'EXPERIENCE' ? C.orange + '40' : C.blue + '40'}`,
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>
                {currentQ.type === 'EXPERIENCE' ? '⏱' : currentQ.type === 'CLARITY' ? '📋' : '✔'}
              </span>
              <span style={{
                fontSize: 15,
                color: currentQ.type === 'EXPERIENCE' ? '#4A3000' : '#003366',
                fontWeight: 500,
              }}>
                {currentQ.statement}
              </span>
            </div>
          )}

          {/* The question */}
          <div style={{
            fontSize: currentQ.type === 'FOLLOWUP' ? 20 : 22,
            fontWeight: 700,
            color: C.text,
            marginBottom: 28,
            textAlign: 'center',
            lineHeight: 1.3,
          }}>
            {currentQ.question}
          </div>

          {/* Yes / No buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <button
              onClick={() => handleAnswer(true)}
              style={{
                height: 64, borderRadius: 16, border: 'none',
                background: currentQ.type === 'FOLLOWUP' ? C.blue : C.green,
                color: '#fff', fontSize: 17, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {currentQ.yesLabel || 'Ja'}
            </button>
            <button
              onClick={() => handleAnswer(false)}
              style={{
                height: 64, borderRadius: 16,
                border: currentQ.type === 'FOLLOWUP' ? `0.5px solid ${C.border}` : 'none',
                background: currentQ.type === 'FOLLOWUP' ? C.fill : C.red,
                color: currentQ.type === 'FOLLOWUP' ? C.text : '#fff',
                fontSize: 17, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              } as React.CSSProperties}
            >
              {currentQ.noLabel || 'Nej'}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ──────────────────────────────────────────────────────────── */}
      {phase === 'DONE' && (
        <div style={{ textAlign: 'center', animation: 'ecFadeIn 0.3s ease' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>
            {positiveOutcome ? '✅' : '⚠️'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {positiveOutcome ? 'Fångat.' : 'Noterat.'}
          </div>
          <div style={{ fontSize: 15, color: C.secondary }}>
            {positiveOutcome
              ? 'Tack — vi förbättrar oss.'
              : 'Ops-lead informeras direkt.'}
          </div>
          {saving && (
            <div style={{ marginTop: 16, fontSize: 12, color: C.tertiary }}>Sparar...</div>
          )}
        </div>
      )}

      {/* Step indicator — bottom */}
      {phase === 'QUESTIONS' && (
        <div style={{
          position: 'absolute', bottom: 32,
          fontSize: 12, color: C.tertiary,
        }}>
          {qIndex + 1} / {questions.length}
        </div>
      )}

      <style>{`
        @keyframes ecFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
