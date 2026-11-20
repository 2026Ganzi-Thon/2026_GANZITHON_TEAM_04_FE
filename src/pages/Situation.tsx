import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, withUser, type SituationType, type Weight } from '../api';
import { redirectFor, Screen, useApiError } from '../components/flow';
import { GrowthMallangi } from '../components/GrowthMallangi';
import { ChoiceGroup, PrimaryButton, Toast, useToast, WeightScale } from '../components/ui';
import { copy } from '../content/copy';
import { useSession } from '../store/session';

const OPTIONS = (Object.keys(copy.situation.options) as SituationType[]).map((v) => ({ value: v, label: copy.situation.options[v] }));

export default function Situation() {
  const s = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const onError = useApiError();
  const [situation, setSituation] = useState<SituationType | undefined>(s.situationType);
  const [weight, setWeight] = useState<Weight | undefined>(s.initialWeight);
  const [busy, setBusy] = useState(false);

  const redirect = redirectFor(s, 'situation');
  if (redirect) return <Navigate to={redirect} replace />;

  async function next() {
    if (!situation || !weight || !s.sessionId) return;
    setBusy(true);
    try {
      await withUser(() => api.putConcern(s.sessionId!, { situationType: situation, initialWeight: weight }));
      s.patch({ situationType: situation, initialWeight: weight });
      navigate('/s/concern');
    } catch (e) {
      onError(e, toast.show);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen step={1} back="/" footer={<PrimaryButton onClick={next} disabled={!situation || !weight} busy={busy}>{copy.situation.cta}</PrimaryButton>}>
      <div className="center" style={{ marginTop: 20 }}>
        <GrowthMallangi width={129} />
      </div>
      <p className="q" style={{ margin: '18px 0 36px' }}>{copy.situation.question}</p>
      <ChoiceGroup label="상황" className="grid2" itemClassName="choice tall" options={OPTIONS} value={situation} onChange={setSituation} />
      <p className="q" style={{ marginTop: 48, fontSize: 15 }}>{copy.situation.weightLabel}</p>
      <WeightScale value={weight} onChange={setWeight} />
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
