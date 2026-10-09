/** @file fusionTools.test.ts @description User-file media authorization and finite tool channels. @author 鸡哥 */
import { beforeEach,describe,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(async(_channel:string,..._args:unknown[])=>true),path:vi.fn<(file:File)=>string>(),on:vi.fn(),remove:vi.fn()}));
vi.mock('electron',()=>({ipcRenderer:{invoke:mocks.invoke,on:mocks.on,removeListener:mocks.remove},webUtils:{getPathForFile:mocks.path}}));
import { fusionToolsApi } from './fusionTools';
describe('limited offline tool bridge',()=>{
 beforeEach(()=>{mocks.invoke.mockClear();mocks.path.mockImplementation(file=>{if(!(file instanceof File))throw Error('file-not-authorized');return '';});});
 it('uses the native dialog when no file was supplied',async()=>{await fusionToolsApi.fusionVideoFile();expect(mocks.invoke).toHaveBeenCalledWith('fusion:web:file');});
 it('rejects a renderer-created file without a native selected path',async()=>{await expect(fusionToolsApi.fusionVideoFile(new File(['bytes'],'fake.mp4'))).rejects.toThrow('file-not-authorized');expect(mocks.invoke).not.toHaveBeenCalled();});
 it('rejects arbitrary string paths before reaching the main process',()=>{expect(()=>Reflect.apply(fusionToolsApi.fusionVideoFile,undefined,['C:/private.mp4'])).toThrow('file-not-authorized');expect(mocks.invoke).not.toHaveBeenCalled();});
 it('forwards the path verified by Electron for a selected File',async()=>{const file=new File(['bytes'],'selected.mp4');mocks.path.mockImplementation(selected=>selected===file?'C:/selected.mp4':'');await fusionToolsApi.fusionVideoFile(file);expect(mocks.invoke).toHaveBeenCalledWith('fusion:web:file','C:/selected.mp4');});
 it('removes the exact registered job subscription',()=>{const off=fusionToolsApi.onFusionFileJob(()=>{});expect(mocks.on).toHaveBeenCalledWith('fusion:files:job',expect.any(Function));off();expect(mocks.remove).toHaveBeenCalledWith('fusion:files:job',mocks.on.mock.calls.at(-1)?.[1]);});
});
