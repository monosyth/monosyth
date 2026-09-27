import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import os from 'node:os';

async function main() {
const source = process.argv.find(a => a.startsWith('--source='))?.slice(9);
const upload = process.argv.includes('--upload');
if (!source) throw new Error('Pass --source=/path/to/photos and optionally --upload');
const output = '/private/tmp/monosyth-wedding-assets';
await mkdir(output, { recursive: true });
const bucketName = 'monosyth.firebasestorage.app';
const credentials = upload ? JSON.parse(await readFile(path.join(os.homedir(), '.config/gcloud/application_default_credentials.json'), 'utf8')) : null;
if (credentials) credentials.quota_project_id = 'monosyth';
const bucket = upload ? new Storage({ projectId: 'monosyth', credentials }).bucket(bucketName) : null;
const files = (await readdir(source)).filter(f => /-\d+\.jpg$/i.test(f)).sort((a,b) => Number(a.match(/-(\d+)\.jpg$/i)[1]) - Number(b.match(/-(\d+)\.jpg$/i)[1]));
const checkpointPath = path.join(output, 'checkpoint.json');
let checkpoint = {};
try { checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8')); } catch {}
// The checked-in manifest is also a checkpoint, preserving existing guest links.
try {
 const published = JSON.parse(await readFile('src/lib/wedding/photos.json', 'utf8'));
 for (const photo of published) checkpoint[photo.id] = photo;
} catch {}
const result = [];
let completed = 0;
async function processPhoto(file) {
 const id = Number(file.match(/-(\d+)\.jpg$/i)[1]);
 if (upload && checkpoint[id]) { result.push(checkpoint[id]); return; }
 const input = path.join(source,file);
 const meta = await sharp(input).rotate().metadata();
 const swapped = [5,6,7,8].includes(meta.orientation);
 const photo = { id, width: swapped ? meta.height : meta.width, height: swapped ? meta.width : meta.height, chapter: id <= 64 ? 'chapel' : id <= 98 || (id >= 223 && id <= 228) ? 'party-bus' : id <= 150 || id >= 229 ? 'downtown' : 'after-party' };
 for (const [kind,size] of [['thumb',720],['view',2200],['original',0]]) {
  const ext = size ? 'webp' : 'jpg';
  const destination = path.join(output,`${id}-${kind}.${ext}`);
  if(size) await sharp(input).rotate().resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:kind==='thumb'?78:86}).toFile(destination);
  const remote = `wedding/dallas-and-scott/v1/${id}-${kind}.${ext}`;
  if (bucket) {
   const token = randomUUID();
   await bucket.upload(size ? destination : input,{ destination:remote, resumable:false, metadata:{ contentType:size?'image/webp':'image/jpeg', cacheControl:'public, max-age=31536000, immutable', contentDisposition: size ? 'inline' : `attachment; filename="Dallas-and-Scott-${String(id).padStart(3,'0')}.jpg"`, metadata:{firebaseStorageDownloadTokens:token} } });
   photo[kind] = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(remote)}?alt=media&token=${token}`;
  }
 }
 result.push(photo);
 if (upload) checkpoint[id] = photo;
 completed++;
 if (completed % 25 === 0) console.log(`Prepared ${completed}/${files.length} photos`);
}
// Bounded batches keep image memory and upload connections predictable.
for(let i=0;i<files.length;i+=5) {
 await Promise.all(files.slice(i,i+5).map(processPhoto));
 if (upload) await writeFile(checkpointPath, JSON.stringify(checkpoint));
}
result.sort((a,b)=>a.id-b.id);
if (upload) await writeFile('src/lib/wedding/photos.json',JSON.stringify(result,null,2)+'\n');
console.log(`Finished ${result.length} photos`);

}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
