// Temporary owner-requested Lite trial. Set FLAGSHIP_VIDEO_VARIANT=pro and
// restart the idle backend to restore the previous Genjutsu route.
const PRO = 'hf_mult_motion_control';
const LITE = 'hf_mult_motion_control_flash';
function current() { return process.env.FLAGSHIP_VIDEO_VARIANT === 'pro' ? PRO : LITE; }
function isMotionModel(id) { return [PRO,LITE].includes(id); }
module.exports = {PRO,LITE,current,isMotionModel};
