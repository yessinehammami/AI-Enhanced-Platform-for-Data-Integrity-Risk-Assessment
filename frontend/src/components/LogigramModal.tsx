import { useState } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import '../styles/logigram.css';

interface LogigramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (category: number) => void;
}

/**
 * Interactive logigram to determine system category (1-6) through yes/no questions.
 * 
 * Decision tree:
 * Q1: Electronic system? NO→Cat1 | YES→Q2
 * Q2: Records BPx permanently? NO→Q3 | YES→Q5
 * Q3: Manually observed & transcribed? YES→Cat2 | NO→Q4
 * Q4: Printed on paper? YES→Cat3 | NO→Cat4
 * Q5: Can data be modified/deleted? YES→Cat6 | NO→Cat5
 */
export default function LogigramModal({ isOpen, onClose, onComplete }: LogigramModalProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<'q1' | 'q2' | 'q3' | 'q4' | 'q5' | null>('q1');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAnswer = (answer: boolean) => {
    const newAnswers = { ...answers, ...getAnswerKey(currentStep) };
    newAnswers[currentStep!] = answer;
    setAnswers(newAnswers);

    // Navigate to next question or result
    const nextStep = getNextStep(currentStep!, answer);
    if (typeof nextStep === 'number') {
      setResult(nextStep);
    } else {
      setCurrentStep(nextStep as 'q1' | 'q2' | 'q3' | 'q4' | 'q5');
    }
  };

  const handleConfirm = () => {
    if (result) {
      onComplete(result);
      reset();
      onClose();
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep('q1');
    setAnswers({});
    setResult(null);
  };

  const reset = () => {
    setCurrentStep('q1');
    setAnswers({});
    setResult(null);
  };

  const getAnswerKey = (step: string | null) => {
    return step ? { [step]: true } : {};
  };

  const getNextStep = (step: string, answer: boolean): string | number => {
    switch (step) {
      case 'q1':
        // Q1: Is system electronic?
        return answer ? 'q2' : 1; // NO → Category 1

      case 'q2':
        // Q2: Records BPx data permanently?
        return answer ? 'q5' : 'q3'; // NO → Q3, YES → Q5

      case 'q3':
        // Q3: Manually observed then transcribed?
        return answer ? 2 : 'q4'; // YES → Category 2, NO → Q4

      case 'q4':
        // Q4: Printed on paper support?
        return answer ? 3 : 4; // YES → Category 3, NO → Category 4

      case 'q5':
        // Q5: Can data be modified/deleted?
        return answer ? 6 : 5; // YES → Category 6, NO → Category 5

      default:
        return 1;
    }
  };

  const questions: Record<string, { text: string; yesLabel: string; noLabel: string }> = {
    q1: {
      text: t('logigram.q1'),
      yesLabel: t('yes'),
      noLabel: t('no'),
    },
    q2: {
      text: t('logigram.q2'),
      yesLabel: t('yes'),
      noLabel: t('no'),
    },
    q3: {
      text: t('logigram.q3'),
      yesLabel: t('yes'),
      noLabel: t('no'),
    },
    q4: {
      text: t('logigram.q4'),
      yesLabel: t('yes'),
      noLabel: t('no'),
    },
    q5: {
      text: t('logigram.q5'),
      yesLabel: t('yes'),
      noLabel: t('no'),
    },
  };

  return (
    <div className="logigram-overlay" onClick={handleCancel}>
      <div className="logigram-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logigram-header">
          <h2>{t('logigram.title')}</h2>
          <button className="logigram-close" onClick={handleCancel}>×</button>
        </div>

        <div className="logigram-body">
          {currentStep && result === null && questions[currentStep] && (
            <div className="logigram-question">
              <div className="logigram-progress">
                {t('logigram.step')} {Object.keys(questions).indexOf(currentStep) + 1} / 5
              </div>
              <h3>{questions[currentStep].text}</h3>
              <div className="logigram-buttons">
                <button
                  className="logigram-btn logigram-btn-yes"
                  onClick={() => handleAnswer(true)}
                >
                  ✓ {questions[currentStep].yesLabel}
                </button>
                <button
                  className="logigram-btn logigram-btn-no"
                  onClick={() => handleAnswer(false)}
                >
                  ✕ {questions[currentStep].noLabel}
                </button>
              </div>
              <button className="logigram-reset-btn" onClick={handleReset}>
                {t('logigram.reset')}
              </button>
            </div>
          )}

          {result !== null && (
            <div className="logigram-result">
              <div className="logigram-result-text">
                <p>{t('logigram.result_text')}</p>
                <div className="logigram-category-badge">
                  {t('category')}: <span>{result}</span>
                </div>
              </div>
              <p className="logigram-result-description">
                {t(`logigram.category_${result}_description`)}
              </p>
              <div className="logigram-result-buttons">
                <button className="logigram-btn-confirm" onClick={handleConfirm}>
                  {t('logigram.confirm')}
                </button>
                <button className="logigram-btn-cancel" onClick={() => handleReset()}>
                  {t('logigram.retry')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
