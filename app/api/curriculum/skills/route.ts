import graph from "@/data/skill-graph.json";
export async function GET(){const skills=graph.domains.flatMap((domain)=>domain.skills.map((skill)=>({id:skill.id,name:skill.name,domain:domain.name,school_level:skill.level,paper:domain.paper,difficulty:skill.difficulty})));return Response.json({...graph,skills},{headers:{"Cache-Control":"public, max-age=300"}})}
