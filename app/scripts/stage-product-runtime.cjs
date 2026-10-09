/* FusionIsland GPL-3.0. @file stage-product-runtime.cjs @description Physical version-matched runtime dependencies. @author 鸡哥 */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const app=path.resolve(__dirname,'..'),base=path.dirname(app),stage=path.join(base,'packaging-runtime-1.3.0-fixed'),old=path.join(base,'packaging-runtime');
fs.mkdirSync(stage,{recursive:true});
if(!fs.existsSync(path.join(stage,'runtime-provenance.json'))){
 fs.cpSync(path.join(old,'node_modules'),path.join(stage,'node_modules'),{recursive:true,dereference:true});
 fs.copyFileSync(path.join(old,'runtime-provenance.json'),path.join(stage,'runtime-provenance.json'));
}
const roots=['react-dropzone','react-pdf','cmdk','xstate','selfsigned','uiohook-napi','koffi','mathjs','pdf-lib','diff','papaparse','fflate'],seen=new Set(),sources=new Set();
function locate(name,from){const load=createRequire(path.join(from,'package.json'));let entry;try{entry=load.resolve(name+'/package.json');}catch{entry=load.resolve(name);}let folder=path.dirname(entry);while(!fs.existsSync(path.join(folder,'package.json'))){const parent=path.dirname(folder);if(parent===folder)throw Error('Package root missing: '+name);folder=parent;}return folder;}
function copy(name,from){
 const source=locate(name,from),pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json'))),key=name+'@'+pkg.version;
 if(sources.has(source))return;sources.add(source);
 const relative=path.relative(path.join(app,'node_modules'),source);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Dependency outside node_modules: '+name);
 const dest=path.join(stage,'node_modules',relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(source,dest,{recursive:true,dereference:true});
 seen.add(key);
 for(const dependency of Object.keys(pkg.dependencies||{}))copy(dependency,source);
 for(const dependency of Object.keys(pkg.optionalDependencies||{})){try{copy(dependency,source);}catch(error){console.log('Optional dependency unavailable: '+dependency+': '+error.message);}}
}
for(const name of roots)copy(name,app);
fs.copyFileSync(path.join(app,'package.json'),path.join(stage,'package.json'));
fs.writeFileSync(path.join(stage,'product-runtime.json'),JSON.stringify({version:'1.3.0',packages:[...seen].sort()},null,2));
console.log(JSON.stringify({stage,packages:seen.size}));
