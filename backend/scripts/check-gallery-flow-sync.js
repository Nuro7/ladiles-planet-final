// One authorised upload-only verification through the platform's Gallery API.
const fs=require('node:fs/promises'),path=require('node:path');
async function main(){
  const form=new FormData();
  form.set('name','Demo burgundy lehenga');form.set('category','Lehenga');
  form.set('views',JSON.stringify(['front','detail','side']));
  form.set('description','Supplied garment references — automatic Flow sync check.');
  for(const i of [6,0,4])form.append('images',new Blob([await fs.readFile(path.join(__dirname,'../data/dress-demo-inputs/dress-view-'+i+'.jpg'))],{type:'image/jpeg'}),'dress-view-'+i+'.jpg');
  const response=await fetch('http://127.0.0.1:5050/api/dresses/upload',{method:'POST',body:form});
  const body=await response.json();if(!response.ok)throw Error(body.error || body.message || 'Gallery upload failed');
  const dress=body.data || body.dress;
  console.log(JSON.stringify({dressId:dress.id,sync:dress.flowSync}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
