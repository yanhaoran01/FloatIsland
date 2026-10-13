/* FloatIsland contributors. GPL-3.0. Only transition textures are deformed. */
export type GenieEdge='top'|'left'|'right';
export function geniePoint(x:number,y:number,p:number,edge:GenieEdge,width:number,height:number,compact:{x:number;y:number;width:number;height:number}):[number,number]{
 p=Math.max(0,Math.min(1,p));const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 const distance=edge==='top'?y:edge==='left'?x:1-x,squeeze=smooth(p/.65)*(1-distance*.7)+smooth((p-.65)/.35)*distance*.7,travel=smooth(p);
 if(edge==='top')return [width/2+(compact.x+compact.width/2-width/2)*travel+(x-.5)*(width*(1-squeeze)+compact.width*squeeze),y*height*(1-travel)+(compact.y+y*compact.height)*travel];
 return [x*width*(1-travel)+(compact.x+x*compact.width)*travel,height/2+(compact.y+compact.height/2-height/2)*travel+(y-.5)*(height*(1-squeeze)+compact.height*squeeze)];
}
export function createGenieMesh(canvas:HTMLCanvasElement,image:HTMLCanvasElement,edge:GenieEdge,compact:{x:number;y:number;width:number;height:number}):(progress:number)=>void {
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true});if(!gl)throw Error('gpu-unavailable');
 const shader=(kind:number,source:string)=>{const s=gl.createShader(kind);if(!s)throw Error('gpu-unavailable');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader-failed');return s;};
 const program=gl.createProgram();if(!program)throw Error('gpu-unavailable');gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 pos;attribute vec2 uv;varying vec2 tex;void main(){tex=uv;gl_Position=vec4(pos,0.,1.);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,tex);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('shader-failed');gl.useProgram(program);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());const position=gl.getAttribLocation(program,'pos'),uv=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
 return p=>{const data:number[]=[],n=32;for(let row=0;row<n;row++)for(let col=0;col<n;col++)for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,0],[1,1],[0,1]]){const x=(col+dx)/n,y=(row+dy)/n,[px,py]=geniePoint(x,y,p,edge,image.width,image.height,compact);data.push(px/image.width*2-1,1-py/image.height*2,x,y);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/4);};
}
