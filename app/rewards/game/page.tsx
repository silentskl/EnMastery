import {RewardGameWorkspace} from "@/components/reward-game-workspace";

export default async function RewardGamePage({searchParams}:{searchParams:Promise<{rewardId?:string;returnTo?:string}>}){
  const p=await searchParams;
  return <RewardGameWorkspace rewardId={typeof p.rewardId==="string"?p.rewardId:""} returnTo={typeof p.returnTo==="string"?p.returnTo:"/learn"}/>;
}
