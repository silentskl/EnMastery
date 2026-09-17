"use client";
import { LEARNING_STAGES, STAGE_LABELS, type LearningStage } from "@/lib/language/stages";
export function StageSelector({value,onChange,compact=false}:{value:LearningStage;onChange:(stage:LearningStage)=>void;compact?:boolean}){
  return <div className={compact?"stageSelector compact":"stageSelector"} role="group" aria-label="Learning stage">{LEARNING_STAGES.map(stage=><button type="button" key={stage} onClick={()=>onChange(stage)} className={stage===value?"active":""} title={STAGE_LABELS[stage]}>{stage==="P1-P4"?"P1–P4":stage}</button>)}</div>;
}
