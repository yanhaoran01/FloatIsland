/* FusionIsland GPL-3.0. @file productIntegration.test.ts @description Flow compatibility, LAN and Windows name boundaries. @author 鸡哥 */
import {describe,it,expect} from 'vitest';
import {validateProductFlow,PRODUCT_PRESETS} from './productActions';
import {isLocalAddress,safeReceiveName} from './localSendRules';
import {pinZoom,pinOpacity,scrollInset} from './esearchCore';
describe('offline product boundary rules',()=>{
 it('accepts every shipped preset and rejects incompatible adjacent steps',()=>{
  PRODUCT_PRESETS.forEach(flow=>expect(()=>validateProductFlow(flow)).not.toThrow());
  expect(()=>validateProductFlow({id:'bad',name:'bad',steps:[{id:'a',action:'ocr',options:{}},{id:'b',action:'image-convert',options:{}}]})).toThrow('flow-type-mismatch');
 });
 it('rejects arbitrary scripts and duplicate step identifiers',()=>{
  const flow=structuredClone(PRODUCT_PRESETS[0]);flow.steps[1].id=flow.steps[0].id;expect(()=>validateProductFlow(flow)).toThrow('invalid-flow');
  expect(()=>validateProductFlow(JSON.parse('{"id":"x","name":"x","steps":[{"id":"x","action":"shell","options":{}}]}'))).toThrow('invalid-flow');
 });
 it.each(['127.0.0.1','10.0.0.2','172.16.0.1','172.31.255.1','192.168.1.4','169.254.1.3','::ffff:192.168.1.5','::1','fd01::1','fe80::2'])('allows LAN literal %s',address=>expect(isLocalAddress(address)).toBe(true));
 it.each(['8.8.8.8','example.com','172.32.0.1','256.0.0.1','0.0.0.0','192.169.0.1','https://192.168.1.1','2001:4860::8888'])('rejects public or malformed address %s',address=>expect(isLocalAddress(address)).toBe(false));
 it.each(['../escape.txt','C:\\escape.txt','a/b.txt','NUL','COM1.txt','name.','name ','a\0.txt'])('rejects unsafe receive name %s',name=>expect(()=>safeReceiveName(name)).toThrow());
 it('preserves Chinese names and bounds eSearch geometry',()=>{
  expect(safeReceiveName('照片 01.png')).toBe('照片 01.png');expect(pinZoom(-2)).toBe(.05);expect(pinOpacity(200)).toBe(1);expect(scrollInset(300)).toBe(100);
 });
});
