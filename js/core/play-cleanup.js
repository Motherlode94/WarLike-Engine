// Cleanup failures must never prevent cancellation of native/worker frames or
// restoration of authored state. Return all failures after attempting each step.
export function cleanupPlay(steps){
 const errors=[];
 for(const step of steps)try{step()}catch(error){errors.push(error)}
 return errors;
}
