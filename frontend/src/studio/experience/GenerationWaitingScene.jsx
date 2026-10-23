import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Film, Image as ImageIcon, Pause, Play, Sparkles } from 'lucide-react';
import './generationWaitingScene.css';

export function waitingSceneCopy(kind, state) {
  if (state?.status === 'queued') return { title: 'Your creation is queued', detail: 'Your request is saved. Waiting for processing to begin.' };
  if (state?.stage === 'submitted') return {
    title: kind === 'video' ? 'Your bridal film is on its way' : 'Your bridal look is taking shape',
    detail: 'Request accepted. Waiting for the finished result—you can keep exploring.',
  };
  return { title: 'Preparing your creation', detail: 'Your reference photos and creation settings are being prepared.' };
}

export default function GenerationWaitingScene({ kind, state, referencePreviews = [] }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const copy = waitingSceneCopy(kind, state);
  const refs = referencePreviews.filter(item => item?.src).slice(0, 2);
  const Icon = kind === 'video' ? Film : ImageIcon;
  return <section className="generation-scene" data-paused={paused || Boolean(reduced)} aria-label={kind === 'video' ? 'Video creation waiting view' : 'Image creation waiting view'}>
    <div className="generation-scene__light" aria-hidden="true"/>
    <div className="generation-scene__top"><span>LADIES PLANET · CREATION IN PROGRESS</span><button type="button" disabled={Boolean(reduced)} onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume waiting animation' : 'Pause waiting animation'}>{paused ? <Play size={13}/> : <Pause size={13}/>} {reduced ? 'Reduced motion' : paused ? 'Resume animation' : 'Pause animation'}</button></div>
    <div className="generation-scene__visual" aria-hidden="true">
      {[0,1].map(index => <div className={'generation-scene__frame generation-scene__frame--' + index} key={index}>
        {refs[index] ? <img src={refs[index].src} alt=""/> : <div className="generation-scene__abstract"><Sparkles size={30}/><span>{index ? 'The details' : 'Your vision'}</span></div>}
        <span>{refs[index]?.label || (index ? 'A story to remember' : 'A look made for you')}</span>
      </div>)}
      <div className="generation-scene__core"><i/><i/><div><Icon size={34} strokeWidth={1.3}/><span>{kind === 'video' ? 'FILM' : 'IMAGE'}</span></div></div>
      <div className="generation-scene__sparkles">{[0,1,2,3,4,5].map(index => <i key={index} style={{'--spark':index}}/>)}</div>
    </div>
    <div className="generation-scene__copy"><h3>{copy.title}</h3><p>{copy.detail}</p><small>Animated waiting display · not a preview of the unfinished result</small></div>
  </section>;
}
