// Isolated real-service acceptance only. Never loads frontend/.env.
import fs from 'node:fs';
import {createServer} from 'vite';
if(process.env.AG_ACCEPTANCE!=='disposable'||process.env.VITE_SUPABASE_URL!=='https://localhost:5190')throw Error('Isolated configuration required');
const server=await createServer({envDir:false,server:{host:'127.0.0.1',port:5190,strictPort:true,https:{key:fs.readFileSync(process.env.QA_TLS_KEY),cert:fs.readFileSync(process.env.QA_TLS_CERT)},proxy:{
 '/auth/v1':{target:'http://127.0.0.1:55902',rewrite:p=>p.replace(/^\/auth\/v1/,'')},
 '/storage/v1':{target:'http://127.0.0.1:55903',rewrite:p=>p.replace(/^\/storage\/v1/,'')},
 '/api':{target:'http://127.0.0.1:55904'},
}}});await server.listen();
